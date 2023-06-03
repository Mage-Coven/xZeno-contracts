import { ethers } from "hardhat"
import { expect } from "chai"

import { simpleToExactAmount, BN } from "@utils/math"
import { MAX_UINT256, ZERO_ADDRESS } from "@utils/constants"
import {
    ExposedFeederPool,
    ExposedFeederPool__factory,
    ExposedZasset,
    FeederLogic__factory,
    MockERC20,
    FeederManager__factory,
    Zasset,
} from "types/generated"
import { assertBNClose } from "@utils/assertions"
import { ZassetMachine, StandardAccounts } from "@utils/machines"
import { crossData } from "@utils/validator-data"

const { integrationData } = crossData

// NOTE - CONFIG
// This must mimic the test data and be input manually
const config = {
    a: BN.from(300),
    limits: {
        min: simpleToExactAmount(20, 16),
        max: simpleToExactAmount(80, 16),
    },
}
const zassetA = 120
const maxAction = 100
const feederFees = { swap: simpleToExactAmount(8, 14), redeem: simpleToExactAmount(6, 14), gov: simpleToExactAmount(1, 17) }
const zAssetFees = { swap: simpleToExactAmount(6, 14), redeem: simpleToExactAmount(3, 14) }

const ratio = simpleToExactAmount(1, 8)
const tolerance = BN.from(20)
const cv = (n: number | string): BN => BN.from(BigInt(n).toString())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMPReserves = (data: any) =>
    [0, 1, 2, 3, 4, 5]
        .filter((i) => data[`mpAssetReserve${i}`])
        .map((i) => ({
            ratio,
            vaultBalance: cv(data[`mpAssetReserve${i}`]),
        }))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFPReserves = (data: any) =>
    [data.feederPoolZAssetReserve, data.feederPoolFAssetReserve].map((r) => ({
        ratio,
        vaultBalance: cv(r),
    }))

const runLongTests = process.env.LONG_TESTS === "true"

interface Data {
    fp: {
        totalSupply: BN
        vaultBalances: BN[]
        value: {
            price: BN
            k: BN
        }
    }
    zAsset: {
        totalSupply: BN
        vaultBalances: BN[]
    }
}
const getData = async (_feederPool: ExposedFeederPool, _zAsset: Zasset | ExposedZasset): Promise<Data> => ({
    fp: {
        totalSupply: (await _feederPool.totalSupply()).add((await _feederPool.data()).pendingFees),
        vaultBalances: (await _feederPool.getBassets())[1].map((b) => b[1]),
        value: await _feederPool.getPrice(),
    },
    zAsset: {
        totalSupply: (await _zAsset.getConfig()).supply, // gets the total supply plus any surplus
        vaultBalances: (await _zAsset.getBassets())[1].map((b) => b[1]),
    },
})

