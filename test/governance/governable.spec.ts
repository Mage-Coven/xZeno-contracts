import { ethers } from "hardhat"
import { ZassetMachine } from "@utils/machines"
import { MockGovernable__factory } from "types/generated"
import { shouldBehaveLikeGovernable, IGovernableBehaviourContext } from "./Governable.behaviour"

describe("Governable", () => {
    const ctx: Partial<IGovernableBehaviourContext> = {}

    beforeEach("Create Contract", async () => {
        const accounts = await ethers.getSigners()
        const zAssetMachine = await new ZassetMachine().initAccounts(accounts)
        ctx.governable = await new MockGovernable__factory(zAssetMachine.sa.governor.signer).deploy()
        ctx.owner = zAssetMachine.sa.governor
        ctx.other = zAssetMachine.sa.other
    })

    shouldBehaveLikeGovernable(ctx as Required<typeof ctx>)
})
