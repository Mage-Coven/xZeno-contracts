import { impersonate } from "@utils/fork"
import { BN, simpleToExactAmount } from "@utils/math"
import { expect } from "chai"
import { Signer } from "ethers"
import { ethers, network } from "hardhat"
import { deployContract } from "tasks/utils/deploy-utils"
import { FeederPool, FeederPool__factory, IERC20, IERC20__factory } from "types/generated"
import { CompoundIntegration } from "types/generated/CompoundIntegration"
import { CompoundIntegration__factory } from "types/generated/factories/CompoundIntegration__factory"
import { ICERC20__factory } from "types/generated/factories/ICERC20__factory"
import { ICERC20 } from "types/generated/ICERC20"

const governorAddress = "0xF6FF1F7FCEB2cE6d26687EaaB5988b445d0b94a2"
const deployerAddress = "0xb81473f20818225302b8fffb905b53d58a793d84"
const ethWhaleAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
const zUsdWhaleAddress = "0xd2dbd9ba61ee40519226aee282fec8197a2459ae"

const nexusAddress = "0xafce80b19a8ce13dec0739a1aab7a028d6845eb3"
const zUsdAddress = "0xe2f2a5c287993345a840db3b0845fbc70f5935a5"
const cyzUsdAddress = "0xbe86e8918dfc7d3cb10d295fc220f941a1470c5c"
const gusdFpAddress = "0x4fB30C5A3aC8e85bC32785518633303C4590752d"
const busdFpAddress = "0xfE842e95f8911dcc21c943a1dAA4bd641a1381c6"
const creamTokenAddress = "0x2ba592f78db6436527729929aaf6c908497cb200"
const liquidatorAddress = "0xe595D67181D701A5356e010D9a58EB9A341f1DbD"

const gusdIronBankIntegrationAddress = "0xaF007D4ec9a13116035a2131EA1C9bc0B751E3cf"
const busdIronBankIntegrationAddress = "0x2A15794575e754244F9C0A15F504607c201f8AfD"

// Not sure why this is 2**96 - 1 and not 2**256 - 1 for CREAM
const safeInfinity = BN.from(2).pow(96).sub(1)

