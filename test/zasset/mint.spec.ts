import { expect } from "chai"
import { Signer } from "ethers"
import { ethers } from "hardhat"

import { assertBasketIsHealthy, assertBNClosePercent, assertBNSlightlyGTPercent } from "@utils/assertions"
import { applyRatio, BN, simpleToExactAmount } from "@utils/math"
import { ZassetDetails, ZassetMachine, StandardAccounts } from "@utils/machines"
import { BassetStatus } from "@utils/xzeno-objects"
import { ZERO_ADDRESS } from "@utils/constants"
import { Zasset, MockERC20 } from "types/generated"
import { Account } from "types"

interface MintOutput {
    zAssets: BN
    senderBassetBalBefore: BN
    senderBassetBalAfter: BN
    recipientBalBefore: BN
    recipientBalAfter: BN
}

describe("Zasset - Mint", () => {
    let sa: StandardAccounts
    let zAssetMachine: ZassetMachine

    let details: ZassetDetails

    const runSetup = async (seedBasket = true, useTransferFees = false, useLendingMarkets = false): Promise<void> => {
        details = await zAssetMachine.deployZasset(useLendingMarkets, useTransferFees)
        if (seedBasket) {
            await zAssetMachine.seedWithWeightings(details, [25, 25, 25, 25])
        }
    }

    before("Init contract", async () => {
        const accounts = await ethers.getSigners()
        zAssetMachine = await new ZassetMachine().initAccounts(accounts)
        sa = zAssetMachine.sa

        await runSetup()
    })

    const assertFailedMint = async (
        expectedReason: string,
        zAssetContract: Zasset,
        bAsset: MockERC20,
        bAssetQuantity: BN | number | string,
        minZassetQuantity: BN | number | string = 0,
        approval = true,
        sender: Signer = sa.default.signer,
        recipient: string = sa.default.address,
        mintOutputRevertExpected = true,
        mintOutputExpected: BN | number | string = 0,
        quantitiesAreExact = false,
    ): Promise<void> => {
        const zAsset = zAssetContract.connect(sender)
        if (approval) {
            await zAssetMachine.approveZasset(bAsset, zAsset, bAssetQuantity, sender, quantitiesAreExact)
        }

        const bAssetDecimals = await bAsset.decimals()
        const bAssetQuantityExact = quantitiesAreExact ? BN.from(bAssetQuantity) : simpleToExactAmount(bAssetQuantity, bAssetDecimals)
        const minZassetQuantityExact = quantitiesAreExact ? BN.from(minZassetQuantity) : simpleToExactAmount(minZassetQuantity, 18)

        await expect(
            zAsset.mint(bAsset.address, bAssetQuantityExact, minZassetQuantityExact, recipient),
            `mint tx should revert with "${expectedReason}"`,
        ).to.be.revertedWith(expectedReason)

        if (mintOutputRevertExpected) {
            await expect(
                zAsset.getMintOutput(bAsset.address, bAssetQuantityExact),
                `getMintOutput call should revert with "${expectedReason}"`,
            ).to.be.revertedWith(expectedReason)
        } else {
            const mintOutputExpectedExact = quantitiesAreExact ? BN.from(mintOutputExpected) : simpleToExactAmount(mintOutputExpected, 18)
            const output = await zAsset.getMintOutput(bAsset.address, bAssetQuantityExact)
            expect(output, "getMintOutput call output").eq(mintOutputExpectedExact)
        }
    }

    const assertFailedMintMulti = async (
        expectedReason: string,
        zAssetContract: Zasset,
        bAssets: (MockERC20 | string)[],
        bAssetRedeemQuantities: (BN | number | string)[],
        minZassetQuantity: BN | number | string = 0,
        approval = true,
        sender: Signer = sa.default.signer,
        recipient: string = sa.default.address,
        mintMultiOutputRevertExpected = true,
        outputExpected: BN | number | string = 0,
        quantitiesAreExact = false,
    ): Promise<void> => {
        const zAsset = zAssetContract.connect(sender)
        if (approval) {
            const approvePromises = bAssets.map((b, i) =>
                typeof b === "string"
                    ? Promise.resolve(BN.from(0))
                    : zAssetMachine.approveZasset(b, zAsset, bAssetRedeemQuantities[i], sender, quantitiesAreExact),
            )
            await Promise.all(approvePromises)
        }

        const bAssetAddresses = bAssets.map((bAsset) => (typeof bAsset === "string" ? bAsset : bAsset.address))
        const bAssetsDecimals = await Promise.all(
            bAssets.map((bAsset) => (typeof bAsset === "string" ? Promise.resolve(18) : bAsset.decimals())),
        )

        // Convert to exact quantities
        const bAssetRedeemQuantitiesExact = quantitiesAreExact
            ? bAssetRedeemQuantities.map((q) => BN.from(q))
            : bAssetRedeemQuantities.map((q, i) => simpleToExactAmount(q, bAssetsDecimals[i]))
        const minZassetQuantityExact = quantitiesAreExact ? BN.from(minZassetQuantity) : simpleToExactAmount(minZassetQuantity, 18)

        await expect(
            zAsset.mintMulti(bAssetAddresses, bAssetRedeemQuantitiesExact, minZassetQuantityExact, recipient),
            `mintMulti tx should revert with "${expectedReason}"`,
        ).to.be.revertedWith(expectedReason)

        if (mintMultiOutputRevertExpected) {
            await expect(
                zAsset.getMintMultiOutput(bAssetAddresses, bAssetRedeemQuantitiesExact),
                `getMintMultiOutput call should revert with "${expectedReason}"`,
            ).to.be.revertedWith(expectedReason)
        } else {
            const outputExpectedExact = quantitiesAreExact ? BN.from(outputExpected) : simpleToExactAmount(outputExpected, 18)
            const output = await zAsset.getMintMultiOutput(bAssetAddresses, bAssetRedeemQuantitiesExact)
            expect(output, "getMintMultiOutput call output").eq(outputExpectedExact)
        }
    }

    // Helper to assert basic minting conditions, i.e. balance before and after
    const assertBasicMint = async (
        md: ZassetDetails,
        bAsset: MockERC20,
        bAssetQuantity: BN | number | string,
        minZassetQuantity: BN | number | string = 0,
        recipient: string = sa.default.address,
        sender: Account = sa.default,
        ignoreHealthAssertions = true,
        quantitiesAreExact = false,
    ): Promise<MintOutput> => {
        const { platform } = md
        const zAsset = md.zAsset.connect(sender.signer)
        if (!ignoreHealthAssertions) await assertBasketIsHealthy(zAssetMachine, md)

        // Get before balances
        const senderBassetBalBefore = await bAsset.balanceOf(sender.address)
        const recipientBalBefore = await zAsset.balanceOf(recipient)
        const bAssetBefore = await zAssetMachine.getBasset(details, bAsset.address)

        // Convert to exact quantities
        const bAssetQuantityExact = quantitiesAreExact
            ? BN.from(bAssetQuantity)
            : simpleToExactAmount(bAssetQuantity, await bAsset.decimals())
        const minZassetQuantityExact = quantitiesAreExact ? BN.from(minZassetQuantity) : simpleToExactAmount(minZassetQuantity, 18)
        const zAssetQuantityExact = applyRatio(bAssetQuantityExact, bAssetBefore.ratio)

        const platformInteraction = await ZassetMachine.getPlatformInteraction(zAsset, "deposit", bAssetQuantityExact, bAssetBefore)
        const integratorBalBefore = await bAssetBefore.contract.balanceOf(
            bAssetBefore.integrator ? bAssetBefore.integratorAddr : zAsset.address,
        )

        await zAssetMachine.approveZasset(bAsset, zAsset, bAssetQuantityExact, sender.signer, quantitiesAreExact)

        const zAssetOutput = await zAsset.getMintOutput(bAsset.address, bAssetQuantityExact)
        assertBNClosePercent(zAssetOutput, zAssetQuantityExact, "0.02", "zAssetOutput")

        const tx = zAsset.mint(bAsset.address, bAssetQuantityExact, minZassetQuantityExact, recipient)

        // Minted event
        await expect(tx, "Minted event")
            .to.emit(zAsset, "Minted")
            .withArgs(sender.address, recipient, zAssetOutput, bAsset.address, bAssetQuantityExact)
        // const { events } = await (await tx).wait()
        // const mintedEvent = events.find((e) => e.event === "Minted")
        // expect(mintedEvent.args[0]).to.eq(sender.address)
        // expect(mintedEvent.args[1]).to.eq(recipient)
        // expect(mintedEvent.args[2]).to.eq(zAssetOutput)
        // expect(mintedEvent.args[3]).to.eq(bAsset.address)
        // expect(mintedEvent.args[4]).to.eq(bAssetQuantityExact)

        // Transfers to lending platform
        await expect(tx, "Transfer event")
            .to.emit(bAsset, "Transfer")
            .withArgs(sender.address, bAssetBefore.integrator ? bAssetBefore.integratorAddr : zAsset.address, bAssetQuantityExact)

        // Deposits into lending platform
        const integratorBalAfter = await bAssetBefore.contract.balanceOf(
            bAssetBefore.integrator ? bAssetBefore.integratorAddr : zAsset.address,
        )
        expect(integratorBalAfter, "integratorBalAfter").eq(integratorBalBefore.add(bAssetQuantityExact))
        if (platformInteraction.expectInteraction) {
            await expect(tx).to.emit(platform, "Deposit").withArgs(bAsset.address, bAssetBefore.pToken, platformInteraction.amount)
        }

        // Recipient should have zAsset quantity after
        const recipientBalAfter = await zAsset.balanceOf(recipient)
        expect(recipientBalAfter, "recipientBal after").eq(recipientBalBefore.add(zAssetOutput))
        // Sender should have less bAsset after
        const senderBassetBalAfter = await bAsset.balanceOf(sender.address)
        expect(senderBassetBalAfter, "senderBassetBal after").eq(senderBassetBalBefore.sub(bAssetQuantityExact))
        // VaultBalance should update for this bAsset
        const bAssetAfter = await zAsset.getBasset(bAsset.address)
        expect(BN.from(bAssetAfter.bData.vaultBalance), "vaultBalance after").eq(
            BN.from(bAssetBefore.vaultBalance).add(bAssetQuantityExact),
        )

        // Complete basket should remain in healthy state
        if (!ignoreHealthAssertions) await assertBasketIsHealthy(zAssetMachine, md)
        return {
            zAssets: zAssetQuantityExact,
            senderBassetBalBefore,
            senderBassetBalAfter,
            recipientBalBefore,
            recipientBalAfter,
        }
    }

    describe("minting with a single bAsset", () => {
        context("when the weights are within the ForgeValidator limit", () => {
            context("using bAssets with no transfer fees", async () => {
                before("reset", async () => {
                    await runSetup()
                })
                it("should send zUSD when recipient is a contract", async () => {
                    const { bAssets, managerLib } = details
                    const recipient = managerLib.address
                    await assertBasicMint(details, bAssets[0], 1, 0, recipient)
                })
                it("should send zUSD when the recipient is an EOA", async () => {
                    const { bAssets } = details
                    const recipient = sa.dummy1.address
                    await assertBasicMint(details, bAssets[1], 1, 0, recipient)
                })
                it("should mint zAssets to 18 decimals from 1 base bAsset unit with 12 decimals", async () => {
                    const bAsset = details.bAssets[2]
                    const decimals = await bAsset.decimals()
                    expect(decimals).eq(12)

                    const result = await assertBasicMint(details, bAsset, 1, 0, sa.default.address, sa.default, false, true)
                    expect(result.zAssets).to.eq("1000000") // 18 - 12 = 6 decimals
                })
                it("should mint zAssets to 18 decimals from 2 base bAsset units with 6 decimals", async () => {
                    const bAsset = details.bAssets[1]
                    const decimals = await bAsset.decimals()
                    expect(decimals).eq(6)

                    const result = await assertBasicMint(details, bAsset, 2, 0, sa.default.address, sa.default, false, true)
                    expect(result.zAssets).to.eq("2000000000000") // 18 - 6 = 12 decimals
                })
            })
            context("using bAssets with transfer fees", async () => {
                before(async () => {
                    await runSetup(true, true, true)
                })
                it("should handle tokens with transfer fees", async () => {
                    const { bAssets, zAsset, platform } = details
                    await assertBasketIsHealthy(zAssetMachine, details)

                    // 1.0 Assert bAsset has fee
                    const bAsset = bAssets[3]
                    const basket = await zAssetMachine.getBasketComposition(details)
                    expect(basket.bAssets[3].isTransferFeeCharged).to.eq(true)

                    // 2.0 Get balances
                    const minterBassetBalBefore = await bAsset.balanceOf(sa.default.address)
                    const recipient = sa.dummy3
                    const recipientBalBefore = await zAsset.balanceOf(recipient.address)
                    expect(recipientBalBefore).eq(0)
                    const zAssetMintAmount = 10
                    const approval0: BN = await zAssetMachine.approveZasset(bAsset, zAsset, zAssetMintAmount)
                    // 3.0 Do the mint
                    const tx = zAsset.mint(bAsset.address, approval0, 0, recipient.address)

                    const zAssetQuantity = simpleToExactAmount(zAssetMintAmount, 18)
                    const bAssetQuantity = simpleToExactAmount(zAssetMintAmount, await bAsset.decimals())

                    // take 0.1% off for the transfer fee = amount * (1 - 0.001)
                    const bAssetAmountLessFee = bAssetQuantity.mul(999).div(1000)
                    // 3.1 Check Transfers to lending platform
                    await expect(tx).to.emit(bAsset, "Transfer").withArgs(sa.default.address, platform.address, bAssetAmountLessFee)
                    // 3.2 Check Deposits into lending platform
                    await expect(tx)
                        .to.emit(platform, "Deposit")
                        .withArgs(bAsset.address, await platform.bAssetToPToken(bAsset.address), bAssetAmountLessFee)
                    // 4.0 Recipient should have zAsset quantity after
                    const recipientBalAfter = await zAsset.balanceOf(recipient.address)
                    // Assert that we minted gt 99% of the bAsset
                    assertBNSlightlyGTPercent(recipientBalBefore.add(zAssetQuantity), recipientBalAfter, "0.3", true)
                    // Sender should have less bAsset after
                    const minterBassetBalAfter = await bAsset.balanceOf(sa.default.address)
                    expect(minterBassetBalAfter, "minterBassetBalAfter").eq(minterBassetBalBefore.sub(bAssetQuantity))
                })
                it("should fail if the token charges a fee but we don't know about it", async () => {
                    const { bAssets, zAsset } = details
                    await assertBasketIsHealthy(zAssetMachine, details)

                    // 1.0 Assert bAsset has fee
                    const bAsset = bAssets[3]
                    const basket = await zAssetMachine.getBasketComposition(details)
                    expect(basket.bAssets[3].isTransferFeeCharged).to.eq(true)
                    await zAsset.connect(sa.governor.signer).setTransferFeesFlag(bAsset.address, false)

                    // 2.0 Get balances
                    const zAssetMintAmount = 10
                    const approval0: BN = await zAssetMachine.approveZasset(bAsset, zAsset, zAssetMintAmount)
                    // 3.0 Do the mint
                    await expect(zAsset.mint(bAsset.address, approval0, 0, sa.default.address)).to.revertedWith(
                        "Asset not fully transferred",
                    )
                })
            })
            context("with an affected bAsset", async () => {
                it("should fail if bAsset is broken below peg", async () => {
                    const { bAssets, zAsset } = details
                    await assertBasketIsHealthy(zAssetMachine, details)

                    const bAsset = bAssets[0]
                    await zAsset.connect(sa.governor.signer).handlePegLoss(bAsset.address, true)
                    const newBasset = await zAsset.getBasset(bAsset.address)
                    expect(newBasset.personal.status).to.eq(BassetStatus.BrokenBelowPeg)
                    await assertFailedMint(
                        "Unhealthy",
                        zAsset,
                        bAsset,
                        "1000000000000000000",
                        0,
                        true,
                        sa.default.signer,
                        sa.default.address,
                        false,
                        "1000746841283429855",
                        true,
                    )
                })
            })
            context("passing invalid arguments", async () => {
                before(async () => {
                    await runSetup()
                })
                it("should fail if recipient is 0x0", async () => {
                    const { zAsset, bAssets } = details
                    await assertFailedMint(
                        "Invalid recipient",
                        zAsset,
                        bAssets[0],
                        "1000000000000000000",
                        0,
                        true,
                        sa.default.signer,
                        ZERO_ADDRESS,
                        false,
                        "999854806326923450",
                        true,
                    )
                })
                it("should revert when 0 quantities", async () => {
                    const { bAssets, zAsset } = details
                    await assertFailedMint("Qty==0", zAsset, bAssets[0], 0)
                })
                it("should fail if sender doesn't have balance", async () => {
                    const { bAssets, zAsset } = details
                    const bAsset = bAssets[0]
                    const sender = sa.dummy1
                    expect(await bAsset.balanceOf(sender.address)).eq(0)
                    await assertFailedMint(
                        "ERC20: transfer amount exceeds balance",
                        zAsset,
                        bAsset,
                        "100000000000000000000",
                        "99000000000000000000",
                        true,
                        sender.signer,
                        sender.address,
                        false,
                        "98939327585405193936",
                        true,
                    )
                })
                it("should fail if sender doesn't give approval", async () => {
                    const { bAssets, zAsset } = details
                    const bAsset = bAssets[0]
                    const sender = sa.dummy2
                    await bAsset.transfer(sender.address, 10000)
                    expect(await bAsset.allowance(sender.address, zAsset.address)).eq(0)
                    expect(await bAsset.balanceOf(sender.address)).eq(10000)
                    await assertFailedMint(
                        "ERC20: transfer amount exceeds allowance",
                        zAsset,
                        bAsset,
                        100,
                        99,
                        false,
                        sender.signer,
                        sender.address,
                        false,
                        100,
                        true,
                    )
                })
                it("should fail if the bAsset does not exist", async () => {
                    const { zAsset } = details
                    const newBasset = await zAssetMachine.loadBassetProxy("Mock", "MKK", 18, sa.default.address, 1000)
                    await assertFailedMint("Invalid asset", zAsset, newBasset, 1)
                })
            })
            context("should mint single bAsset", () => {
                const indexes = [0, 1, 2, 3]
                indexes.forEach((i) => {
                    it(`should mint single bAsset[${i}]`, async () => {
                        await assertBasicMint(details, details.bAssets[i], 1)
                    })
                })
            })
        })
    })
    describe("minting with multiple bAssets", () => {
        // Helper to assert basic minting conditions, i.e. balance before and after
        const assertMintMulti = async (
            md: ZassetDetails,
            zAssetMintAmounts: Array<BN | number>,
            bAssets: Array<MockERC20>,
            recipient: string = sa.default.address,
            sender: Account = sa.default,
            ignoreHealthAssertions = false,
        ): Promise<void> => {
            const { zAsset } = md

            if (!ignoreHealthAssertions) await assertBasketIsHealthy(zAssetMachine, md)

            const minterBassetBalBefore = await Promise.all(bAssets.map((b) => b.balanceOf(sender.address)))
            const recipientBalBefore = await zAsset.balanceOf(recipient)
            const bAssetDecimals = await Promise.all(bAssets.map((b) => b.decimals()))
            const bAssetBefore = await Promise.all(bAssets.map((b) => zAsset.getBasset(b.address)))
            const approvals: Array<BN> = await Promise.all(
                bAssets.map((b, i) => zAssetMachine.approveZasset(b, zAsset, zAssetMintAmounts[i])),
            )

            const zAssetOutput = await zAsset.getMintMultiOutput(
                bAssetBefore.map((b) => b.personal.addr),
                approvals,
            )
            const zAssetQuantity = simpleToExactAmount(
                zAssetMintAmounts.reduce((p, c) => BN.from(p).add(BN.from(c)), BN.from(0)),
                18,
            )
            assertBNClosePercent(zAssetOutput, zAssetQuantity, "0.25", "zAssetOutput")

            const tx = zAsset.connect(sender.signer).mintMulti(
                bAssetBefore.map((b) => b.personal.addr),
                approvals,
                0,
                recipient,
            )

            await expect(tx)
                .to.emit(zAsset, "MintedMulti")
                .withArgs(
                    sender.address,
                    recipient,
                    zAssetOutput,
                    bAssetBefore.map((b) => b.personal.addr),
                    approvals,
                )

            const bAssetQuantities = zAssetMintAmounts.map((m, i) => simpleToExactAmount(m, bAssetDecimals[i]))
            // Recipient should have zAsset quantity after
            const recipientBalAfter = await zAsset.balanceOf(recipient)
            expect(recipientBalAfter, "recipientBalAfter").eq(recipientBalBefore.add(zAssetOutput))
            // Sender should have less bAsset after
            const minterBassetBalAfter = await Promise.all(bAssets.map((b) => b.balanceOf(sender.address)))
            minterBassetBalAfter.map((b, i) => expect(b, `minter bAsset ${i} bal`).eq(minterBassetBalBefore[i].sub(bAssetQuantities[i])))
            // VaultBalance should updated for this bAsset
            const bAssetAfter = await Promise.all(bAssets.map((b) => zAsset.getBasset(b.address)))
            bAssetAfter.map((b, i) =>
                expect(b.bData.vaultBalance, `vault balance ${i}`).eq(BN.from(bAssetBefore[i].bData.vaultBalance).add(bAssetQuantities[i])),
            )

            // Complete basket should remain in healthy state
            if (!ignoreHealthAssertions) await assertBasketIsHealthy(zAssetMachine, md)
        }

        before(async () => {
            await runSetup()
        })
        context("when the weights are within the ForgeValidator limit", () => {
            context("and sending to a specific recipient", async () => {
                before(async () => {
                    await runSetup()
                })
                it("should mint selected bAssets only", async () => {
                    const compBefore = await zAssetMachine.getBasketComposition(details)
                    await assertMintMulti(details, [5, 10], [details.bAssets[2], details.bAssets[0]])
                    const compAfter = await zAssetMachine.getBasketComposition(details)
                    expect(compBefore.bAssets[1].vaultBalance).eq(compAfter.bAssets[1].vaultBalance)
                    expect(compBefore.bAssets[3].vaultBalance).eq(compAfter.bAssets[3].vaultBalance)
                })
                it("should send zUSD when recipient is a contract", async () => {
                    const { bAssets, managerLib } = details
                    const recipient = managerLib.address
                    await assertMintMulti(details, [1], [bAssets[0]], recipient)
                })
                it("should send zUSD when the recipient is an EOA", async () => {
                    const { bAssets } = details
                    const recipient = sa.dummy1
                    await assertMintMulti(details, [1], [bAssets[0]], recipient.address)
                })
            })
            context("and specifying one bAsset base unit", async () => {
                before(async () => {
                    await runSetup()
                })
                it("should mint a higher q of zAsset base units when using bAsset with 18", async () => {
                    const { bAssets, zAsset } = details
                    const bAsset = bAssets[0]
                    const decimals = await bAsset.decimals()
                    expect(decimals).eq(18)

                    await bAsset.approve(zAsset.address, 1)

                    const minterBassetBalBefore = await bAsset.balanceOf(sa.default.address)
                    const recipientBalBefore = await zAsset.balanceOf(sa.default.address)

                    const tx = zAsset.mintMulti([bAsset.address], [1], 0, sa.default.address)
                    const expectedZasset = BN.from(10).pow(BN.from(18).sub(decimals))
                    await expect(tx)
                        .to.emit(zAsset, "MintedMulti")
                        .withArgs(sa.default.address, sa.default.address, expectedZasset, [bAsset.address], [1])
                    // Recipient should have zAsset quantity after
                    const recipientBalAfter = await zAsset.balanceOf(sa.default.address)
                    expect(recipientBalAfter).eq(recipientBalBefore.add(expectedZasset))
                    // Sender should have less bAsset after
                    const minterBassetBalAfter = await bAsset.balanceOf(sa.default.address)
                    expect(minterBassetBalAfter).eq(minterBassetBalBefore.sub(1))
                    // Complete basket should remain in healthy state
                    await assertBasketIsHealthy(zAssetMachine, details)
                })
            })
            context("using bAssets with transfer fees", async () => {
                before(async () => {
                    await runSetup(true, true, true)
                })
                it("should handle tokens with transfer fees", async () => {
                    const { bAssets, zAsset, platform } = details
                    await assertBasketIsHealthy(zAssetMachine, details)

                    // 1.0 Assert bAsset has fee
                    const bAsset = bAssets[3]
                    const basket = await zAssetMachine.getBasketComposition(details)
                    expect(basket.bAssets[3].isTransferFeeCharged).to.eq(true)

                    // 2.0 Get balances
                    const minterBassetBalBefore = await bAsset.balanceOf(sa.default.address)
                    const recipient = sa.dummy3
                    const recipientBalBefore = await zAsset.balanceOf(recipient.address)
                    expect(recipientBalBefore).eq(0)
                    const zAssetMintAmount = 10
                    const approval0: BN = await zAssetMachine.approveZasset(bAsset, zAsset, zAssetMintAmount)
                    // 3.0 Do the mint
                    const tx = zAsset.mintMulti([bAsset.address], [approval0], 0, recipient.address)

                    const zAssetQuantity = simpleToExactAmount(zAssetMintAmount, 18)
                    const bAssetQuantity = simpleToExactAmount(zAssetMintAmount, await bAsset.decimals())
                    // take 0.1% off for the transfer fee = amount * (1 - 0.001)
                    const bAssetAmountLessFee = bAssetQuantity.mul(999).div(1000)
                    const platformToken = await platform.bAssetToPToken(bAsset.address)
                    const lendingPlatform = await platform.platformAddress()
                    // 3.1 Check Transfers from sender to platform integration
                    await expect(tx).to.emit(bAsset, "Transfer").withArgs(sa.default.address, platform.address, bAssetAmountLessFee)
                    // 3.2 Check Transfers from platform integration to lending platform
                    await expect(tx).to.emit(bAsset, "Transfer").withArgs(
                        platform.address,
                        lendingPlatform,
                        bAssetAmountLessFee.mul(999).div(1000), // Take another 0.1% off the transfer value
                    )
                    // 3.3 Check Deposits into lending platform
                    await expect(tx).to.emit(platform, "Deposit").withArgs(bAsset.address, platformToken, bAssetAmountLessFee)
                    // 4.0 Recipient should have zAsset quantity after
                    const recipientBalAfter = await zAsset.balanceOf(recipient.address)
                    // Assert that we minted gt 99% of the bAsset
                    assertBNSlightlyGTPercent(recipientBalBefore.add(zAssetQuantity), recipientBalAfter, "0.3")
                    // Sender should have less bAsset after
                    const minterBassetBalAfter = await bAsset.balanceOf(sa.default.address)
                    expect(minterBassetBalAfter, "minterBassetBalAfter").eq(minterBassetBalBefore.sub(bAssetQuantity))

                    // Complete basket should remain in healthy state
                    await assertBasketIsHealthy(zAssetMachine, details)
                })
                it("should fail if the token charges a fee but we don't know about it", async () => {
                    const { bAssets, zAsset } = details
                    await assertBasketIsHealthy(zAssetMachine, details)

                    // 1.0 Assert bAsset has fee
                    const bAsset = bAssets[3]
                    const basket = await zAssetMachine.getBasketComposition(details)
                    expect(basket.bAssets[3].isTransferFeeCharged).to.eq(true)
                    await zAsset.connect(sa.governor.signer).setTransferFeesFlag(bAsset.address, false)

                    // 2.0 Get balances
                    const zAssetMintAmount = 10
                    const approval0: BN = await zAssetMachine.approveZasset(bAsset, zAsset, zAssetMintAmount)
                    // 3.0 Do the mint
                    await expect(zAsset.mintMulti([bAsset.address], [approval0], 0, sa.default.address)).to.revertedWith(
                        "Asset not fully transferred",
                    )
                })
            })
            context("with an affected bAsset", async () => {
                it("should fail if bAsset is broken below peg", async () => {
                    const { bAssets, zAsset } = details
                    await assertBasketIsHealthy(zAssetMachine, details)

                    const bAsset = bAssets[0]
                    await zAsset.connect(sa.governor.signer).handlePegLoss(bAsset.address, true)
                    const newBasset = await zAsset.getBasset(bAsset.address)
                    expect(newBasset.personal.status).to.eq(BassetStatus.BrokenBelowPeg)
                    await zAssetMachine.approveZasset(bAsset, zAsset, 1)
                    await assertFailedMintMulti(
                        "Unhealthy",
                        zAsset,
                        [bAsset.address],
                        ["1000000000000000000"],
                        0,
                        true,
                        sa.default.signer,
                        sa.default.address,
                        false,
                        "1000746841283429855",
                        true,
                    )
                })
            })
            context("passing invalid arguments", async () => {
                before(async () => {
                    await runSetup()
                })
                it("should fail if recipient is 0x0", async () => {
                    const { zAsset, bAssets } = details
                    await assertFailedMintMulti(
                        "Invalid recipient",
                        zAsset,
                        [bAssets[0].address],
                        [1],
                        0,
                        true,
                        sa.default.signer,
                        ZERO_ADDRESS,
                        false,
                        1,
                        true,
                    )
                })
                context("with incorrect bAsset array", async () => {
                    it("should fail if both input arrays are empty", async () => {
                        const { zAsset } = details
                        await assertFailedMintMulti("Input array mismatch", zAsset, [], [])
                    })
                    it("should fail if the bAsset input array is empty", async () => {
                        const { zAsset } = details
                        await assertFailedMintMulti("Input array mismatch", zAsset, [], [1])
                    })
                    it("should fail if there is a length mismatch", async () => {
                        const { zAsset, bAssets } = details
                        await assertFailedMintMulti("Input array mismatch", zAsset, [bAssets[0].address], [1, 1])
                    })
                    it("should fail if there is a length mismatch", async () => {
                        const { zAsset, bAssets } = details
                        await assertFailedMintMulti("Input array mismatch", zAsset, [bAssets[0].address], [1, 1, 1, 1])
                    })
                    it("should fail if there are duplicate bAsset addresses", async () => {
                        const { zAsset, bAssets } = details
                        await assertFailedMintMulti("Duplicate asset", zAsset, [bAssets[0].address, bAssets[0].address], [1, 1])
                    })
                })
                describe("minting with some 0 quantities", async () => {
                    it("should allow minting with some 0 quantities", async () => {
                        const { bAssets } = details
                        const recipient = sa.dummy1
                        await assertMintMulti(details, [1, 0], [bAssets[0], bAssets[1]], recipient.address)
                    })
                    it("should fail if output zAsset quantity is 0", async () => {
                        const { zAsset, bAssets } = details
                        // Get all before balances
                        const bAssetBefore = await Promise.all(bAssets.map((b) => zAsset.getBasset(b.address)))
                        // Approve spending of the bAssets
                        await Promise.all(bAssets.map((b) => zAssetMachine.approveZasset(b, zAsset, 1)))
                        // Pass all 0's
                        await assertFailedMintMulti(
                            "Zero zAsset quantity",
                            zAsset,
                            bAssetBefore.map((b) => b.personal.addr),
                            [0, 0, 0, 0],
                            0,
                            true,
                            sa.default.signer,
                            sa.default.address,
                            false,
                            0,
                        )
                    })
                })
                it("should fail if slippage just too big", async () => {
                    const { bAssets, zAsset } = details
                    const bAsset = bAssets[0]
                    const sender = sa.default
                    await zAssetMachine.approveZasset(bAsset, zAsset, 101, sender.signer)
                    await assertFailedMintMulti(
                        "Mint quantity < min qty",
                        zAsset,
                        [bAsset.address],
                        ["100000000000000000000"], // 100
                        "100000000000000000001", // just over 100
                        true,
                        sender.signer,
                        sender.address,
                        false,
                        "98939327585405193936", // 0.989...
                        true,
                    )
                })
                it("should fail if sender doesn't have balance", async () => {
                    const { bAssets, zAsset } = details
                    const bAsset = bAssets[0]
                    const sender = sa.dummy2
                    expect(await bAsset.balanceOf(sender.address)).eq(0)
                    await assertFailedMintMulti(
                        "ERC20: transfer amount exceeds balance",
                        zAsset,
                        [bAsset.address],
                        ["100000000000000000000"],
                        0,
                        false,
                        sender.signer,
                        sender.address,
                        false,
                        "98939327585405193936",
                        true,
                    )
                })
                it("should fail if sender doesn't give approval", async () => {
                    const { bAssets, zAsset } = details
                    const bAsset = bAssets[0]
                    const sender = sa.dummy3
                    await bAsset.transfer(sender.address, 10000)
                    expect(await bAsset.allowance(sender.address, zAsset.address)).eq(0)
                    expect(await bAsset.balanceOf(sender.address)).eq(10000)
                    await assertFailedMintMulti(
                        "ERC20: transfer amount exceeds allowance",
                        zAsset,
                        [bAsset.address],
                        [100],
                        0,
                        false,
                        sender.signer,
                        sa.default.address,
                        false,
                        100,
                        true,
                    )
                })
                it("should fail if the bAsset does not exist", async () => {
                    const { zAsset } = details
                    await assertFailedMintMulti("Invalid asset", zAsset, [sa.dummy4.address], [100])
                })
            })
            describe("minting with various orders", async () => {
                before(async () => {
                    await runSetup()
                })

                it("should mint quantities relating to the order of the bAsset indexes", async () => {
                    const { bAssets, zAsset } = details
                    const compBefore = await zAssetMachine.getBasketComposition(details)
                    await zAssetMachine.approveZasset(bAssets[0], zAsset, 100)
                    await zAssetMachine.approveZasset(bAssets[1], zAsset, 100)

                    // Minting with 2 and 1.. they should correspond to lowest index first
                    await zAsset.mintMulti([bAssets[0].address, bAssets[1].address], [2, 1], 0, sa.default.address)
                    const compAfter = await zAssetMachine.getBasketComposition(details)
                    expect(compAfter.bAssets[0].vaultBalance).eq(BN.from(compBefore.bAssets[0].vaultBalance).add(BN.from(2)))
                    expect(compAfter.bAssets[1].vaultBalance).eq(BN.from(compBefore.bAssets[1].vaultBalance).add(BN.from(1)))
                })
                it("should mint using multiple bAssets", async () => {
                    const { bAssets, zAsset } = details
                    // It's only possible to mint a single base unit of zAsset, if the bAsset also has 18 decimals
                    // For those tokens with 12 decimals, they can at minimum mint 1*10**6 zAsset base units.
                    // Thus, these basic calculations should work in whole zAsset units, with specific tests for
                    // low decimal bAssets
                    const approvals = await zAssetMachine.approveZassetMulti(
                        [bAssets[0], bAssets[1], bAssets[2]],
                        zAsset,
                        1,
                        sa.default.signer,
                    )
                    await zAsset.mintMulti([bAssets[0].address, bAssets[1].address, bAssets[2].address], approvals, 0, sa.default.address)
                    const approvals2 = await zAssetMachine.approveZassetMulti(
                        [bAssets[0], bAssets[1], bAssets[2], bAssets[3]],
                        zAsset,
                        1,
                        sa.default.signer,
                    )
                    const zUsdBalBefore = await zAsset.balanceOf(sa.default.address)
                    await zAsset.mintMulti(
                        [bAssets[0].address, bAssets[1].address, bAssets[2].address, bAssets[3].address],
                        approvals2,
                        0,
                        sa.default.address,
                    )
                    const zUsdBalAfter = await zAsset.balanceOf(sa.default.address)
                    assertBNClosePercent(
                        zUsdBalAfter,
                        zUsdBalBefore.add(simpleToExactAmount(4, 18)),
                        "0.0001",
                        "Must mint 4 full units of zUSD",
                    )
                })
                it("should mint using 2 bAssets", async () => {
                    const { bAssets, zAsset } = details
                    const approvals = await zAssetMachine.approveZassetMulti([bAssets[0], bAssets[2]], zAsset, 1, sa.default.signer)
                    await zAsset.mintMulti([bAssets[0].address, bAssets[2].address], approvals, 0, sa.default.address)
                })
            })
        })
        context("when the zAsset is undergoing re-collateralisation", () => {
            before(async () => {
                await runSetup(true)
            })
            it("should revert any mints", async () => {
                const { bAssets, zAsset } = details
                await assertBasketIsHealthy(zAssetMachine, details)
                const bAsset0 = bAssets[0]
                await zAsset.connect(sa.governor.signer).handlePegLoss(bAsset0.address, true)

                await zAssetMachine.approveZasset(bAsset0, zAsset, 2)
                await expect(zAsset.mintMulti([bAsset0.address], [1], 0, sa.default.address)).to.revertedWith("Unhealthy")
            })
        })
    })
})
