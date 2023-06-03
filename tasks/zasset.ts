import { subtask, task, types } from "hardhat/config"
import { Zasset__factory } from "types/generated"
import { BN, simpleToExactAmount } from "@utils/math"
import { formatUnits } from "@ethersproject/units"
import { getSignerAccount } from "./utils/signerFactory"
import { logTxDetails } from "./utils/deploy-utils"
import { getChain, resolveAddress, resolveToken } from "./utils/networkAddressFactory"

subtask("zasset-redeem", "Redeems a number of Save credits from a savings contract")
    .addParam("zasset", "Symbol of the zAsset. eg zUSD or zBTC", undefined, types.string)
    .addParam("basset", "Symbol of the bAsset. eg USDC, DAI, USDT or DAI", undefined, types.string)
    .addParam("amount", "Amount of zAssets to be redeemed", undefined, types.float)
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const chain = getChain(hre)
        const signerAccount = await getSignerAccount(hre, taskArgs.speed)

        const zAssetAddress = resolveAddress(taskArgs.zasset, chain, "address")
        const bAsset = resolveToken(taskArgs.basset, chain, "address")

        const zAsset = Zasset__factory.connect(zAssetAddress, signerAccount.signer)

        const amount = simpleToExactAmount(taskArgs.amount)
        const minAmount = amount
            .mul(99)
            .div(100)
            .div(BN.from(10).pow(18 - bAsset.decimals))

        const tx = await zAsset.redeem(bAsset.address, amount, minAmount, signerAccount.address)
        await logTxDetails(tx, `redeem ${taskArgs.amount} ${taskArgs.zasset} for ${taskArgs.basset}`)
        const receipt = await tx.wait()
        const event = receipt.events?.find((e) => e.event === "Redeemed")
        console.log(`Redeemed ${event.args[4]} ${taskArgs.basset}`)
        console.log(`Redeemed ${formatUnits(event.args[4], bAsset.decimals)} ${taskArgs.basset}`)
    })
task("zasset-redeem").setAction(async (_, __, runSuper) => {
    await runSuper()
})

subtask("zasset-swap", "Redeems a number of Save credits from a savings contract")
    .addParam("zasset", "Symbol of the zAsset. eg zUSD or zBTC", undefined, types.string)
    .addParam("from", "Symbol of the bAsset. eg USDC, DAI, USDT or DAI", undefined, types.string)
    .addParam("to", "Symbol of the bAsset. eg USDC, DAI, USDT or DAI", undefined, types.string)
    .addParam("amount", "Amount of zAssets to be redeemed", undefined, types.float)
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const { amount, from, to, zasset, speed } = taskArgs
        const chain = getChain(hre)
        const signerAccount = await getSignerAccount(hre, speed)

        const zAssetAddress = resolveAddress(zasset, chain, "address")
        const fromToken = resolveToken(from, chain, "address")
        const toToken = resolveToken(to, chain, "address")

        const zAsset = Zasset__factory.connect(zAssetAddress, signerAccount.signer)

        const input = simpleToExactAmount(amount)

        const tx = await zAsset.swap(fromToken.address, toToken.address, input, 0, signerAccount.address)
        await logTxDetails(tx, `swapped ${amount} ${fromToken.symbol} to ${toToken.symbol}`)
        // const receipt = await tx.wait()
        // const event = receipt.events?.find((e) => e.event === "Swapped")
        // console.log(`Swapped ${formatUnits(event.args[4], bAsset.decimals)} ${taskArgs.basset}`)
    })
task("zasset-swap").setAction(async (_, __, runSuper) => {
    await runSuper()
})

module.exports = {}