context("zUSD Feeder Pool integration to CREAM", () => {
    let governor: Signer
    let deployer: Signer
    let ethWhale: Signer
    let zUsdWhale: Signer
    let gudsFp: FeederPool
    let budsFp: FeederPool
    let zUsd: IERC20
    let cyzUsdToken: ICERC20
    let creamToken: IERC20
    let gusdIntegration: CompoundIntegration
    let busdIntegration: CompoundIntegration
    let zUsdInGusdFpBefore: BN
    let gUsdFpDataBefore

    before("reset block number", async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [
                {
                    forking: {
                        jsonRpcUrl: process.env.NODE_URL,
                        blockNumber: 12367735,
                    },
                },
            ],
        })
        deployer = await impersonate(deployerAddress)
        governor = await impersonate(governorAddress)
        ethWhale = await impersonate(ethWhaleAddress)
        zUsdWhale = await impersonate(zUsdWhaleAddress)

        // send some Ether to the impersonated multisig contract as it doesn't have Ether
        await ethWhale.sendTransaction({
            to: governorAddress,
            value: simpleToExactAmount(10),
        })

        gudsFp = FeederPool__factory.connect(gusdFpAddress, governor)
        budsFp = FeederPool__factory.connect(busdFpAddress, governor)

        zUsd = await IERC20__factory.connect(zUsdAddress, deployer)
        cyzUsdToken = await ICERC20__factory.connect(cyzUsdAddress, deployer)
        creamToken = await IERC20__factory.connect(creamTokenAddress, deployer)
    })
    it("Test connectivity", async () => {
        const currentBlock = await ethers.provider.getBlockNumber()
        console.log(`Current block ${currentBlock}`)
        const startEther = await deployer.getBalance()
        console.log(`Deployer ${deployerAddress} has ${startEther} Ether`)
    })
    it("deploy and initialize integration contracts", async () => {
        gusdIntegration = await deployContract<CompoundIntegration>(
            new CompoundIntegration__factory(deployer),
            "CREAM Integration for GUSD FP",
            [nexusAddress, gusdFpAddress, creamTokenAddress],
        )
        expect(gusdIntegration.address).to.length(42)
        await gusdIntegration.initialize([zUsdAddress], [cyzUsdAddress])
        busdIntegration = await deployContract<CompoundIntegration>(
            new CompoundIntegration__factory(deployer),
            "CREAM Integration for BUSD FP",
            [nexusAddress, busdFpAddress, creamTokenAddress],
        )
        busdIntegration = await new CompoundIntegration__factory(deployer).deploy(nexusAddress, busdFpAddress, creamTokenAddress)
        await busdIntegration.initialize([zUsdAddress], [cyzUsdAddress])
    })
    it("Governor approves Liquidator to spend the reward (CREAM) token", async () => {
        expect(await creamToken.allowance(gusdIntegration.address, liquidatorAddress)).to.eq(0)
        expect(await creamToken.allowance(busdIntegration.address, liquidatorAddress)).to.eq(0)

        // This will be done via the delayedProxyAdmin on mainnet
        await gusdIntegration.connect(governor).approveRewardToken()
        await busdIntegration.connect(governor).approveRewardToken()

        expect(await creamToken.allowance(gusdIntegration.address, liquidatorAddress)).to.eq(safeInfinity)
        expect(await creamToken.allowance(busdIntegration.address, liquidatorAddress)).to.eq(safeInfinity)
    })
    it("Migrate zUSD assets", async () => {
        // Before
        expect(await zUsd.balanceOf(gusdFpAddress), "Some zUSD in existing GUSD Feeder Pool").to.gt(0)
        expect(await zUsd.balanceOf(gusdIntegration.address), "No zUSD in new GUSD FP Integration contract").to.eq(0)
        expect(await zUsd.balanceOf(cyzUsdAddress), "No zUSD in CREAM, yet").to.eq(0)
        zUsdInGusdFpBefore = await zUsd.balanceOf(gusdFpAddress)
        gUsdFpDataBefore = await gudsFp.getBasset(zUsdAddress)

        // Migrate zUSD in GUSD Feeder Pool to new GUSD FP Integration contract
        const tx = await gudsFp.migrateBassets([zUsdAddress], gusdIntegration.address)
        console.log(`migrateBassets tx data: ${tx.data}`)

        // All zUsd in the GUSD FP should have moved to the GUSD integration contract
        expect(await zUsd.balanceOf(gusdIntegration.address), "All zUSD in GUSD FP migrated to GUSD Integration").to.eq(zUsdInGusdFpBefore)
        expect(await zUsd.balanceOf(gusdFpAddress), "No more zUSD in GUSD Feeder Pool").to.eq(0)

        const zUsdDataAfter = await gudsFp.getBasset(zUsdAddress)
        expect(gUsdFpDataBefore.vaultData.vaultBalance).to.eq(zUsdDataAfter.vaultData.vaultBalance)

        const zUsdInBusdFpBefore = await zUsd.balanceOf(busdFpAddress)
        await budsFp.migrateBassets([zUsdAddress], busdIntegration.address)

        // All zUsd in the BUSD FP should have moved to the BUSD integration contract but not the CREAM zUSD vault
        expect(await zUsd.balanceOf(busdFpAddress), "No more zUSD in BUSD Feeder Pool").to.eq(0)
        expect(await zUsd.balanceOf(busdIntegration.address), "All zUSD in BUSD FP migrated to BUSD Integration").to.eq(zUsdInBusdFpBefore)
        expect(await zUsd.balanceOf(cyzUsdAddress), "No zUSD in CREAM, yet").to.eq(0)
    })
    it("Mint some zUSD in the GUSD Feeder Pool", async () => {
        expect(await zUsd.balanceOf(gusdFpAddress)).to.eq(0)

        const mintAmount = simpleToExactAmount(10000)
        await zUsd.connect(zUsdWhale).approve(gusdFpAddress, mintAmount)
        expect(await zUsd.allowance(zUsdWhaleAddress, gusdFpAddress)).to.eq(mintAmount)

        await gudsFp.connect(zUsdWhale).mint(zUsdAddress, mintAmount, 0, zUsdWhaleAddress)

        const zUsdDataAfter = await gudsFp.getBasset(zUsdAddress)
        expect(zUsdDataAfter.vaultData.vaultBalance, "Vault balances").to.eq(gUsdFpDataBefore.vaultData.vaultBalance.add(mintAmount))

        const zUsdInGusdIntegration = await zUsd.balanceOf(gusdIntegration.address)
        const zUsdInCream = await zUsd.balanceOf(cyzUsdAddress)
        expect(zUsdInGusdIntegration, "Some zUSD in GUSD Integration").to.gt(0)
        expect(zUsdInCream, "Some zUSD in CREAM").to.gt(0)

        console.log(`Total zUSD ${zUsdDataAfter.vaultData.vaultBalance}, integration ${zUsdInGusdIntegration}, CREAM vault ${zUsdInCream}`)
        expect(zUsdDataAfter.vaultData.vaultBalance, "zUSD in GUSD FP split across Integration and CREAM").to.eq(
            zUsdInGusdIntegration.add(zUsdInCream),
        )

        const rateExchange = await cyzUsdToken.exchangeRateStored()
        expect(await cyzUsdToken.balanceOf(gusdIntegration.address), "cyzUSD tokens in GUSD Integration").to.eq(
            // cyzUSD = zUSD *  1e18 / exchange rate
            zUsdInCream.mul(BN.from(10).pow(18)).div(rateExchange),
        )
    })
    it("Redeem zUSD from feed", async () => {
        const redeemAmount = simpleToExactAmount(9970)
        await gudsFp.connect(zUsdWhale).redeem(zUsdAddress, redeemAmount, 0, zUsdWhaleAddress)

        const zUsdDataAfter = await gudsFp.getBasset(zUsdAddress)

        const zUsdInGusdIntegration = await zUsd.balanceOf(gusdIntegration.address)
        const zUsdInCream = await zUsd.balanceOf(cyzUsdAddress)
        expect(zUsdInGusdIntegration, "Some zUSD in GUSD Integration").to.gt(0)
        expect(zUsdInCream, "Some zUSD in CREAM").to.gt(0)

        console.log(`Total zUSD ${zUsdDataAfter.vaultData.vaultBalance}, integration ${zUsdInGusdIntegration}, CREAM vault ${zUsdInCream}`)
        expect(zUsdDataAfter.vaultData.vaultBalance, "zUSD in GUSD FP split across Integration and CREAM").to.eq(
            zUsdInGusdIntegration.add(zUsdInCream),
        )
    })
    context("approveRewardToken", () => {
        it("using governor", async () => {
            await gusdIntegration.connect(governor).approveRewardToken()
        })
        it("not using governor", async () => {
            const tx = gusdIntegration.connect(deployer).approveRewardToken()
            await expect(tx).to.revertedWith("Only governor can execute")
        })
    })
    context("reApproveAllTokens", () => {
        it("using governor", async () => {
            await gusdIntegration.connect(governor).reApproveAllTokens()
        })
        it("not using governor", async () => {
            const tx = gusdIntegration.connect(deployer).reApproveAllTokens()
            await expect(tx).to.revertedWith("Only governor can execute")
        })
    })
    context("Post deployment of Iron Bank integration contracts to mainnet", () => {
        before("reset block number", async () => {
            await network.provider.request({
                method: "hardhat_reset",
                params: [
                    {
                        forking: {
                            jsonRpcUrl: process.env.NODE_URL,
                            blockNumber: 12540080,
                        },
                    },
                ],
            })
            deployer = await impersonate(deployerAddress)
            governor = await impersonate(governorAddress)
            ethWhale = await impersonate(ethWhaleAddress)
            zUsdWhale = await impersonate(zUsdWhaleAddress)

            // send some Ether to the impersonated multisig contract as it doesn't have Ether
            await ethWhale.sendTransaction({
                to: governorAddress,
                value: simpleToExactAmount(10),
            })

            gudsFp = FeederPool__factory.connect(gusdFpAddress, governor)
            budsFp = FeederPool__factory.connect(busdFpAddress, governor)

            zUsd = await IERC20__factory.connect(zUsdAddress, deployer)
            cyzUsdToken = await ICERC20__factory.connect(cyzUsdAddress, deployer)
            creamToken = await IERC20__factory.connect(creamTokenAddress, deployer)

            gusdIntegration = CompoundIntegration__factory.connect(gusdIronBankIntegrationAddress, governor)
            busdIntegration = CompoundIntegration__factory.connect(busdIronBankIntegrationAddress, governor)
        })
        it("migrateBassets in GUSD", async () => {
            // Before
            expect(await zUsd.balanceOf(gusdFpAddress), "Some zUSD in existing GUSD Feeder Pool").to.gt(0)
            expect(await zUsd.balanceOf(gusdIntegration.address), "No zUSD in new GUSD FP Integration contract").to.eq(0)
            const zUsdInIronBankBefore = await zUsd.balanceOf(cyzUsdAddress)
            zUsdInGusdFpBefore = await zUsd.balanceOf(gusdFpAddress)
            gUsdFpDataBefore = await gudsFp.getBasset(zUsdAddress)

            // Migrate zUSD in GUSD Feeder Pool to new GUSD FP Integration contract for Iron Bank
            const tx = await gudsFp.migrateBassets([zUsdAddress], gusdIntegration.address)
            console.log(`migrateBassets tx data for GUSD Feeder Pool: ${tx.data}`)

            // All zUsd in the GUSD FP should have moved to the GUSD integration contract
            expect(await zUsd.balanceOf(gusdIntegration.address), "All zUSD in GUSD FP migrated to GUSD Integration").to.eq(
                zUsdInGusdFpBefore,
            )
            expect(await zUsd.balanceOf(gusdFpAddress), "No more zUSD in GUSD Feeder Pool").to.eq(0)

            const zUsdDataAfter = await gudsFp.getBasset(zUsdAddress)
            expect(gUsdFpDataBefore.vaultData.vaultBalance).to.eq(zUsdDataAfter.vaultData.vaultBalance)

            expect(await zUsd.balanceOf(cyzUsdAddress), "Feeder Pool zUSD not in CREAM, yet").to.eq(zUsdInIronBankBefore)
        })
        it("migrateBassets in BUSD", async () => {
            // Before
            expect(await zUsd.balanceOf(busdFpAddress), "Some zUSD in existing BUSD Feeder Pool").to.gt(0)
            expect(await zUsd.balanceOf(busdIntegration.address), "No zUSD in new BUSD FP Integration contract").to.eq(0)
            const zUsdInIronBankBefore = await zUsd.balanceOf(cyzUsdAddress)
            const zUsdInBusdFpBefore = await zUsd.balanceOf(busdFpAddress)

            // Migrate zUSD in BUSD Feeder Pool to new BUSD FP Integration contract for Iron Bank
            const tx = await budsFp.migrateBassets([zUsdAddress], busdIntegration.address)
            console.log(`migrateBassets tx data for BUSD Feeder Pool: ${tx.data}`)

            // All zUsd in the BUSD FP should have moved to the BUSD integration contract but not the CREAM zUSD vault
            expect(await zUsd.balanceOf(busdFpAddress), "No more zUSD in BUSD Feeder Pool").to.eq(0)
            expect(await zUsd.balanceOf(busdIntegration.address), "All zUSD in BUSD FP migrated to BUSD Integration").to.eq(
                zUsdInBusdFpBefore,
            )
            expect(await zUsd.balanceOf(cyzUsdAddress), "Feeder Pool zUSD not in CREAM, yet").to.eq(zUsdInIronBankBefore)
        })
        it("Governor approves Liquidator to spend the reward (CREAM) tokens", async () => {
            expect(await creamToken.allowance(gusdIntegration.address, liquidatorAddress)).to.eq(0)
            expect(await creamToken.allowance(busdIntegration.address, liquidatorAddress)).to.eq(0)

            // This will be done via the delayedProxyAdmin on mainnet
            await gusdIntegration.connect(governor).approveRewardToken()
            await busdIntegration.connect(governor).approveRewardToken()

            expect(await creamToken.allowance(gusdIntegration.address, liquidatorAddress)).to.eq(safeInfinity)
            expect(await creamToken.allowance(busdIntegration.address, liquidatorAddress)).to.eq(safeInfinity)
        })
    })
})
