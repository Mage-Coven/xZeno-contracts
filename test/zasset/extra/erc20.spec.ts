import { ZassetMachine } from "@utils/machines"
import { simpleToExactAmount } from "@utils/math"
import { ethers } from "hardhat"
import { ERC20 } from "types/generated/ERC20"
import { IERC20BehaviourContext, shouldBehaveLikeERC20 } from "../../shared/ERC20.behaviour"

describe("Zasset - ERC20", () => {
    const ctx: Partial<IERC20BehaviourContext> = {}

    const runSetup = async (seedBasket = false): Promise<void> => {
        ctx.details = await ctx.zAssetMachine.deployZasset()
        if (seedBasket) {
            await ctx.zAssetMachine.seedWithWeightings(ctx.details, [25, 25, 25, 25])
        }
    }
    before("Init contract", async () => {
        const accounts = await ethers.getSigners()
        ctx.zAssetMachine = await new ZassetMachine().initAccounts(accounts)
        ctx.initialHolder = ctx.zAssetMachine.sa.default
        ctx.recipient = ctx.zAssetMachine.sa.dummy1
        ctx.anotherAccount = ctx.zAssetMachine.sa.dummy2
    })
    beforeEach("reset contracts", async () => {
        await runSetup(true)
        ctx.token = ctx.details.zAsset as ERC20
    })

    shouldBehaveLikeERC20(ctx as IERC20BehaviourContext, "ERC20", simpleToExactAmount(100, 18))
})
