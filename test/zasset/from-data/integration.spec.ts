/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-loop-func */

import { ethers } from "hardhat"
import { expect } from "chai"

import { simpleToExactAmount, BN } from "@utils/math"
import { DEAD_ADDRESS, MAX_UINT256, ZERO_ADDRESS } from "@utils/constants"
import { ZassetLogic, ZassetManager, ExposedZasset } from "types/generated"
import { assertBNClose, assertBNSlightlyGT } from "@utils/assertions"
import { ZassetMachine, StandardAccounts } from "@utils/machines"
import { zAssetData } from "@utils/validator-data"

const config = {
    a: BN.from(120),
    limits: {
        min: simpleToExactAmount(5, 16),
        max: simpleToExactAmount(75, 16),
    },
}

const ratio = simpleToExactAmount(1, 8)
const tolerance = BN.from(10)

const cv = (n: number | string): BN => BN.from(BigInt(n).toString())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getReserves = (data: any) =>
    [0, 1, 2, 3, 4, 5]
        .filter((i) => data[`reserve${i}`])
        .map((i) => ({
            ratio,
            vaultBalance: cv(data[`reserve${i}`]),
        }))

const runLongTests = process.env.LONG_TESTS === "true"

describe("Invariant Validator - One basket many tests @skip-on-coverage", () => {
    let zAsset: ExposedZasset
    let sa: StandardAccounts
    let recipient: string
    let bAssetAddresses: string[]
    before(async () => {
        const accounts = await ethers.getSigners()
        const zAssetMachine = await new ZassetMachine().initAccounts(accounts)
        sa = zAssetMachine.sa
        recipient = await sa.default.address

        const renBTC = await zAssetMachine.loadBassetProxy("Ren BTC", "renBTC", 18)
        const sBTC = await zAssetMachine.loadBassetProxy("Synthetix BTC", "sBTC", 18)
        const wBTC = await zAssetMachine.loadBassetProxy("Wrapped BTC", "wBTC", 18)
        const bAssets = [renBTC, sBTC, wBTC]
        bAssetAddresses = bAssets.map((b) => b.address)

        const LogicFactory = await ethers.getContractFactory("ZassetLogic")
        const logicLib = (await LogicFactory.deploy()) as ZassetLogic

        // 3. Invariant Validator
        const ManagerFactory = await ethers.getContractFactory("ZassetManager")
        const managerLib = (await ManagerFactory.deploy()) as ZassetManager

        const ZassetFactory = (
            await ethers.getContractFactory("ExposedZasset", {
                libraries: {
                    ZassetLogic: logicLib.address,
                    ZassetManager: managerLib.address,
                },
            })
        ).connect(sa.default.signer)
        zAsset = (await ZassetFactory.deploy(DEAD_ADDRESS, simpleToExactAmount(5, 13))) as ExposedZasset
        await zAsset.initialize(
            "xZeno Asset",
            "zAsset",
            bAssets.map((b) => ({
                addr: b.address,
                integrator: ZERO_ADDRESS,
                hasTxFee: false,
                status: 0,
            })),
            config,
        )

        await Promise.all(bAssets.map((b) => b.approve(zAsset.address, MAX_UINT256)))

        const reserves = getReserves(zAssetData.integrationData)

        await zAsset.mintMulti(
            bAssetAddresses,
            reserves.map((r) => r.vaultBalance),
            0,
            recipient,
        )
    })

    interface Data {
        totalSupply: BN
        surplus: BN
        vaultBalances: BN[]
        priceData: {
            price: BN
            k: BN
        }
    }
    const getData = async (_zAsset: ExposedZasset): Promise<Data> => ({
        totalSupply: await _zAsset.totalSupply(),
        surplus: (await _zAsset.data()).surplus,
        vaultBalances: (await _zAsset.getBassets())[1].map((b) => b[1]),
        priceData: await _zAsset.getPrice(),
    })

    describe("Run all the data", () => {
        let dataBefore: Data
        let lastKDiff = BN.from(0)
        let count = 0

        for (const testData of zAssetData.integrationData.actions.slice(
            0,
            runLongTests ? zAssetData.integrationData.actions.length : 100,
        )) {
            describe(`Action ${(count += 1)}`, () => {
                before(async () => {
                    dataBefore = await getData(zAsset)
                })
                switch (testData.type) {
                    case "mint":
                        if (testData.hardLimitError) {
                            it(`throws Max Weight error when minting ${testData.inputQty.toString()} bAssets with index ${
                                testData.inputIndex
                            }`, async () => {
                                await expect(
                                    zAsset.mint(bAssetAddresses[testData.inputIndex], cv(testData.inputQty), 0, recipient),
                                ).to.be.revertedWith("Exceeds weight limits")

                                await expect(
                                    zAsset.getMintOutput(bAssetAddresses[testData.inputIndex], cv(testData.inputQty)),
                                ).to.be.revertedWith("Exceeds weight limits")
                            })
                        } else {
                            it(`should deposit ${testData.inputQty.toString()} bAssets with index ${testData.inputIndex}`, async () => {
                                const expectedOutput = await zAsset.getMintOutput(
                                    bAssetAddresses[testData.inputIndex],
                                    cv(testData.inputQty),
                                )
                                assertBNClose(expectedOutput, cv(testData.expectedQty), tolerance)

                                await zAsset.mint(
                                    bAssetAddresses[testData.inputIndex],
                                    cv(testData.inputQty),
                                    cv(testData.expectedQty).sub(tolerance),
                                    recipient,
                                )

                                const dataMid = await getData(zAsset)
                                assertBNClose(dataMid.totalSupply.sub(dataBefore.totalSupply), expectedOutput, tolerance)
                            })
                        }
                        break
                    case "mintMulti":
                        {
                            const qtys = testData.inputQtys.map((b) => cv(b))
                            if (testData.hardLimitError) {
                                it(`throws Max Weight error when minting ${qtys} bAssets with index ${testData.inputIndex}`, async () => {
                                    await expect(zAsset.mintMulti(bAssetAddresses, qtys, 0, recipient)).to.be.revertedWith(
                                        "Exceeds weight limits",
                                    )

                                    await expect(zAsset.getMintMultiOutput(bAssetAddresses, qtys)).to.be.revertedWith(
                                        "Exceeds weight limits",
                                    )
                                })
                            } else {
                                it(`should mintMulti ${qtys} bAssets`, async () => {
                                    const expectedOutput = await zAsset.getMintMultiOutput(bAssetAddresses, qtys)
                                    assertBNClose(expectedOutput, cv(testData.expectedQty), tolerance)

                                    await zAsset.mintMulti(bAssetAddresses, qtys, cv(testData.expectedQty).sub(tolerance), recipient)

                                    const dataMid = await getData(zAsset)
                                    assertBNClose(dataMid.totalSupply.sub(dataBefore.totalSupply), expectedOutput, tolerance)
                                })
                            }
                        }
                        break
                    case "swap":
                        if (testData.hardLimitError) {
                            it(`throws Max Weight error when swapping ${testData.inputQty.toString()} ${testData.inputIndex} for ${
                                testData.outputIndex
                            }`, async () => {
                                await expect(
                                    zAsset.swap(
                                        bAssetAddresses[testData.inputIndex],
                                        bAssetAddresses[testData.outputIndex],
                                        cv(testData.inputQty),
                                        0,
                                        recipient,
                                    ),
                                ).to.be.revertedWith("Exceeds weight limits")
                                await expect(
                                    zAsset.getSwapOutput(
                                        bAssetAddresses[testData.inputIndex],
                                        bAssetAddresses[testData.outputIndex],
                                        cv(testData.inputQty),
                                    ),
                                ).to.be.revertedWith("Exceeds weight limits")
                            })
                        } else {
                            it(`swaps ${testData.inputQty.toString()} ${testData.inputIndex} for ${testData.outputIndex}`, async () => {
                                const expectedOutput = await zAsset.getSwapOutput(
                                    bAssetAddresses[testData.inputIndex],
                                    bAssetAddresses[testData.outputIndex],
                                    cv(testData.inputQty),
                                )
                                assertBNClose(expectedOutput, cv(testData.expectedQty), tolerance)

                                await zAsset.swap(
                                    bAssetAddresses[testData.inputIndex],
                                    bAssetAddresses[testData.outputIndex],
                                    cv(testData.inputQty),
                                    cv(testData.expectedQty).sub(tolerance),
                                    recipient,
                                )
                            })
                        }
                        break
                    case "redeem":
                        if (testData.hardLimitError) {
                            it(`throws Max Weight error when redeeming ${testData.inputQty} zAssets for bAsset ${testData.inputIndex}`, async () => {
                                await expect(
                                    zAsset.redeem(bAssetAddresses[testData.inputIndex], testData.inputQty, 0, recipient),
                                ).to.be.revertedWith("Exceeds weight limits")
                                await expect(
                                    zAsset.getRedeemOutput(bAssetAddresses[testData.inputIndex], testData.inputQty),
                                ).to.be.revertedWith("Exceeds weight limits")
                            })
                        } else if (testData.insufficientLiquidityError) {
                            it(`throws insufficient liquidity error when redeeming ${testData.inputQty} zAssets for bAsset ${testData.inputIndex}`, async () => {
                                await expect(
                                    zAsset.redeem(bAssetAddresses[testData.inputIndex], testData.inputQty, 0, recipient),
                                ).to.be.revertedWith("VM Exception")
                                await expect(
                                    zAsset.getRedeemOutput(bAssetAddresses[testData.inputIndex], testData.inputQty),
                                ).to.be.revertedWith("VM Exception")
                            })
                        } else {
                            it(`redeem ${testData.inputQty} zAssets for bAsset ${testData.inputIndex}`, async () => {
                                const expectedOutput = await zAsset.getRedeemOutput(bAssetAddresses[testData.inputIndex], testData.inputQty)
                                assertBNClose(expectedOutput, cv(testData.expectedQty), tolerance)

                                await zAsset.redeem(
                                    bAssetAddresses[testData.inputIndex],
                                    testData.inputQty,
                                    cv(testData.expectedQty).sub(tolerance),
                                    recipient,
                                )
                            })
                        }
                        break
                    case "redeemZasset":
                        {
                            const qtys = testData.expectedQtys.map((b) => cv(b).sub(5))
                            if (testData.insufficientLiquidityError) {
                                it(`throws throw insufficient liquidity error when redeeming ${testData.inputQty} zAsset`, async () => {
                                    await expect(zAsset.redeemZasset(cv(testData.inputQty), qtys, recipient)).to.be.revertedWith(
                                        "VM Exception",
                                    )
                                })
                            } else if (testData.hardLimitError) {
                                it(`throws Max Weight error when redeeming ${qtys} bAssets`, async () => {
                                    await expect(zAsset.redeemZasset(cv(testData.inputQty), qtys, recipient)).to.be.revertedWith(
                                        "Exceeds weight limits",
                                    )
                                    throw new Error("invalid exception")
                                })
                            } else {
                                it(`redeem ${testData.inputQty} zAssets for proportionate bAssets`, async () => {
                                    await zAsset.redeemZasset(cv(testData.inputQty), qtys, recipient)
                                })
                            }
                        }
                        break
                    case "redeemBassets":
                        {
                            const qtys = testData.inputQtys.map((b) => cv(b))

                            if (testData.insufficientLiquidityError) {
                                it(`throws throw insufficient liquidity error when redeeming ${qtys} bAssets`, async () => {
                                    await expect(zAsset.redeemExactBassets(bAssetAddresses, qtys, 100, recipient)).to.be.revertedWith(
                                        "VM Exception",
                                    )
                                    await expect(zAsset.getRedeemExactBassetsOutput(bAssetAddresses, qtys)).to.be.revertedWith(
                                        "VM Exception",
                                    )
                                })
                            } else if (testData.hardLimitError) {
                                it(`throws Max Weight error when redeeming ${qtys} bAssets`, async () => {
                                    await expect(zAsset.redeemExactBassets(bAssetAddresses, qtys, 100, recipient)).to.be.revertedWith(
                                        "Exceeds weight limits",
                                    )
                                    await expect(zAsset.getRedeemExactBassetsOutput(bAssetAddresses, qtys)).to.be.revertedWith(
                                        "Exceeds weight limits",
                                    )
                                })
                            } else {
                                it(`redeem ${qtys} bAssets`, async () => {
                                    const expectedOutput = await zAsset.getRedeemExactBassetsOutput(bAssetAddresses, qtys)
                                    const testDataOutput = cv(testData.expectedQty).add(cv(testData.swapFee))
                                    assertBNClose(expectedOutput, testDataOutput, tolerance)

                                    await zAsset.redeemExactBassets(bAssetAddresses, qtys, testDataOutput.add(tolerance), recipient)

                                    const dataMid = await getData(zAsset)
                                    assertBNClose(dataBefore.totalSupply.sub(dataMid.totalSupply), expectedOutput, tolerance)
                                })
                            }
                        }
                        break
                    default:
                        throw Error("unknown action")
                }

                it("holds invariant after action", async () => {
                    const dataEnd = await getData(zAsset)
                    // 1. Check resulting reserves
                    if (testData.reserves) {
                        dataEnd.vaultBalances.map((vb, i) => assertBNClose(vb, cv(testData.reserves[i]), BN.from(1000)))
                    }
                    // 2. Check swap fee accrual
                    if (testData.swapFee) {
                        assertBNClose(
                            dataEnd.surplus,
                            dataBefore.surplus.add(cv(testData.swapFee)),
                            2,
                            "Swap fees should accrue accurately after each action",
                        )
                    }
                    // 3. Check that invariant holds: `totalSupply + surplus = k = invariant(reserves)`
                    //    After each action, this property should hold true, proving 100% that mint/swap/redeem hold,
                    //    and fees are being paid 100% accurately. This should show that the redeemBasset holds.
                    assertBNSlightlyGT(
                        dataEnd.priceData.k,
                        dataEnd.surplus.add(dataEnd.totalSupply),
                        BN.from(1000000000000),
                        false,
                        "K does not hold",
                    )
                    //    The dust collected should always increase in favour of the system
                    const newKDiff = dataEnd.priceData.k.sub(dataEnd.surplus.add(dataEnd.totalSupply))
                    const cachedLastDiff = lastKDiff
                    lastKDiff = newKDiff
                    if (testData.type !== "redeemZasset") {
                        // 50 base unit tolerance on dust increase
                        expect(newKDiff, "Dust can only accumulate in favour of the system").gte(cachedLastDiff.sub(50))
                    } else if (newKDiff < cachedLastDiff) {
                        assertBNClose(newKDiff, cachedLastDiff, BN.from(200), "K dust accrues on redeemZasset")
                    }
                })
            })
        }
    })
})
