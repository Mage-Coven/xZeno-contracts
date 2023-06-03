import { impersonate, setBalance } from "@utils/fork"
import { Signer, ContractFactory } from "ethers"
import { expect } from "chai"
import { ethers, network } from "hardhat"
import { deployContract } from "tasks/utils/deploy-utils"

// Mainnet izBTC Contract
import { SavingsContractIzbtcMainnet22__factory } from "types/generated/factories/SavingsContractIzbtcMainnet22__factory"
import { SavingsContractIzbtcMainnet22 } from "types/generated/SavingsContractIzbtcMainnet22"
// Mainnet izUSD Contract
import { SavingsContractIzusdMainnet22__factory } from "types/generated/factories/SavingsContractIzusdMainnet22__factory"
import { SavingsContractIzusdMainnet22 } from "types/generated/SavingsContractIzusdMainnet22"

import { DelayedProxyAdmin, DelayedProxyAdmin__factory, IERC20, IERC20__factory, Unwrapper, Unwrapper__factory } from "types/generated"

import { assertBNClosePercent, Chain, ZERO_ADDRESS, simpleToExactAmount } from "index"
import { BigNumber } from "@ethersproject/bignumber"
import { getChainAddress, resolveAddress } from "tasks/utils/networkAddressFactory"
import { upgradeContract } from "@utils/deploy"

const chain = Chain.mainnet
const delayedProxyAdminAddress = getChainAddress("DelayedProxyAdmin", chain)
const governorAddress = getChainAddress("Governor", chain)
const nexusAddress = getChainAddress("Nexus", chain)
const unwrapperAddress = getChainAddress("Unwrapper", chain)

const deployerAddress = "0x19F12C947D25Ff8a3b748829D8001cA09a28D46d"
const izusdHolderAddress = "0xdA1fD36cfC50ED03ca4dd388858A78C904379fb3"
const izbtcHolderAddress = "0x720366c95d26389471c52f854d43292157c03efd"
const daiAddress = resolveAddress("DAI", Chain.mainnet)
const alusdAddress = resolveAddress("alUSD", Chain.mainnet)
const zusdAddress = resolveAddress("zUSD", Chain.mainnet)
const izusdAddress = resolveAddress("zUSD", Chain.mainnet, "savings")
const alusdFeederPool = resolveAddress("alUSD", Chain.mainnet, "feederPool")
const zbtcAddress = resolveAddress("zBTC", Chain.mainnet)
const izbtcAddress = resolveAddress("zBTC", Chain.mainnet, "savings")
const wbtcAddress = resolveAddress("WBTC", Chain.mainnet)
const hbtcAddress = resolveAddress("HBTC", Chain.mainnet)
const hbtcFeederPool = resolveAddress("HBTC", Chain.mainnet, "feederPool")

