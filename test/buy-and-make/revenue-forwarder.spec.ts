import { ethers } from "hardhat"
import { expect } from "chai"

import { simpleToExactAmount } from "@utils/math"
import { ZassetMachine, StandardAccounts } from "@utils/machines"

import {
    MockNexus__factory,
    MockNexus,
    MockZasset__factory,
    MockZasset,
    RevenueForwarder__factory,
    RevenueForwarder,
} from "types/generated"
import { ZERO_ADDRESS } from "@utils/constants"
import { Wallet } from "@ethersproject/wallet"

describe("RevenueForwarder", () => {
    let sa: StandardAccounts
    let zAssetMachine: ZassetMachine
    let nexus: MockNexus
    let revenueForwarder: RevenueForwarder
    let zAsset: MockZasset
    let forwarderAddress: string

    /*
        Test Data
        zAssets: zUSD and zBTC with 18 decimals
     */
    const setup = async (): Promise<void> => {
        zAsset = await new MockZasset__factory(sa.default.signer).deploy(
            "meta USD",
            "zUSD",
            18,
            sa.default.address,
            simpleToExactAmount(1000000),
        )

        // Deploy mock Nexus
        nexus = await new MockNexus__factory(sa.default.signer).deploy(
            sa.governor.address,
            sa.mockSavingsManager.address,
            sa.mockInterestValidator.address,
        )
        await nexus.setKeeper(sa.keeper.address)
        forwarderAddress = Wallet.createRandom().address

        // Deploy aRevenueForwarder
        revenueForwarder = await new RevenueForwarder__factory(sa.default.signer).deploy(nexus.address, zAsset.address, forwarderAddress)
    }

    before(async () => {
        const accounts = await ethers.getSigners()
        zAssetMachine = await new ZassetMachine().initAccounts(accounts)
        sa = zAssetMachine.sa

        await setup()
    })

    describe("creating new instance", () => {
        it("should have immutable variables set", async () => {
            expect(await revenueForwarder.nexus(), "Nexus").eq(nexus.address)
            expect(await revenueForwarder.zAsset(), "zAsset").eq(zAsset.address)
            expect(await revenueForwarder.forwarder(), "Forwarder").eq(forwarderAddress)
        })
        describe("it should fail if zero", () => {
            it("nexus", async () => {
                const tx = new RevenueForwarder__factory(sa.default.signer).deploy(ZERO_ADDRESS, zAsset.address, forwarderAddress)
                await expect(tx).to.revertedWith("Nexus address is zero")
            })
            it("zAsset", async () => {
                const tx = new RevenueForwarder__factory(sa.default.signer).deploy(nexus.address, ZERO_ADDRESS, forwarderAddress)
                await expect(tx).to.revertedWith("zAsset is zero")
            })
            it("Forwarder", async () => {
                const tx = new RevenueForwarder__factory(sa.default.signer).deploy(nexus.address, zAsset.address, ZERO_ADDRESS)
                await expect(tx).to.revertedWith("Forwarder is zero")
            })
        })
    })
    describe("notification of revenue", () => {
        it("should simply transfer from the sender", async () => {
            const senderBalBefore = await zAsset.balanceOf(sa.default.address)
            const revenueBuyBackBalBefore = await zAsset.balanceOf(revenueForwarder.address)
            const notificationAmount = simpleToExactAmount(100, 18)
            expect(senderBalBefore.gte(notificationAmount), "sender rewards bal before").to.eq(true)

            // approve
            await zAsset.approve(revenueForwarder.address, notificationAmount)
            // call
            const tx = await revenueForwarder.notifyRedistributionAmount(zAsset.address, notificationAmount)
            await expect(tx).to.emit(revenueForwarder, "RevenueReceived").withArgs(zAsset.address, notificationAmount)

            // check output balances: zAsset sender/recipient
            expect(await zAsset.balanceOf(sa.default.address), "zAsset sender bal after").eq(senderBalBefore.sub(notificationAmount))
            expect(await zAsset.balanceOf(revenueForwarder.address), "zAsset RevenueForwarder bal after").eq(
                revenueBuyBackBalBefore.add(notificationAmount),
            )
        })
        describe("it should fail if", () => {
            it("not configured zAsset", async () => {
                await expect(revenueForwarder.notifyRedistributionAmount(sa.dummy1.address, simpleToExactAmount(1, 18))).to.be.revertedWith(
                    "Recipient is not zAsset",
                )
            })
            it("approval is not given from sender", async () => {
                await expect(revenueForwarder.notifyRedistributionAmount(zAsset.address, simpleToExactAmount(100, 18))).to.be.revertedWith(
                    "ERC20: transfer amount exceeds allowance",
                )
            })
            it("sender has insufficient balance", async () => {
                await zAsset.transfer(sa.dummy1.address, simpleToExactAmount(1, 18))
                await zAsset.connect(sa.dummy1.signer).approve(revenueForwarder.address, simpleToExactAmount(100))
                await expect(
                    revenueForwarder.connect(sa.dummy1.signer).notifyRedistributionAmount(zAsset.address, simpleToExactAmount(2, 18)),
                ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
            })
        })
    })
    describe("forward", () => {
        const notificationAmount = simpleToExactAmount(20000)
        beforeEach(async () => {
            await setup()
            // approve
            await zAsset.approve(revenueForwarder.address, notificationAmount)
            // call
            await revenueForwarder.notifyRedistributionAmount(zAsset.address, notificationAmount)
        })
        it("keeper should forward received zAssets", async () => {
            expect(await zAsset.balanceOf(revenueForwarder.address), "revenue forwarder's zAsset bal before").to.eq(notificationAmount)
            expect(await zAsset.balanceOf(forwarderAddress), "forwarder's zAsset bal before").to.eq(0)

            const tx = await revenueForwarder.connect(sa.keeper.signer).forward()

            await expect(tx).to.emit(revenueForwarder, "Withdrawn").withArgs(notificationAmount)
            expect(await zAsset.balanceOf(revenueForwarder.address), "revenue forwarder's zAsset bal after").to.eq(0)
            expect(await zAsset.balanceOf(forwarderAddress), "forwarder's zAsset bal after").to.eq(notificationAmount)
        })
        it("governor should forward received zAssets", async () => {
            expect(await zAsset.balanceOf(revenueForwarder.address), "revenue forwarder's zAsset bal before").to.eq(notificationAmount)
            expect(await zAsset.balanceOf(forwarderAddress), "forwarder's zAsset bal before").to.eq(0)

            const tx = await revenueForwarder.connect(sa.governor.signer).forward()

            await expect(tx).to.emit(revenueForwarder, "Withdrawn").withArgs(notificationAmount)
            expect(await zAsset.balanceOf(revenueForwarder.address), "revenue forwarder's zAsset bal after").to.eq(0)
            expect(await zAsset.balanceOf(forwarderAddress), "forwarder's zAsset bal after").to.eq(notificationAmount)
        })
        it("should forward with no rewards balance", async () => {
            // Forward whatever balance it currently has
            await revenueForwarder.connect(sa.keeper.signer).forward()

            expect(await zAsset.balanceOf(revenueForwarder.address), "revenue forwarder's zAsset bal before").to.eq(0)

            const tx = await revenueForwarder.connect(sa.keeper.signer).forward()

            await expect(tx).to.not.emit(revenueForwarder, "Withdrawn")
            expect(await zAsset.balanceOf(revenueForwarder.address), "revenue forwarder's zAsset bal after").to.eq(0)
        })
        it("Not governor or keeper fail set new forwarder", async () => {
            const tx = revenueForwarder.connect(sa.dummy1.signer).forward()

            await expect(tx).to.revertedWith("Only keeper or governor")
        })
    })
    describe("setConfig", () => {
        const newForwarderAddress = Wallet.createRandom().address
        it("governor should set new forwarder", async () => {
            expect(await revenueForwarder.forwarder(), "forwarder before").to.eq(forwarderAddress)

            const tx = await revenueForwarder.connect(sa.governor.signer).setConfig(newForwarderAddress)

            await expect(tx).to.emit(revenueForwarder, "SetForwarder").withArgs(newForwarderAddress)
            expect(await revenueForwarder.forwarder(), "forwarder after").to.eq(newForwarderAddress)
        })
        it("keeper should fail to set new forwarder", async () => {
            const tx = revenueForwarder.connect(sa.keeper.signer).setConfig(newForwarderAddress)

            await expect(tx).to.revertedWith("Only governor can execute")
        })
        it("should fail to set zero forwarder", async () => {
            const tx = revenueForwarder.connect(sa.governor.signer).setConfig(ZERO_ADDRESS)

            await expect(tx).to.revertedWith("Invalid forwarder")
        })
    })
})
