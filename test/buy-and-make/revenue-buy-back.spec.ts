import { ethers } from "hardhat"
import { expect } from "chai"

import { simpleToExactAmount } from "@utils/math"
import { ZassetMachine, StandardAccounts } from "@utils/machines"

import {
    MockERC20,
    MockNexus__factory,
    MockNexus,
    RevenueBuyBack__factory,
    RevenueBuyBack,
    MockUniswapV3,
    MockUniswapV3__factory,
    EmissionsController,
    MockStakingContract,
    MockStakingContract__factory,
    MockZasset__factory,
    MockZasset,
    EmissionsController__factory,
} from "types/generated"
import { EncodedPaths, encodeUniswapPath } from "@utils/peripheral/uniswap"
import { DEAD_ADDRESS, ZERO_ADDRESS } from "@utils/constants"
import { MCCP24_CONFIG } from "tasks/utils/emissions-utils"

describe("RevenueBuyBack", () => {
    let sa: StandardAccounts
    let zAssetMachine: ZassetMachine
    let nexus: MockNexus
    let revenueBuyBack: RevenueBuyBack
    let zUSD: MockZasset
    let zBTC: MockZasset
    let bAsset1: MockERC20
    let bAsset2: MockERC20
    let rewardsToken: MockERC20
    let staking1: MockStakingContract
    let staking2: MockStakingContract
    let emissionController: EmissionsController
    let uniswap: MockUniswapV3
    let uniswapZusdBasset1Paths: EncodedPaths
    let uniswapZbtcBasset2Paths: EncodedPaths

    /*
        Test Data
        zAssets: zUSD and zBTC with 18 decimals
     */
    const setupRevenueBuyBack = async (): Promise<void> => {
        zUSD = await new MockZasset__factory(sa.default.signer).deploy(
            "meta USD",
            "zUSD",
            18,
            sa.default.address,
            simpleToExactAmount(1000000),
        )
        bAsset1 = await zAssetMachine.loadBassetProxy("USD bAsset", "bUSD", 18)

        zBTC = await new MockZasset__factory(sa.default.signer).deploy("meta BTC", "zBTC", 18, sa.default.address, simpleToExactAmount(100))
        bAsset2 = await zAssetMachine.loadBassetProxy("USD bAsset", "bUSD", 6)

        rewardsToken = await zAssetMachine.loadBassetProxy("Rewards Token", "RWD", 18)

        // staking contracts
        staking1 = await new MockStakingContract__factory(sa.default.signer).deploy()
        staking2 = await new MockStakingContract__factory(sa.default.signer).deploy()
        await staking1.setTotalSupply(simpleToExactAmount(3000000))
        await staking2.setTotalSupply(simpleToExactAmount(1000000))

        // Deploy mock Nexus
        nexus = await new MockNexus__factory(sa.default.signer).deploy(
            sa.governor.address,
            sa.mockSavingsManager.address,
            sa.mockInterestValidator.address,
        )
        await nexus.setKeeper(sa.keeper.address)

        // Mocked Uniswap V3
        uniswap = await new MockUniswapV3__factory(sa.default.signer).deploy()
        // Add rewards to Uniswap
        await rewardsToken.transfer(uniswap.address, simpleToExactAmount(500000))
        // Add bAsset to rewards exchange rates
        await uniswap.setRate(bAsset1.address, rewardsToken.address, simpleToExactAmount(80, 16)) // 0.8 ZENO/USD
        await uniswap.setRate(bAsset2.address, rewardsToken.address, simpleToExactAmount(50, 33)) // 50,000 ZENO/BTC
        // Uniswap paths
        uniswapZusdBasset1Paths = encodeUniswapPath([bAsset1.address, DEAD_ADDRESS, rewardsToken.address], [3000, 3000])
        uniswapZbtcBasset2Paths = encodeUniswapPath([bAsset2.address, DEAD_ADDRESS, rewardsToken.address], [3000, 3000])

        // Deploy Emissions Controller
        emissionController = await new EmissionsController__factory(sa.default.signer).deploy(
            nexus.address,
            rewardsToken.address,
            MCCP24_CONFIG,
        )
        await emissionController.initialize(
            [staking1.address, staking2.address],
            [10, 10],
            [true, true],
            [staking1.address, staking2.address],
        )
        await rewardsToken.transfer(emissionController.address, simpleToExactAmount(10000))

        // Deploy and initialize test RevenueBuyBack
        revenueBuyBack = await new RevenueBuyBack__factory(sa.default.signer).deploy(
            nexus.address,
            rewardsToken.address,
            uniswap.address,
            emissionController.address,
        )
        // reverse the order to make sure dial id != staking contract id for testing purposes
        await revenueBuyBack.initialize([1, 0])

        // Add config to buy rewards from zAssets
        await revenueBuyBack
            .connect(sa.governor.signer)
            .setZassetConfig(
                zUSD.address,
                bAsset1.address,
                simpleToExactAmount(98, 16),
                simpleToExactAmount(79, 16),
                uniswapZusdBasset1Paths.encoded,
            )
        await revenueBuyBack.connect(sa.governor.signer).setZassetConfig(
            zBTC.address,
            bAsset2.address,
            simpleToExactAmount(98, 4),
            // 49,000 BTC/USD * 1e12 as bAsset has 6 decimals and rewards has 18 decimals
            simpleToExactAmount(49, 33),
            uniswapZbtcBasset2Paths.encoded,
        )
    }

    before(async () => {
        const accounts = await ethers.getSigners()
        zAssetMachine = await new ZassetMachine().initAccounts(accounts)
        sa = zAssetMachine.sa

        await setupRevenueBuyBack()
    })

    describe("creating new instance", () => {
        before(async () => {
            await setupRevenueBuyBack()
        })
        it("should have immutable variables set", async () => {
            expect(await revenueBuyBack.nexus(), "Nexus").eq(nexus.address)
            expect(await revenueBuyBack.REWARDS_TOKEN(), "Rewards Token").eq(rewardsToken.address)
            expect(await revenueBuyBack.UNISWAP_ROUTER(), "Uniswap Router").eq(uniswap.address)
            expect(await revenueBuyBack.EMISSIONS_CONTROLLER(), "Emissions Controller").eq(emissionController.address)
        })
        it("should have storage variables set", async () => {
            expect(await revenueBuyBack.stakingDialIds(0), "Staking Contract 1 dial id").eq(1)
            expect(await revenueBuyBack.stakingDialIds(1), "Staking Contract 2 dial id").eq(0)
            expect((await emissionController.dials(0)).recipient, "first dial is first staking contract").to.eq(staking1.address)
            expect((await emissionController.dials(1)).recipient, "second dial is second staking contract").to.eq(staking2.address)
        })
        describe("it should fail if zero", () => {
            it("nexus", async () => {
                const tx = new RevenueBuyBack__factory(sa.default.signer).deploy(
                    ZERO_ADDRESS,
                    rewardsToken.address,
                    uniswap.address,
                    emissionController.address,
                )
                await expect(tx).to.revertedWith("Nexus address is zero")
            })
            it("rewards token", async () => {
                const tx = new RevenueBuyBack__factory(sa.default.signer).deploy(
                    nexus.address,
                    ZERO_ADDRESS,
                    uniswap.address,
                    emissionController.address,
                )
                await expect(tx).to.revertedWith("Rewards token is zero")
            })
            it("Uniswap router", async () => {
                const tx = new RevenueBuyBack__factory(sa.default.signer).deploy(
                    nexus.address,
                    rewardsToken.address,
                    ZERO_ADDRESS,
                    emissionController.address,
                )
                await expect(tx).to.revertedWith("Uniswap Router is zero")
            })
            it("Emissions controller", async () => {
                const tx = new RevenueBuyBack__factory(sa.default.signer).deploy(
                    nexus.address,
                    rewardsToken.address,
                    uniswap.address,
                    ZERO_ADDRESS,
                )
                await expect(tx).to.revertedWith("Emissions controller is zero")
            })
        })
    })
    describe("notification of revenue", () => {
        before(async () => {
            await setupRevenueBuyBack()
        })
        it("should simply transfer from the sender", async () => {
            const senderBalBefore = await zUSD.balanceOf(sa.default.address)
            const revenueBuyBackBalBefore = await zUSD.balanceOf(revenueBuyBack.address)
            const notificationAmount = simpleToExactAmount(100, 18)
            expect(senderBalBefore.gte(notificationAmount), "sender rewards bal before").to.eq(true)

            // approve
            await zUSD.approve(revenueBuyBack.address, notificationAmount)
            // call
            const tx = revenueBuyBack.notifyRedistributionAmount(zUSD.address, notificationAmount)
            await expect(tx).to.emit(revenueBuyBack, "RevenueReceived").withArgs(zUSD.address, notificationAmount)

            // check output balances: zAsset sender/recipient
            expect(await zUSD.balanceOf(sa.default.address), "zUSD sender bal after").eq(senderBalBefore.sub(notificationAmount))
            expect(await zUSD.balanceOf(revenueBuyBack.address), "zUSD RevenueBuyBack bal after").eq(
                revenueBuyBackBalBefore.add(notificationAmount),
            )
        })
        describe("it should fail if", () => {
            it("not configured zAsset", async () => {
                await expect(revenueBuyBack.notifyRedistributionAmount(sa.dummy1.address, simpleToExactAmount(1, 18))).to.be.revertedWith(
                    "Invalid zAsset",
                )
            })
            it("approval is not given from sender", async () => {
                await expect(revenueBuyBack.notifyRedistributionAmount(zUSD.address, simpleToExactAmount(100, 18))).to.be.revertedWith(
                    "ERC20: transfer amount exceeds allowance",
                )
            })
            it("sender has insufficient balance", async () => {
                await zUSD.transfer(sa.dummy1.address, simpleToExactAmount(1, 18))
                await zUSD.connect(sa.dummy1.signer).approve(revenueBuyBack.address, simpleToExactAmount(100))
                await expect(
                    revenueBuyBack.connect(sa.dummy1.signer).notifyRedistributionAmount(zUSD.address, simpleToExactAmount(2, 18)),
                ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
            })
        })
    })
    describe("buy back ZENO rewards", () => {
        const zusdRevenue = simpleToExactAmount(20000)
        const zbtcRevenue = simpleToExactAmount(2)
        beforeEach(async () => {
            await setupRevenueBuyBack()

            // Put some bAssets to the zAssets
            await bAsset1.transfer(zUSD.address, zusdRevenue)
            await bAsset2.transfer(zBTC.address, zbtcRevenue.div(1e12))

            // Distribute revenue to RevenueBuyBack
            await zUSD.approve(revenueBuyBack.address, zusdRevenue)
            await zBTC.approve(revenueBuyBack.address, zbtcRevenue)
            await revenueBuyBack.notifyRedistributionAmount(zUSD.address, zusdRevenue)
            await revenueBuyBack.notifyRedistributionAmount(zBTC.address, zbtcRevenue)
        })
        it("should sell zUSD for ZENO", async () => {
            expect(await zUSD.balanceOf(revenueBuyBack.address), "revenueBuyBack's zUSD Bal before").to.eq(zusdRevenue)
            expect(await bAsset1.balanceOf(zUSD.address), "zAsset's bAsset Bal before").to.eq(zusdRevenue)

            const tx = revenueBuyBack.connect(sa.keeper.signer).buyBackRewards([zUSD.address])

            const bAsset1Amount = zusdRevenue.mul(98).div(100)
            // Exchange rate = 0.80 ZENO/USD = 8 / 18
            // Swap fee is 0.3% = 997 / 1000
            const rewardsAmount = bAsset1Amount.mul(8).div(10).mul(997).div(1000)
            await expect(tx).to.emit(revenueBuyBack, "BuyBackRewards").withArgs(zUSD.address, zusdRevenue, bAsset1Amount, rewardsAmount)

            expect(await zUSD.balanceOf(revenueBuyBack.address), "revenueBuyBack's zUSD Bal after").to.eq(0)
        })
        it("should sell zBTC for ZENO", async () => {
            expect(await zBTC.balanceOf(revenueBuyBack.address), "revenueBuyBack's zBTC Bal before").to.eq(zbtcRevenue)
            expect(await bAsset2.balanceOf(zBTC.address), "zAsset's bAsset Bal before").to.eq(zbtcRevenue.div(1e12))

            const tx = revenueBuyBack.connect(sa.keeper.signer).buyBackRewards([zBTC.address])

            const bAsset2Amount = zbtcRevenue.mul(98).div(100).div(1e12)
            // Exchange rate = 50,000 ZENO/BTC
            // Swap fee is 0.3% = 997 / 1000
            const rewardsAmount = bAsset2Amount.mul(50000).mul(997).div(1000).mul(1e12)
            await expect(tx).to.emit(revenueBuyBack, "BuyBackRewards").withArgs(zBTC.address, zbtcRevenue, bAsset2Amount, rewardsAmount)

            expect(await zBTC.balanceOf(revenueBuyBack.address), "revenueBuyBack's zBTC Bal after").to.eq(0)
        })
        it("should sell zUSD and zBTC for ZENO", async () => {
            const tx = revenueBuyBack.connect(sa.keeper.signer).buyBackRewards([zUSD.address, zBTC.address])

            //
            const bAsset1Amount = zusdRevenue.mul(98).div(100)
            // Exchange rate = 0.80 ZENO/USD = 8 / 18
            // Swap fee is 0.3% = 997 / 1000
            const zusdRewardsAmount = bAsset1Amount.mul(8).div(10).mul(997).div(1000)
            await expect(tx).to.emit(revenueBuyBack, "BuyBackRewards").withArgs(zUSD.address, zusdRevenue, bAsset1Amount, zusdRewardsAmount)

            const bAsset2Amount = zbtcRevenue.mul(98).div(100).div(1e12)
            // Exchange rate = 50,000 ZENO/BTC
            // Swap fee is 0.3% = 997 / 1000
            const zbtcRewardsAmount = bAsset2Amount.mul(50000).mul(997).div(1000).mul(1e12)
            await expect(tx).to.emit(revenueBuyBack, "BuyBackRewards").withArgs(zBTC.address, zbtcRevenue, bAsset2Amount, zbtcRewardsAmount)

            expect(await zUSD.balanceOf(revenueBuyBack.address), "revenueBuyBack's zUSD Bal after").to.eq(0)
            expect(await zBTC.balanceOf(revenueBuyBack.address), "revenueBuyBack's zUSD Bal after").to.eq(0)
        })
        describe("should fail when", () => {
            it("No zAssets", async () => {
                const tx = revenueBuyBack.connect(sa.keeper.signer).buyBackRewards([])
                await expect(tx).to.revertedWith("Invalid args")
            })
            it("Not a zAsset", async () => {
                const tx = revenueBuyBack.connect(sa.keeper.signer).buyBackRewards([rewardsToken.address])
                await expect(tx).to.revertedWith("Invalid zAsset")
            })
            it("Not keeper or governor", async () => {
                const tx = revenueBuyBack.buyBackRewards([zUSD.address])
                await expect(tx).to.revertedWith("Only keeper or governor")
            })
        })
    })
    describe("donate rewards to Emissions Controller", () => {
        const totalRewards = simpleToExactAmount(40000)
        beforeEach(async () => {
            await setupRevenueBuyBack()
        })
        it("should donate rewards", async () => {
            // Put some reward tokens in the RevenueBuyBack contract for donation to the Emissions Controller
            await rewardsToken.transfer(revenueBuyBack.address, totalRewards)
            expect(await rewardsToken.balanceOf(revenueBuyBack.address), "revenue buy back rewards before").to.eq(totalRewards)
            const rewardsECbefore = await rewardsToken.balanceOf(emissionController.address)

            const tx = revenueBuyBack.connect(sa.keeper.signer).donateRewards()

            await expect(tx).to.emit(revenueBuyBack, "DonatedRewards").withArgs(totalRewards)
            await expect(tx).to.emit(emissionController, "DonatedRewards").withArgs(1, totalRewards.div(4))
            await expect(tx).to.emit(emissionController, "DonatedRewards").withArgs(0, totalRewards.mul(3).div(4))

            expect(await rewardsToken.balanceOf(revenueBuyBack.address), "revenue buy back rewards after").to.eq(0)
            expect(await rewardsToken.balanceOf(emissionController.address), "emission controller rewards after").to.eq(
                rewardsECbefore.add(totalRewards),
            )
        })
        describe("should fail when", () => {
            it("no voting power", async () => {
                await staking1.setTotalSupply(0)
                await staking2.setTotalSupply(0)

                const tx = revenueBuyBack.connect(sa.keeper.signer).donateRewards()
                await expect(tx).to.revertedWith("No voting power")
            })
            it("no rewards to donate", async () => {
                expect(await rewardsToken.balanceOf(revenueBuyBack.address), "revenue buy back rewards before").to.eq(0)

                const tx = revenueBuyBack.connect(sa.keeper.signer).donateRewards()
                await expect(tx).to.revertedWith("No rewards to donate")
            })
        })
    })
    describe("setZassetConfig", () => {
        let newZasset: MockZasset
        let newBasset: MockERC20
        let uniswapNewPaths: EncodedPaths
        const minZasset2BassetPrice = simpleToExactAmount(99, 16)
        const minBasset2RewardsPrice = simpleToExactAmount(110, 16)
        before(async () => {
            newZasset = await new MockZasset__factory(sa.default.signer).deploy(
                "EURO",
                "mEUR",
                18,
                sa.default.address,
                simpleToExactAmount(2000000),
            )
            newBasset = await zAssetMachine.loadBassetProxy("EUR bAsset", "bEUR", 18)
            uniswapNewPaths = encodeUniswapPath([newBasset.address, DEAD_ADDRESS, rewardsToken.address], [3000, 3000])
        })
        it("should set", async () => {
            const tx = await revenueBuyBack
                .connect(sa.governor.signer)
                .setZassetConfig(
                    newZasset.address,
                    newBasset.address,
                    minZasset2BassetPrice,
                    minBasset2RewardsPrice,
                    uniswapNewPaths.encoded,
                )

            await expect(tx)
                .to.emit(revenueBuyBack, "AddedZassetConfig")
                .withArgs(newZasset.address, newBasset.address, minZasset2BassetPrice, minBasset2RewardsPrice, uniswapNewPaths.encoded)

            const config = await revenueBuyBack.zassetConfig(newZasset.address)
            expect(config.bAsset, "bAsset").to.eq(newBasset.address)
            expect(config.minZasset2BassetPrice, "minZasset2BassetPrice").to.eq(minZasset2BassetPrice)
            expect(config.minBasset2RewardsPrice, "minBasset2RewardsPrice").to.eq(minBasset2RewardsPrice)
            expect(config.uniswapPath, "uniswapPath").to.eq(uniswapNewPaths.encoded)
        })
        context("should fail when", () => {
            before(async () => {
                await setupRevenueBuyBack()
            })
            it("not governor", async () => {
                const tx = revenueBuyBack.setZassetConfig(
                    newZasset.address,
                    newBasset.address,
                    minZasset2BassetPrice,
                    minBasset2RewardsPrice,
                    uniswapNewPaths.encoded,
                )

                await expect(tx).to.revertedWith("Only governor can execute")
            })
            it("zAsset is zero", async () => {
                const tx = revenueBuyBack
                    .connect(sa.governor.signer)
                    .setZassetConfig(
                        ZERO_ADDRESS,
                        newBasset.address,
                        minZasset2BassetPrice,
                        minBasset2RewardsPrice,
                        uniswapNewPaths.encoded,
                    )
                await expect(tx).to.revertedWith("zAsset token is zero")
            })
            it("bAsset is zero", async () => {
                const tx = revenueBuyBack
                    .connect(sa.governor.signer)
                    .setZassetConfig(
                        newZasset.address,
                        ZERO_ADDRESS,
                        minZasset2BassetPrice,
                        minBasset2RewardsPrice,
                        uniswapNewPaths.encoded,
                    )
                await expect(tx).to.revertedWith("bAsset token is zero")
            })
            it("minZasset2BassetPrice is zero", async () => {
                const tx = revenueBuyBack
                    .connect(sa.governor.signer)
                    .setZassetConfig(newZasset.address, newBasset.address, 0, minBasset2RewardsPrice, uniswapNewPaths.encoded)
                await expect(tx).to.revertedWith("Invalid min bAsset price")
            })
            it("minBasset2RewardsPrice is zero", async () => {
                const tx = revenueBuyBack
                    .connect(sa.governor.signer)
                    .setZassetConfig(newZasset.address, newBasset.address, minZasset2BassetPrice, 0, uniswapNewPaths.encoded)
                await expect(tx).to.revertedWith("Invalid min reward price")
            })
            context("uniswap path is", () => {
                it("zero", async () => {
                    const tx = revenueBuyBack
                        .connect(sa.governor.signer)
                        .setZassetConfig(newZasset.address, ZERO_ADDRESS, minZasset2BassetPrice, minBasset2RewardsPrice, "0x")
                    await expect(tx).to.revertedWith("bAsset token is zero")
                })
                it("from zAsset to rewards", async () => {
                    uniswapNewPaths = encodeUniswapPath([newZasset.address, DEAD_ADDRESS, rewardsToken.address], [3000, 3000])
                    const tx = revenueBuyBack
                        .connect(sa.governor.signer)
                        .setZassetConfig(
                            newZasset.address,
                            newBasset.address,
                            minZasset2BassetPrice,
                            minBasset2RewardsPrice,
                            uniswapNewPaths.encoded,
                        )
                    await expect(tx).to.revertedWith("Invalid uniswap path")
                })
                it("from bAsset to zAsset", async () => {
                    uniswapNewPaths = encodeUniswapPath([newBasset.address, DEAD_ADDRESS, newZasset.address], [3000, 3000])
                    const tx = revenueBuyBack
                        .connect(sa.governor.signer)
                        .setZassetConfig(
                            newZasset.address,
                            newBasset.address,
                            minZasset2BassetPrice,
                            minBasset2RewardsPrice,
                            uniswapNewPaths.encoded,
                        )
                    await expect(tx).to.revertedWith("Invalid uniswap path")
                })
                it("is too short", async () => {
                    uniswapNewPaths = encodeUniswapPath([newBasset.address, newZasset.address], [3000])
                    const tx = revenueBuyBack
                        .connect(sa.governor.signer)
                        .setZassetConfig(
                            newZasset.address,
                            newBasset.address,
                            minZasset2BassetPrice,
                            minBasset2RewardsPrice,
                            uniswapNewPaths.encoded.slice(0, 42),
                        )
                    await expect(tx).to.revertedWith("Uniswap path too short")
                })
            })
        })
    })
    describe("addStakingContract", () => {
        before(async () => {
            await setupRevenueBuyBack()
        })
        context("should fail when", () => {
            it("duplicate", async () => {
                const tx = revenueBuyBack.connect(sa.governor.signer).addStakingContract(0)

                await expect(tx).to.revertedWith("Staking dial id already exists")
            })
            it("invalid dial id", async () => {
                const tx = revenueBuyBack.connect(sa.governor.signer).addStakingContract(3)

                await expect(tx).to.revertedWith("reverted with panic code 0x32 (Array accessed at an out-of-bounds or negative index)")
            })
            it("not governor", async () => {
                const tx = revenueBuyBack.addStakingContract(4)

                await expect(tx).to.revertedWith("Only governor can execute")
            })
        })
        it("should add staking contract", async () => {
            const newStakingContract = await new MockStakingContract__factory(sa.default.signer).deploy()
            await emissionController.connect(sa.governor.signer).addDial(newStakingContract.address, 10, true)
            const newDialId = 2
            expect(await emissionController.getDialRecipient(newDialId), "new dial added").to.eq(newStakingContract.address)

            const tx = await revenueBuyBack.connect(sa.governor.signer).addStakingContract(newDialId)

            await expect(tx).to.emit(revenueBuyBack, "AddedStakingContract").withArgs(newDialId)
        })
    })
})
