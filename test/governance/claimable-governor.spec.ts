import { ethers } from "hardhat"
import { expect } from "chai"

import { ZassetMachine } from "@utils/machines"
import { ClaimableGovernor__factory } from "types/generated"
import { shouldBehaveLikeClaimable, IClaimableGovernableBehaviourContext } from "./ClaimableGovernor.behaviour"

describe("ClaimableGovernable", () => {
    const ctx: Partial<IClaimableGovernableBehaviourContext> = {}

    beforeEach("Create Contract", async () => {
        const accounts = await ethers.getSigners()
        const zAssetMachine = await new ZassetMachine().initAccounts(accounts)
        ctx.default = zAssetMachine.sa.default
        ctx.governor = zAssetMachine.sa.governor
        ctx.other = zAssetMachine.sa.other
        ctx.claimable = await new ClaimableGovernor__factory(zAssetMachine.sa.governor.signer).deploy(zAssetMachine.sa.governor.address)
    })

    shouldBehaveLikeClaimable(ctx as Required<typeof ctx>)

    describe("after initiating a transfer", () => {
        let newOwner

        beforeEach(async () => {
            const accounts = await ethers.getSigners()
            const zAssetMachine = await new ZassetMachine().initAccounts(accounts)
            newOwner = zAssetMachine.sa.other
            await ctx.claimable.connect(zAssetMachine.sa.governor.signer).requestGovernorChange(newOwner.address)
        })

        it("changes allow pending owner to claim ownership", async () => {
            await ctx.claimable.connect(newOwner.signer).claimGovernorChange()
            const owner = await ctx.claimable.governor()

            expect(owner === newOwner.address).to.equal(true)
        })
    })
})