// DEPLOYMENT PIPELINE
//  1. Upgrade and check storage
//   1.1. SavingsContracts
//  2. Do some unwrapping
//   2.1. Directly to unwrapper
//   2.2. Via SavingsContracts
//  3. Test ERC4626 on SavingsContracts
context("SavingContract Vault4626 upgrades", () => {
    let deployer: Signer
    let unwrapper: Unwrapper
    let governor: Signer
    let delayedProxyAdmin: DelayedProxyAdmin

    const redeemAndUnwrap = async (
        holderAddress: string,
        router: string,
        input: "zusd" | "zbtc",
        outputAddress: string,
        isCredit = false,
    ) => {
        const holder = await impersonate(holderAddress)
        const saveAddress = input === "zusd" ? izusdAddress : izbtcAddress
        let inputAddress = input === "zusd" ? zusdAddress : zbtcAddress

        if (input === "zusd" && isCredit) {
            inputAddress = izusdAddress
        } else if (input === "zusd" && !isCredit) {
            inputAddress = zusdAddress
        } else if (input !== "zusd" && isCredit) {
            inputAddress = izbtcAddress
        } else {
            inputAddress = zbtcAddress
        }

        const amount = input === "zusd" ? simpleToExactAmount(1, 18) : simpleToExactAmount(1, 14)

        const config = {
            router,
            input: inputAddress,
            output: outputAddress,
            amount: isCredit ? amount : amount.mul(10),
            isCredit,
        }

        // Get estimated output via getUnwrapOutput
        const isBassetOut = await unwrapper.callStatic.getIsBassetOut(config.input, config.isCredit, config.output)
        const amountOut = await unwrapper.getUnwrapOutput(
            isBassetOut,
            config.router,
            config.input,
            config.isCredit,
            config.output,
            config.amount,
        )
        expect(amountOut.toString().length).to.be.gte(input === "zusd" ? 18 : 4)
        const minAmountOut = amountOut.mul(98).div(1e2)
        const outContract = IERC20__factory.connect(config.output, holder)
        const tokenBalanceBefore = await outContract.balanceOf(holderAddress)
        const saveContract =
            input === "zusd"
                ? SavingsContractIzusdMainnet22__factory.connect(saveAddress, holder)
                : SavingsContractIzbtcMainnet22__factory.connect(saveAddress, holder)

        await saveContract.redeemAndUnwrap(
            config.amount,
            config.isCredit,
            minAmountOut,
            config.output,
            holderAddress,
            config.router,
            isBassetOut,
        )

        const tokenBalanceAfter = await outContract.balanceOf(holderAddress)
        const tokenBalanceDifference = tokenBalanceAfter.sub(tokenBalanceBefore)
        assertBNClosePercent(tokenBalanceDifference, amountOut, 0.001)
        expect(tokenBalanceAfter, "Token balance has increased").to.be.gt(tokenBalanceBefore)
    }

    before("reset block number", async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [
                {
                    forking: {
                        jsonRpcUrl: process.env.NODE_URL,
                        // Apr-17-2022 01:54:24 AM +UTC
                        blockNumber: 14600000,
                    },
                },
            ],
        })
        deployer = await impersonate(deployerAddress)
        governor = await impersonate(governorAddress)
        delayedProxyAdmin = DelayedProxyAdmin__factory.connect(delayedProxyAdminAddress, governor)
        unwrapper = await Unwrapper__factory.connect(unwrapperAddress, deployer)

        // Set underlying assets balance for testing
        await setBalance(
            izbtcHolderAddress,
            zbtcAddress,
            simpleToExactAmount(1000, 14),
            "0x6cb417529ba9d523d90ee650ef76cc0b9eccfd19232ffb9510f634b1fa3ecfaf",
        )
        await setBalance(
            izusdHolderAddress,
            zusdAddress,
            simpleToExactAmount(1000, 18),
            "0xe5fabcd29e7e9410c7da27fc68f987954a0ad327fe34ba95056b7880fd70df35",
        )
        // Set savings contract balance for testing
        await setBalance(
            izbtcHolderAddress,
            izbtcAddress,
            simpleToExactAmount(1000, 14),
            "0x6cb417529ba9d523d90ee650ef76cc0b9eccfd19232ffb9510f634b1fa3ecfaf",
        )
        await setBalance(
            izusdHolderAddress,
            izusdAddress,
            simpleToExactAmount(1000, 18),
            "0xe5fabcd29e7e9410c7da27fc68f987954a0ad327fe34ba95056b7880fd70df35",
        )
    })
    it("Test connectivity", async () => {
        const startEther = await deployer.getBalance()
        const address = await deployer.getTransactionCount()
        console.log(`Deployer ${address} has ${startEther} Ether`)
    })

    context("Stage 1", () => {
        describe("1.1 Upgrading savings contracts", () => {
            it("Upgrades the izUSD contract", async () => {
                const zusdSaveImpl = await deployContract<SavingsContractIzusdMainnet22>(
                    new SavingsContractIzusdMainnet22__factory(deployer),
                    "xZeno: zUSD Savings Contract",
                    [],
                )

                const upgradeData = []
                const saveContractProxy = await upgradeContract<SavingsContractIzusdMainnet22>(
                    SavingsContractIzusdMainnet22__factory as unknown as ContractFactory,
                    zusdSaveImpl,
                    izusdAddress,
                    governor,
                    delayedProxyAdmin,
                    upgradeData,
                )
                expect(await saveContractProxy.unwrapper(), "unwrapper").to.eq(unwrapper.address)
                expect(await delayedProxyAdmin.getProxyImplementation(izusdAddress)).eq(zusdSaveImpl.address)
                expect(zusdAddress).eq(await zusdSaveImpl.underlying())
            })

            it("izUSD contract works after upgraded", async () => {
                await redeemAndUnwrap(izusdHolderAddress, zusdAddress, "zusd", daiAddress)
            })

            it("Upgrades the izBTC contract", async () => {
                const constructorArguments = [nexusAddress, zbtcAddress, unwrapper.address]
                const zbtcSaveImpl = await deployContract<SavingsContractIzbtcMainnet22>(
                    new SavingsContractIzbtcMainnet22__factory(deployer),
                    "xZeno: zBTC Savings",
                    constructorArguments,
                )

                const saveContractProxy = await upgradeContract<SavingsContractIzbtcMainnet22>(
                    SavingsContractIzbtcMainnet22__factory as unknown as ContractFactory,
                    zbtcSaveImpl,
                    izbtcAddress,
                    governor,
                    delayedProxyAdmin,
                )
                expect(await delayedProxyAdmin.getProxyImplementation(izbtcAddress)).eq(zbtcSaveImpl.address)
                expect(await saveContractProxy.unwrapper()).to.eq(unwrapper.address)
            })

            it("izBTC contract works after upgraded", async () => {
                await redeemAndUnwrap(izbtcHolderAddress, zbtcAddress, "zbtc", wbtcAddress)
            })
        })
    })

    context("Stage 2 (regression)", () => {
        describe("2.1 Via SavingsContracts", () => {
            before("fund accounts", async () => {
                const izusdHolder = await impersonate(izusdHolderAddress)
                const izbtcHolder = await impersonate(izbtcHolderAddress)

                const savingsContractIzusd = SavingsContractIzusdMainnet22__factory.connect(izusdAddress, izusdHolder)
                const savingsContractIzbtc = SavingsContractIzbtcMainnet22__factory.connect(izbtcAddress, izbtcHolder)

                const zusd = IERC20__factory.connect(zusdAddress, izusdHolder)
                const zbtc = IERC20__factory.connect(zbtcAddress, izbtcHolder)

                await zusd.approve(savingsContractIzusd.address, simpleToExactAmount(1, 21))
                await zbtc.approve(savingsContractIzbtc.address, simpleToExactAmount(1, 18))

                await savingsContractIzusd["deposit(uint256,address)"](simpleToExactAmount(100), izusdHolderAddress)
                await savingsContractIzbtc["deposit(uint256,address)"](simpleToExactAmount(10, 14), izbtcHolderAddress)
            })
            it("zUSD contract redeem to bAsset", async () => {
                await redeemAndUnwrap(izusdHolderAddress, zusdAddress, "zusd", daiAddress)
            })

            it.skip("zUSD contract redeem to fAsset", async () => {
                await redeemAndUnwrap(izusdHolderAddress, alusdFeederPool, "zusd", alusdAddress)
            })
            it("zBTC contract redeem to bAsset", async () => {
                await redeemAndUnwrap(izbtcHolderAddress, zbtcAddress, "zbtc", wbtcAddress)
            })

            it.skip("zBTC contract redeem to fAsset", async () => {
                await redeemAndUnwrap(izbtcHolderAddress, hbtcFeederPool, "zbtc", hbtcAddress)
            })
            // credits
            it("izUSD contract redeem to bAsset", async () => {
                await redeemAndUnwrap(izusdHolderAddress, zusdAddress, "zusd", daiAddress, true)
            })

            it("izUSD contract redeem to fAsset", async () => {
                await redeemAndUnwrap(izusdHolderAddress, alusdFeederPool, "zusd", alusdAddress, true)
            })
            it("izBTC contract redeem to bAsset", async () => {
                await redeemAndUnwrap(izbtcHolderAddress, zbtcAddress, "zbtc", wbtcAddress, true)
            })

            it("izBTC contract redeem to fAsset", async () => {
                await redeemAndUnwrap(izbtcHolderAddress, hbtcFeederPool, "zbtc", hbtcAddress, true)
            })
        })
    })

    context("Stage 3 Savings Contract ERC4626", () => {
        const saveContracts = [
            { name: "izusd", address: izusdAddress },
            { name: "izbtc", address: izbtcAddress },
        ]

        saveContracts.forEach((sc) => {
            let ctxSaveContract: SavingsContractIzusdMainnet22 | SavingsContractIzbtcMainnet22
            let assetAddress: string
            let holderAddress: string
            let anotherHolderAddress: string
            let asset: IERC20
            let holder: Signer
            let anotherHolder: Signer
            let assetsAmount = simpleToExactAmount(10, 18)
            let sharesAmount: BigNumber
            let sharesBalance: BigNumber
            let assetsBalance: BigNumber
            let underlyingSaveContractBalance: BigNumber
            let anotherUnderlyingBalance: BigNumber

            async function getBalances() {
                underlyingSaveContractBalance = await asset.balanceOf(ctxSaveContract.address)
                anotherUnderlyingBalance = await asset.balanceOf(anotherHolderAddress)

                sharesBalance = await ctxSaveContract.balanceOf(holderAddress)
                assetsBalance = await ctxSaveContract.convertToAssets(sharesBalance)
                sharesAmount = await ctxSaveContract.convertToShares(assetsAmount)
            }
            before(async () => {
                if (sc.name === "izusd") {
                    holder = await impersonate(izusdHolderAddress)
                    anotherHolder = await impersonate(izbtcHolderAddress)
                    ctxSaveContract = SavingsContractIzusdMainnet22__factory.connect(sc.address, holder)
                    assetAddress = zusdAddress
                    assetsAmount = simpleToExactAmount(1, 18)
                } else {
                    holder = await impersonate(izbtcHolderAddress)
                    anotherHolder = await impersonate(izusdHolderAddress)
                    ctxSaveContract = SavingsContractIzbtcMainnet22__factory.connect(sc.address, holder)
                    assetAddress = zbtcAddress
                    assetsAmount = simpleToExactAmount(1, 14)
                }
                holderAddress = await holder.getAddress()
                anotherHolderAddress = await anotherHolder.getAddress()
                asset = IERC20__factory.connect(assetAddress, holder)
            })
            beforeEach(async () => {
                await getBalances()
            })
            describe(`SaveContract ${sc.name}`, async () => {
                it("should properly store valid arguments", async () => {
                    expect(await ctxSaveContract.asset(), "asset").to.eq(assetAddress)
                })
                describe("deposit", async () => {
                    it("should deposit assets to the vault", async () => {
                        await asset.approve(ctxSaveContract.address, simpleToExactAmount(1, 21))
                        let shares = await ctxSaveContract.previewDeposit(assetsAmount)

                        expect(await ctxSaveContract.maxDeposit(holderAddress), "max deposit").to.gte(assetsAmount)
                        expect(await ctxSaveContract.maxMint(holderAddress), "max mint").to.gte(shares)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)
                        expect(await ctxSaveContract.convertToShares(assetsAmount), "convertToShares").to.lte(shares)

                        // Test
                        const tx = await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assetsAmount, holderAddress)
                        // Exchange rate update
                        shares = await ctxSaveContract.previewDeposit(assetsAmount)

                        // Verify events, storage change, balance, etc.
                        await expect(tx).to.emit(ctxSaveContract, "Deposit").withArgs(holderAddress, holderAddress, assetsAmount, shares)
                        assertBNClosePercent(await ctxSaveContract.maxRedeem(holderAddress), sharesBalance.add(shares), 0.01)
                        assertBNClosePercent(await ctxSaveContract.maxWithdraw(holderAddress), assetsBalance.add(assetsAmount), 0.01)
                        assertBNClosePercent(await ctxSaveContract.totalAssets(), underlyingSaveContractBalance.add(assetsAmount), 0.1)
                    })
                    it("should deposit assets with referral", async () => {
                        await asset.approve(ctxSaveContract.address, simpleToExactAmount(1, 21))
                        let shares = await ctxSaveContract.previewDeposit(assetsAmount)

                        expect(await ctxSaveContract.maxDeposit(holderAddress), "max deposit").to.gte(assetsAmount)
                        expect(await ctxSaveContract.maxMint(holderAddress), "max mint").to.gte(shares)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)
                        expect(await ctxSaveContract.convertToShares(assetsAmount), "convertToShares").to.lte(shares)

                        // Test
                        const tx = await ctxSaveContract
                            .connect(holder)
                            ["deposit(uint256,address,address)"](assetsAmount, holderAddress, anotherHolderAddress)

                        shares = await ctxSaveContract.previewDeposit(assetsAmount)

                        // Verify events, storage change, balance, etc.
                        await expect(tx).to.emit(ctxSaveContract, "Deposit").withArgs(holderAddress, holderAddress, assetsAmount, shares)
                        await expect(tx).to.emit(ctxSaveContract, "Referral").withArgs(anotherHolderAddress, holderAddress, assetsAmount)

                        assertBNClosePercent(await ctxSaveContract.maxRedeem(holderAddress), sharesBalance.add(shares), 0.01)
                        assertBNClosePercent(await ctxSaveContract.maxWithdraw(holderAddress), assetsBalance.add(assetsAmount), 0.01)
                        assertBNClosePercent(await ctxSaveContract.totalAssets(), underlyingSaveContractBalance.add(assetsAmount), 0.1)
                    })
                    it("fails if deposits zero", async () => {
                        await expect(ctxSaveContract.connect(deployer)["deposit(uint256,address)"](0, holderAddress)).to.be.revertedWith(
                            "Must deposit something",
                        )
                    })
                    it("fails if receiver is zero", async () => {
                        await expect(ctxSaveContract.connect(deployer)["deposit(uint256,address)"](10, ZERO_ADDRESS)).to.be.revertedWith(
                            "Invalid beneficiary address",
                        )
                    })
                })
                describe("mint", async () => {
                    it("should mint shares to the vault", async () => {
                        await asset.approve(ctxSaveContract.address, simpleToExactAmount(1, 21))
                        // const shares = sharesAmount
                        const assets = await ctxSaveContract.previewMint(sharesAmount)
                        const shares = await ctxSaveContract.previewDeposit(assetsAmount)

                        expect(await ctxSaveContract.maxDeposit(holderAddress), "max deposit").to.gte(assets)
                        expect(await ctxSaveContract.maxMint(holderAddress), "max mint").to.gte(shares)

                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        expect(await ctxSaveContract.convertToShares(assets), "convertToShares").to.lte(shares)
                        expect(await ctxSaveContract.convertToAssets(shares), "convertToAssets").to.lte(assets)

                        const tx = await ctxSaveContract.connect(holder)["mint(uint256,address)"](shares, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx).to.emit(ctxSaveContract, "Deposit").withArgs(holderAddress, holderAddress, assets, shares)

                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.add(sharesAmount))
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.add(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))
                    })
                    it("should mint shares with referral", async () => {
                        await asset.approve(ctxSaveContract.address, simpleToExactAmount(1, 21))
                        // const shares = sharesAmount
                        const assets = await ctxSaveContract.previewMint(sharesAmount)
                        const shares = await ctxSaveContract.previewDeposit(assetsAmount)

                        expect(await ctxSaveContract.maxDeposit(holderAddress), "max deposit").to.gte(assets)
                        expect(await ctxSaveContract.maxMint(holderAddress), "max mint").to.gte(shares)

                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        expect(await ctxSaveContract.convertToShares(assets), "convertToShares").to.lte(shares)
                        expect(await ctxSaveContract.convertToAssets(shares), "convertToAssets").to.lte(assets)

                        const tx = await ctxSaveContract
                            .connect(holder)
                            ["mint(uint256,address,address)"](shares, holderAddress, anotherHolderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx).to.emit(ctxSaveContract, "Deposit").withArgs(holderAddress, holderAddress, assets, shares)
                        await expect(tx).to.emit(ctxSaveContract, "Referral").withArgs(anotherHolderAddress, holderAddress, assetsAmount)

                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.add(sharesAmount))
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.add(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))
                    })
                    it("fails if mint zero", async () => {
                        await expect(ctxSaveContract.connect(deployer)["mint(uint256,address)"](0, holderAddress)).to.be.revertedWith(
                            "Must deposit something",
                        )
                    })
                    it("fails if receiver is zero", async () => {
                        await expect(ctxSaveContract.connect(deployer)["mint(uint256,address)"](10, ZERO_ADDRESS)).to.be.revertedWith(
                            "Invalid beneficiary address",
                        )
                    })
                })
                describe("withdraw", async () => {
                    it("from the vault, same caller, receiver and owner", async () => {
                        await asset.approve(ctxSaveContract.address, simpleToExactAmount(1, 21))

                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assetsAmount, holderAddress)
                        assertBNClosePercent(await ctxSaveContract.maxWithdraw(holderAddress), assetsBalance.add(assetsAmount), 0.01)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.gte(underlyingSaveContractBalance.sub(assetsAmount))
                        const shares = await ctxSaveContract.previewWithdraw(assetsAmount)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.add(sharesAmount))

                        await getBalances()
                        // Test
                        const tx = await ctxSaveContract.connect(holder).withdraw(assetsAmount, holderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx)
                            .to.emit(ctxSaveContract, "Withdraw")
                            .withArgs(holderAddress, holderAddress, holderAddress, assetsAmount, shares)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.sub(sharesAmount))
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.sub(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.sub(assetsAmount))
                    })
                    it("from the vault, caller != receiver and caller = owner", async () => {
                        // Alice deposits assets (owner), Alice withdraws assets (caller), Bob receives assets (receiver)
                        await asset.connect(holder).approve(ctxSaveContract.address, simpleToExactAmount(1, 21))

                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assetsAmount, holderAddress)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.add(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))
                        const shares = await ctxSaveContract.previewWithdraw(assetsAmount)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.add(sharesAmount))

                        await getBalances()
                        // Test
                        const tx = await ctxSaveContract.connect(holder).withdraw(assetsAmount, anotherHolderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx)
                            .to.emit(ctxSaveContract, "Withdraw")
                            .withArgs(holderAddress, anotherHolderAddress, holderAddress, assetsAmount, shares)
                        expect(await asset.balanceOf(anotherHolderAddress), "another holder balance").to.eq(
                            anotherUnderlyingBalance.add(assetsAmount),
                        )
                        expect(await ctxSaveContract.balanceOf(holderAddress), "holder balance").to.eq(sharesBalance.sub(sharesAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.sub(assetsAmount))
                    })
                    it("from the vault caller != owner, infinite approval", async () => {
                        // Alice deposits assets (owner), Bob withdraws assets (caller), Bob receives assets (receiver)
                        await asset.connect(holder).approve(ctxSaveContract.address, ethers.constants.MaxUint256)
                        await ctxSaveContract.connect(holder).approve(anotherHolderAddress, ethers.constants.MaxUint256)

                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assetsAmount, holderAddress)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.add(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))
                        const shares = await ctxSaveContract.previewWithdraw(assetsAmount)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.add(sharesAmount))

                        await getBalances()
                        // Test
                        const tx = await ctxSaveContract.connect(anotherHolder).withdraw(assetsAmount, anotherHolderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx)
                            .to.emit(ctxSaveContract, "Withdraw")
                            .withArgs(anotherHolderAddress, anotherHolderAddress, holderAddress, assetsAmount, shares)

                        expect(await asset.balanceOf(anotherHolderAddress), "another holder balance").to.eq(
                            anotherUnderlyingBalance.add(assetsAmount),
                        )
                        expect(await ctxSaveContract.balanceOf(holderAddress), "holder balance").to.eq(sharesBalance.sub(sharesAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.sub(assetsAmount))
                    })
                    it("from the vault, caller != receiver and caller != owner", async () => {
                        // Alice deposits assets (owner), Bob withdraws assets (caller), Bob receives assets (receiver)
                        await asset.connect(holder).approve(ctxSaveContract.address, simpleToExactAmount(1, 21))
                        await ctxSaveContract.connect(holder).approve(anotherHolderAddress, simpleToExactAmount(1, 21))

                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assetsAmount, holderAddress)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.add(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))
                        const shares = await ctxSaveContract.previewWithdraw(assetsAmount)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.add(sharesAmount))

                        await getBalances()
                        // Test
                        const tx = await ctxSaveContract.connect(anotherHolder).withdraw(assetsAmount, anotherHolderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx)
                            .to.emit(ctxSaveContract, "Withdraw")
                            .withArgs(anotherHolderAddress, anotherHolderAddress, holderAddress, assetsAmount, shares)
                        expect(await asset.balanceOf(anotherHolderAddress), "another holder balance").to.eq(
                            anotherUnderlyingBalance.add(assetsAmount),
                        )
                        expect(await ctxSaveContract.balanceOf(holderAddress), "holder balance").to.eq(sharesBalance.sub(sharesAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.sub(assetsAmount))
                    })
                    it("fails if deposits zero", async () => {
                        await expect(ctxSaveContract.connect(deployer).withdraw(0, holderAddress, holderAddress)).to.be.revertedWith(
                            "Must withdraw something",
                        )
                    })
                    it("fails if receiver is zero", async () => {
                        await expect(ctxSaveContract.connect(deployer).withdraw(10, ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith(
                            "Invalid beneficiary address",
                        )
                    })
                    it("fail if caller != owner and it has not allowance", async () => {
                        // Alice deposits assets (owner), Bob withdraws assets (caller), Bob receives assets (receiver)
                        await ctxSaveContract.connect(holder).approve(anotherHolderAddress, 0)

                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assetsAmount, holderAddress)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.add(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.add(sharesAmount))

                        // Test
                        const tx = ctxSaveContract.connect(anotherHolder).withdraw(assetsAmount, anotherHolderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx).to.be.revertedWith("Amount exceeds allowance")
                    })
                })
                describe("redeem", async () => {
                    it("from the vault, same caller, receiver and owner", async () => {
                        await asset.approve(ctxSaveContract.address, simpleToExactAmount(1, 21))

                        const assets = await ctxSaveContract.previewRedeem(sharesAmount)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assets, holderAddress)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.add(sharesAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))

                        await getBalances()

                        // Test
                        const tx = await ctxSaveContract
                            .connect(holder)
                            ["redeem(uint256,address,address)"](sharesAmount, holderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx)
                            .to.emit(ctxSaveContract, "Withdraw")
                            .withArgs(holderAddress, holderAddress, holderAddress, assets, sharesAmount)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.sub(sharesAmount))
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.sub(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.sub(assetsAmount))
                    })
                    it("from the vault, caller != receiver and caller = owner", async () => {
                        // Alice deposits assets (owner), Alice withdraws assets (caller), Bob receives assets (receiver)
                        await asset.connect(holder).approve(ctxSaveContract.address, simpleToExactAmount(1, 21))
                        const assets = await ctxSaveContract.previewRedeem(sharesAmount)

                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assetsAmount, holderAddress)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))

                        await getBalances()

                        // Test
                        const tx = await ctxSaveContract
                            .connect(holder)
                            ["redeem(uint256,address,address)"](sharesAmount, anotherHolderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx)
                            .to.emit(ctxSaveContract, "Withdraw")
                            .withArgs(holderAddress, anotherHolderAddress, holderAddress, assets, sharesAmount)
                        expect(await ctxSaveContract.maxRedeem(holderAddress), "max redeem").to.eq(sharesBalance.sub(sharesAmount))
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.sub(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.sub(assetsAmount))
                    })
                    it("from the vault caller != owner, infinite approval", async () => {
                        // Alice deposits assets (owner), Bob withdraws assets (caller), Bob receives assets (receiver)
                        await asset.connect(holder).approve(ctxSaveContract.address, simpleToExactAmount(1, 21))
                        await ctxSaveContract.connect(holder).approve(anotherHolderAddress, ethers.constants.MaxUint256)
                        const assets = await ctxSaveContract.previewRedeem(sharesAmount)

                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assets, holderAddress)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.add(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))

                        await getBalances()
                        // Test
                        const tx = await ctxSaveContract
                            .connect(anotherHolder)
                            ["redeem(uint256,address,address)"](sharesAmount, anotherHolderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx)
                            .to.emit(ctxSaveContract, "Withdraw")
                            .withArgs(anotherHolderAddress, anotherHolderAddress, holderAddress, assets, sharesAmount)
                        expect(await asset.balanceOf(anotherHolderAddress), "another holder balance").to.eq(
                            anotherUnderlyingBalance.add(assetsAmount),
                        )
                        expect(await ctxSaveContract.balanceOf(holderAddress), "holder balance").to.eq(sharesBalance.sub(sharesAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.sub(assetsAmount))
                    })
                    it("from the vault, caller != receiver and caller != owner", async () => {
                        // Alice deposits assets (owner), Bob withdraws assets (caller), Bob receives assets (receiver)
                        await asset.connect(holder).approve(ctxSaveContract.address, simpleToExactAmount(1, 21))
                        await ctxSaveContract.connect(holder).approve(anotherHolderAddress, simpleToExactAmount(1, 21))
                        const assets = await ctxSaveContract.previewRedeem(sharesAmount)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance)

                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assets, holderAddress)
                        expect(await ctxSaveContract.maxWithdraw(holderAddress), "max withdraw").to.eq(assetsBalance.add(assetsAmount))
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.add(assetsAmount))

                        await getBalances()
                        // Test
                        const tx = await ctxSaveContract
                            .connect(anotherHolder)
                            ["redeem(uint256,address,address)"](sharesAmount, anotherHolderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx)
                            .to.emit(ctxSaveContract, "Withdraw")
                            .withArgs(anotherHolderAddress, anotherHolderAddress, holderAddress, assets, sharesAmount)

                        expect(await ctxSaveContract.maxRedeem(anotherHolderAddress), "max redeem").to.eq(0)
                        expect(await ctxSaveContract.maxWithdraw(anotherHolderAddress), "max withdraw").to.eq(0)
                        expect(await ctxSaveContract.totalAssets(), "totalAssets").to.eq(underlyingSaveContractBalance.sub(assetsAmount))
                    })
                    it("fails if deposits zero", async () => {
                        await expect(
                            ctxSaveContract.connect(deployer)["redeem(uint256,address,address)"](0, holderAddress, holderAddress),
                        ).to.be.revertedWith("Must withdraw something")
                    })
                    it("fails if receiver is zero", async () => {
                        await expect(
                            ctxSaveContract.connect(deployer)["redeem(uint256,address,address)"](10, ZERO_ADDRESS, ZERO_ADDRESS),
                        ).to.be.revertedWith("Invalid beneficiary address")
                    })
                    it("fail if caller != owner and it has not allowance", async () => {
                        // Alice deposits assets (owner), Bob withdraws assets (caller), Bob receives assets (receiver)
                        await asset.connect(holder).approve(ctxSaveContract.address, simpleToExactAmount(1, 21))
                        const assets = await ctxSaveContract.previewRedeem(sharesAmount)
                        await ctxSaveContract.connect(holder)["deposit(uint256,address)"](assets, holderAddress)

                        await ctxSaveContract.connect(holder).approve(anotherHolderAddress, 0)
                        expect(await ctxSaveContract.connect(holder).allowance(holderAddress, anotherHolderAddress), "allowance").to.eq(0)
                        // Test
                        const tx = ctxSaveContract
                            .connect(anotherHolder)
                            ["redeem(uint256,address,address)"](sharesAmount, anotherHolderAddress, holderAddress)
                        // Verify events, storage change, balance, etc.
                        await expect(tx).to.be.revertedWith("Amount exceeds allowance")
                    })
                })
            })
        })
    })
})
