import { expect } from "chai"
import { ethers } from "hardhat"
import { ZassetMachine } from "@utils/machines"
import { DelayedClaimableGovernor__factory } from "types/generated"
import { shouldBehaveLikeDelayedClaimable, IGovernableBehaviourContext } from "./DelayedClaimableGovernor.behaviour"
import { shouldBehaveLikeClaimable } from "./ClaimableGovernor.behaviour"

describe("DelayedClaimableGovernor", () => {
    const ctx: Partial<IGovernableBehaviourContext> = {}
    const GOVERNANCE_DELAY = 60 * 60 * 24 * 7 // 1 week

    describe("Should behave like Claimable", () => {
        beforeEach("Create Contract", async () => {
            const accounts = await ethers.getSigners()
            const zAssetMachine = await new ZassetMachine().initAccounts(accounts)
            ctx.default = zAssetMachine.sa.default
            ctx.governor = zAssetMachine.sa.governor
            ctx.other = zAssetMachine.sa.other
            ctx.claimable = await new DelayedClaimableGovernor__factory(ctx.governor.signer).deploy(ctx.governor.address, GOVERNANCE_DELAY)
        })

        shouldBehaveLikeClaimable(ctx as Required<typeof ctx>)
    })

    describe("Should behave like DelayedClaimable", () => {
        beforeEach("Initiate change Governor", async () => {
            const accounts = await ethers.getSigners()
            const zAssetMachine = await new ZassetMachine().initAccounts(accounts)
            ctx.default = zAssetMachine.sa.default
            ctx.governor = zAssetMachine.sa.governor
            ctx.other = zAssetMachine.sa.other
            ctx.claimable = await new DelayedClaimableGovernor__factory(ctx.governor.signer).deploy(ctx.governor.address, GOVERNANCE_DELAY)

            await ctx.claimable.requestGovernorChange(ctx.other.address)
        })

        shouldBehaveLikeDelayedClaimable(ctx as Required<typeof ctx>)

        it("should not allow zero delay", async () => {
            await expect(new DelayedClaimableGovernor__factory(ctx.governor.signer).deploy(ctx.governor.address, 0)).to.be.revertedWith(
                "Delay must be greater than zero",
            )
        })
    })
})