describe("Cross swap - One basket many tests", () => {
    let feederPool: ExposedFeederPool
    let zAsset: Zasset | ExposedZasset
    let sa: StandardAccounts
    let recipient: string
    let fpAssetAddresses: string[]
    let mpAssetAddresses: string[]

    before(async () => {
        const accounts = await ethers.getSigners()
        const zAssetMachine = await new ZassetMachine().initAccounts(accounts)
        sa = zAssetMachine.sa
        recipient = await sa.default.address

        const zAssetDetails = await zAssetMachine.deployLite(zassetA)

        await zAssetDetails.zAsset.connect(sa.governor.signer).setFees(zAssetFees.swap, zAssetFees.redeem)

        const fAsset = await zAssetMachine.loadBassetProxy("Feeder Asset", "fAST", 18)
        const bAssets = [zAssetDetails.zAsset as MockERC20, fAsset]
        fpAssetAddresses = bAssets.map((b) => b.address)
        mpAssetAddresses = zAssetDetails.bAssets.map((b) => b.address)
        zAsset = zAssetDetails.zAsset

        const feederLogic = await new FeederLogic__factory(sa.default.signer).deploy()
        const manager = await new FeederManager__factory(sa.default.signer).deploy()
        const FeederFactory = (
            await ethers.getContractFactory("ExposedFeederPool", {
                libraries: {
                    FeederManager: manager.address,
                    FeederLogic: feederLogic.address,
                },
            })
        ).connect(sa.default.signer) as ExposedFeederPool__factory

        await zAssetMachine.seedWithWeightings(
            zAssetDetails,
            getMPReserves(integrationData).map((r) => r.vaultBalance),
            true,
        )

        feederPool = (await FeederFactory.deploy(zAssetDetails.nexus.address, bAssets[0].address)) as ExposedFeederPool
        await feederPool.initialize(
            "xZeno zBTC/bBTC Feeder",
            "bBTC fPool",
            {
                addr: bAssets[0].address,
                integrator: ZERO_ADDRESS,
                hasTxFee: false,
                status: 0,
            },
            {
                addr: bAssets[1].address,
                integrator: ZERO_ADDRESS,
                hasTxFee: false,
                status: 0,
            },
            mpAssetAddresses,
            config,
        )
        await feederPool.connect(sa.governor.signer).setFees(feederFees.swap, feederFees.redeem, feederFees.gov)
        await Promise.all(bAssets.map((b) => b.approve(feederPool.address, MAX_UINT256)))
        await Promise.all(zAssetDetails.bAssets.map((b) => b.approve(feederPool.address, MAX_UINT256)))

        const reserves = getFPReserves(integrationData)

        await feederPool.mintMulti(
            fpAssetAddresses,
            reserves.map((r) => r.vaultBalance),
            0,
            recipient,
        )
    })

    describe("Run all the data", () => {
        let dataBefore: Data
        let count = 0

        integrationData.actions.slice(0, runLongTests ? integrationData.actions.length : maxAction).forEach((testData) => {
            describe(`Action ${(count += 1)}`, () => {
                before(async () => {
                    dataBefore = await getData(feederPool, zAsset)
                })
                switch (testData.type) {
                    case "mint":
                        if (testData.hardLimitError) {
                            it(`throws Max Weight error when minting ${testData.inputQty.toString()} mpAsset with index ${
                                testData.inputIndex
                            }`, async () => {
                                await expect(
                                    feederPool.mint(mpAssetAddresses[testData.inputIndex], cv(testData.inputQty), 0, recipient),
                                ).to.be.revertedWith("Exceeds weight limits")

                                await expect(
                                    feederPool.getMintOutput(mpAssetAddresses[testData.inputIndex], cv(testData.inputQty)),
                                ).to.be.revertedWith("Exceeds weight limits")
                            })
                        } else {
                            it(`should deposit ${testData.inputQty.toString()} mpAsset with index ${testData.inputIndex}`, async () => {
                                const expectedOutput = await feederPool.getMintOutput(
                                    mpAssetAddresses[testData.inputIndex],
                                    cv(testData.inputQty),
                                )
                                assertBNClose(expectedOutput, cv(testData.outputQty), tolerance)

                                await feederPool.mint(
                                    mpAssetAddresses[testData.inputIndex],
                                    cv(testData.inputQty),
                                    cv(testData.outputQty).sub(tolerance),
                                    recipient,
                                )

                                const dataMid = await getData(feederPool, zAsset)
                                assertBNClose(dataMid.fp.totalSupply.sub(dataBefore.fp.totalSupply), expectedOutput, tolerance)
                            })
                        }
                        break
                    case "swap_mp_to_fp":
                        if (testData.hardLimitError) {
                            it(`throws Max Weight error when swapping ${testData.inputQty.toString()} ${
                                testData.inputIndex
                            } for fAsset`, async () => {
                                await expect(
                                    feederPool.swap(
                                        mpAssetAddresses[testData.inputIndex],
                                        fpAssetAddresses[1],
                                        cv(testData.inputQty),
                                        0,
                                        recipient,
                                    ),
                                ).to.be.revertedWith("Exceeds weight limits")
                                await expect(
                                    feederPool.getSwapOutput(
                                        mpAssetAddresses[testData.inputIndex],
                                        fpAssetAddresses[1],
                                        cv(testData.inputQty),
                                    ),
                                ).to.be.revertedWith("Exceeds weight limits")
                            })
                        } else {
                            it(`swaps ${testData.inputQty.toString()} ${testData.inputIndex} for fAsset`, async () => {
                                const expectedOutput = await feederPool.getSwapOutput(
                                    mpAssetAddresses[testData.inputIndex],
                                    fpAssetAddresses[1],
                                    cv(testData.inputQty),
                                )
                                assertBNClose(expectedOutput, cv(testData.outputQty), tolerance)

                                await feederPool.swap(
                                    mpAssetAddresses[testData.inputIndex],
                                    fpAssetAddresses[1],
                                    cv(testData.inputQty),
                                    cv(testData.outputQty).sub(tolerance),
                                    recipient,
                                )
                            })
                        }
                        break
                    case "swap_fp_to_mp":
                        if (testData.hardLimitError) {
                            it(`throws Max Weight error when swapping ${testData.inputQty.toString()} fAsset for ${
                                testData.outputIndex
                            }`, async () => {
                                await expect(
                                    feederPool.swap(
                                        fpAssetAddresses[1],
                                        mpAssetAddresses[testData.outputIndex],
                                        cv(testData.inputQty),
                                        0,
                                        recipient,
                                    ),
                                ).to.be.revertedWith("Exceeds weight limits")
                                await expect(
                                    feederPool.getSwapOutput(
                                        fpAssetAddresses[1],
                                        mpAssetAddresses[testData.outputIndex],
                                        cv(testData.inputQty),
                                    ),
                                ).to.be.revertedWith("Exceeds weight limits")
                            })
                        } else {
                            it(`swaps ${testData.inputQty.toString()} fAsset for ${testData.outputIndex}`, async () => {
                                const expectedOutput = await feederPool.getSwapOutput(
                                    fpAssetAddresses[1],
                                    mpAssetAddresses[testData.outputIndex],
                                    cv(testData.inputQty),
                                )
                                assertBNClose(expectedOutput, cv(testData.outputQty), tolerance)

                                await feederPool.swap(
                                    fpAssetAddresses[1],
                                    mpAssetAddresses[testData.outputIndex],
                                    cv(testData.inputQty),
                                    cv(testData.outputQty).sub(tolerance),
                                    recipient,
                                )
                            })
                        }
                        break
                    case "redeem":
                        if (testData.hardLimitError) {
                            it(`throws Max Weight error when redeeming ${testData.inputQty} zAssets for mpAsset ${testData.outputIndex}`, async () => {
                                await expect(
                                    feederPool.redeem(mpAssetAddresses[testData.outputIndex], testData.inputQty, 0, recipient),
                                ).to.be.revertedWith("Exceeds weight limits")
                                await expect(
                                    feederPool.getRedeemOutput(mpAssetAddresses[testData.outputIndex], testData.inputQty),
                                ).to.be.revertedWith("Exceeds weight limits")
                            })
                        } else if (testData.insufficientLiquidityError) {
                            it(`throws insufficient liquidity error when redeeming ${testData.inputQty} zAssets for bAsset ${testData.outputIndex}`, async () => {
                                await expect(
                                    feederPool.redeem(mpAssetAddresses[testData.outputIndex], testData.inputQty, 0, recipient),
                                ).to.be.revertedWith("VM Exception")
                                await expect(
                                    feederPool.getRedeemOutput(mpAssetAddresses[testData.outputIndex], testData.inputQty),
                                ).to.be.revertedWith("VM Exception")
                            })
                        } else {
                            it(`redeem ${testData.inputQty} zAssets for bAsset ${testData.outputIndex}`, async () => {
                                const expectedOutput = await feederPool.getRedeemOutput(
                                    mpAssetAddresses[testData.outputIndex],
                                    testData.inputQty,
                                )
                                assertBNClose(expectedOutput, cv(testData.outputQty), tolerance)

                                await feederPool.redeem(
                                    mpAssetAddresses[testData.outputIndex],
                                    testData.inputQty,
                                    cv(testData.outputQty).sub(tolerance),
                                    recipient,
                                )
                            })
                        }
                        break
                    default:
                        throw Error("unknown action")
                }

                it("holds invariant after action", async () => {
                    const dataEnd = await getData(feederPool, zAsset)
                    // 1. Check resulting reserves
                    if (testData.fpReserves) {
                        dataEnd.fp.vaultBalances.map((vb, i) => assertBNClose(vb, cv(testData.fpReserves[i]), BN.from(1000)))
                    }
                    if (testData.mpReserves) {
                        dataEnd.zAsset.vaultBalances.map((vb, i) => assertBNClose(vb, cv(testData.mpReserves[i]), BN.from(1000)))
                    }
                    // 2. Price always goes up
                    expect(dataEnd.fp.value.price, "fpToken price should always go up").gte(dataBefore.fp.value.price)
                    // 3. Supply checks out
                    if (testData.LPTokenSupply) {
                        assertBNClose(dataEnd.fp.totalSupply, cv(testData.LPTokenSupply), 100, "Total supply should check out")
                    }
                    if (testData.zAssetSupply) {
                        assertBNClose(dataEnd.zAsset.totalSupply, cv(testData.zAssetSupply), 100, "Total supply should check out")
                    }
                })
            })
        })
    })
})
