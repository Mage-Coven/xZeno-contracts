/* eslint-disable no-restricted-syntax */
import { TransactionResponse } from "@ethersproject/providers"
import { subtask, task, types } from "hardhat/config"

import {
    DisperseForwarder__factory,
    EmissionsController__factory,
    IERC20__factory,
    L2EmissionsController__factory,
    RevenueBuyBack__factory,
    RevenueSplitBuyBack__factory,
    RevenueForwarder__factory,
    VotiumBribeForwarder__factory,
    SavingsManager__factory,
} from "types/generated"
import { ONE_HOUR } from "@utils/constants"
import { simpleToExactAmount } from "@utils/math"
import { logTxDetails, logger, zUSD, zBTC, usdFormatter } from "./utils"
import { getSigner } from "./utils/signerFactory"
import { getChain, resolveAddress } from "./utils/networkAddressFactory"
import { getBalancerPolygonReport } from "./utils/emission-disperse-bal"
import { sendPrivateTransaction } from "./utils/flashbots"
import { splitBuyBackRewards } from "./utils/emissions-split-buy-back"

const log = logger("emission")

subtask("emission-calc", "Calculate the weekly emissions")
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)

        // Resolve the vault addresses from the asset symbols
        const emissionsControllerAddress = resolveAddress("EmissionsController", chain)
        const emissionsController = EmissionsController__factory.connect(emissionsControllerAddress, signer)

        const tx = await emissionsController.calculateRewards()
        await logTxDetails(tx, "calculate rewards")
    })
task("emission-calc").setAction(async (_, __, runSuper) => {
    await runSuper()
})

subtask("emission-dist", "Distribute the weekly emissions")
    .addOptionalParam("dials", "The number of dials starting at 0", 17, types.int)
    .addOptionalParam("dialIds", "A comma separated list of dial ids", undefined, types.string)
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)

        const emissionsControllerAddress = resolveAddress("EmissionsController", chain)
        const emissionsController = EmissionsController__factory.connect(emissionsControllerAddress, signer)

        const dialIds = taskArgs.dialIds ? taskArgs.dialIds.split(",").map(Number) : [...Array(taskArgs.dials).keys()]

        const tx = await emissionsController.distributeRewards(dialIds)
        await logTxDetails(tx, `distribute rewards for dial ids ${dialIds}`)
    })
task("emission-dist").setAction(async (_, __, runSuper) => {
    await runSuper()
})

subtask("l2-emission-dist", "Distribute the weekly emissions on layer 2 to vaults")
    .addParam("recipient", "The address of the end recipient. eg Vault", undefined, types.string)
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)

        const emissionsControllerAddress = resolveAddress("EmissionsController", chain)
        const emissionsController = L2EmissionsController__factory.connect(emissionsControllerAddress, signer)

        const recipientAddress = resolveAddress(taskArgs.recipient, chain, "vault")

        const tx = await emissionsController.distributeRewards([recipientAddress])
        await logTxDetails(tx, `distribute rewards to ${taskArgs.recipient}`)
    })
task("l2-emission-dist").setAction(async (_, __, runSuper) => {
    await runSuper()
})

subtask("emission-disperse-bal", "Disperse Polygon Balancer Pool ZENO rewards in a DisperseForwarder contract")
    .addParam("report", "Report number from the bal-mining-script repo. eg 79", undefined, types.int)
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)

        const disperseForwarderAddress = resolveAddress("DisperseForwarder", chain)
        const disperseForwarder = DisperseForwarder__factory.connect(disperseForwarderAddress, signer)

        const zenoAddress = resolveAddress("ZENO", chain)

        const zenoToken = IERC20__factory.connect(zenoAddress, signer)

        // Get the amount of ZENO in the DisperseForwarder contract
        const zenoBalance = await zenoToken.balanceOf(disperseForwarderAddress)
        try {
            // Get the proportion the ZENO balance in the DisperseForwarder contract to the recipients based off the bal-mining-script report.
            const { disperser } = await getBalancerPolygonReport(taskArgs.report, zenoBalance)
            const tx = await disperseForwarder.disperseToken(disperser.recipients, disperser.values)
            await logTxDetails(tx, `Disperse Balancer Pool ZENO rewards ${disperser.total}  to ${disperser.recipients} recipients`)
        } catch (error) {
            log(`Error dispersing report ${taskArgs.report} : ${error.message}`)
            process.exit(0)
        }
    })
task("emission-disperse-bal").setAction(async (_, __, runSuper) => {
    await runSuper()
})

subtask("savings-dist-fees", "Distributes governance fees from the Savings Manager to the Revenue Recipient")
    .addOptionalParam("zasset", "Symbol of zAsset that the fees were collected in. eg zUSD or zBTC", "zUSD", types.string)
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)

        const savingsManagerAddress = resolveAddress("SavingsManager", chain)
        const savingsManager = SavingsManager__factory.connect(savingsManagerAddress, signer)
        const zAssetAddress = resolveAddress(taskArgs.zasset, chain)

        const tx = await savingsManager.distributeUnallocatedInterest(zAssetAddress)
        await logTxDetails(tx, `distribute ${taskArgs.zasset} gov fees`)

        const receipt = await tx.wait()
        const event = receipt.events.find((e) => e.event === "RevenueRedistributed")
        console.log(`Distributed ${usdFormatter(event.args.amount)} in fees`)
    })
task("savings-dist-fees").setAction(async (_, __, runSuper) => {
    await runSuper()
})

subtask("revenue-forward", "Forwards received revenue. eg Polygon zUSD revenue from SavingsManager")
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)

        const revenueForwarderAddress = resolveAddress("RevenueRecipient", chain)
        const revenueForwarder = RevenueForwarder__factory.connect(revenueForwarderAddress, signer)

        const tx = await revenueForwarder.forward()
        await logTxDetails(tx, `forward gov fees`)
    })
task("revenue-forward").setAction(async (_, __, runSuper) => {
    await runSuper()
})

subtask("revenue-buy-back", "Buy back ZENO from zUSD and zBTC gov fees")
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)

        const revenueBuyBackAddress = resolveAddress("RevenueBuyBack", chain)
        const revenueBuyBack = RevenueBuyBack__factory.connect(revenueBuyBackAddress, signer)

        let tx: TransactionResponse
        if (hre.network.name === "hardhat") {
            tx = await revenueBuyBack.buyBackRewards([zUSD.address, zBTC.address])
        } else {
            // Send via Flashbots
            const populatedTx = await revenueBuyBack.populateTransaction.buyBackRewards([zUSD.address, zBTC.address])
            tx = await sendPrivateTransaction(populatedTx, signer)
        }
        await logTxDetails(tx, `buy back ZENO from gov fees`)
    })
task("revenue-buy-back").setAction(async (_, __, runSuper) => {
    await runSuper()
})
subtask("revenue-split-buy-back", "Buy back ZENO from zUSD and zBTC gov fees")
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)
        const revenueSplitBuyBackAddress = resolveAddress("RevenueSplitBuyBack", chain)
        const revenueSplitBuyBack = RevenueSplitBuyBack__factory.connect(revenueSplitBuyBackAddress, signer)
        const zusd = {
            address: resolveAddress("zUSD", chain),
            bAssetMinSlippage: 1, // 1%
            rewardMinSlippage: 2, // 1%
            zAssetMinBalance: simpleToExactAmount(50), // 50 USD
            // Provide two fees options to the swap, function splitBuyBackRewards will get the best quote.
            swapFees: [
                [3000, 3000],
                [3000, 10000],
                [500, 3000],
                [500, 10000],
            ], // [USDC/WETH 0.3%, ZENO/WETH 0.3%] [USDC/WETH 0.05%, ZENO/WETH 1%]
        }

        const zbtc = {
            address: resolveAddress("zBTC", chain),
            bAssetMinSlippage: 3, // 3%
            rewardMinSlippage: 2, // 2%
            zAssetMinBalance: simpleToExactAmount(10, 14), // 10 wBTC
            swapFees: [[3000, 3000]], // 0.3%, 0.3%
        }
        const zAssets = [zusd, zbtc]
        const request = {
            zAssets,
            revenueSplitBuyBack,
            blockNumber: "latest",
        }
        const tx = await splitBuyBackRewards(signer, request)
        if (tx) {
            await logTxDetails(tx, `buy back ZENO from gov fees`)
        } else {
            console.log("No buyback tx")
        }
    })
task("revenue-split-buy-back").setAction(async (_, __, runSuper) => {
    await runSuper()
})
subtask("revenue-donate-rewards", "Donate purchased ZENO to the staking dials in the Emissions Controller")
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)

        const revenueBuyBackAddress = resolveAddress("RevenueSplitBuyBack", chain)
        const revenueBuyBack = RevenueSplitBuyBack__factory.connect(revenueBuyBackAddress, signer)

        const tx = await revenueBuyBack.donateRewards()
        await logTxDetails(tx, `donate purchased ZENO to Emissions Controller`)
    })
task("revenue-donate-rewards").setAction(async (_, __, runSuper) => {
    await runSuper()
})

subtask("votium-forward", "Forwards votium bribe. from votium dial")
    .addParam("proposal", "Convex finance proposal for Weekly Gauge Weight", undefined, types.string)
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "average", types.string)
    .setAction(async (taskArgs, hre) => {
        // For example on the URL  https://vote.convexfinance.com/#/proposal/QmZpsJAvbKEY9YKFCZBUzzSMC5Y9vfy6QPA4HoXGsiLUyg
        // the proposal is QmZpsJAvbKEY9YKFCZBUzzSMC5Y9vfy6QPA4HoXGsiLUyg

        const hashFn = (str: string) => hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(str))
        const MIN_BRIBE_AMOUNT = 1

        const signer = await getSigner(hre, taskArgs.speed)
        const chain = getChain(hre)

        const votiumBribeForwarderAddress = resolveAddress("VotiumForwarder", chain)
        const zenoAddress = resolveAddress("ZENO", chain)

        const votiumBribeForwarder = VotiumBribeForwarder__factory.connect(votiumBribeForwarderAddress, signer)
        const choiceIndex = await votiumBribeForwarder.choiceIndex()

        const zenoToken = IERC20__factory.connect(zenoAddress, signer)

        const zenoBalance = await zenoToken.balanceOf(votiumBribeForwarderAddress)

        if (zenoBalance.lte(MIN_BRIBE_AMOUNT)) {
            throw new Error("ZENO balance to low")
        }
        const proposal = hashFn(taskArgs.proposal)
        console.log(`ZENO ${zenoBalance.toString()} to deposit into proposal ${proposal} with choiceIndex ${choiceIndex}`)

        //  Deposit zeno bribe
        const tx = await votiumBribeForwarder.depositBribe(zenoBalance, proposal)
        await logTxDetails(tx, "depositBribe(zenoBalance, proposal)")
    })
task("votium-forward").setAction(async (_, __, runSuper) => {
    await runSuper()
})

task("emissions-process", "Weekly mainnet emissions process")
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .addOptionalParam("proposal", "Convex finance proposal for Weekly Gauge Weight", undefined, types.string)
    .setAction(async ({ speed, proposal }, hre) => {
        // Dump the expected dial distribution amounts
        await hre.run("dials-snap", { speed })

        // Dynamic import of increaseTime to avoid Hardhat error:
        //   Error HH9: Error while loading Hardhat's configuration.
        //   You probably tried to import the "hardhat" module from your config or a file imported from it.
        const { increaseTime } = await import("@utils/time")
        // Get to the next epoch
        await increaseTime(ONE_HOUR)

        // Sends any zUSD or zBTC governance fees from the Savings Manager to the RevenueBuyBack contract
        await hre.run("savings-dist-fees", { zasset: "zUSD", speed })
        await hre.run("savings-dist-fees", { zasset: "zBTC", speed })

        // Buys ZENO using zUSD and zBTC governance fees
        await hre.run("revenue-buy-back", { speed })
        // Donates ZENO rewards to the staking contract dials in the Emissions Controller
        await hre.run("revenue-donate-rewards", { speed })

        // Calculate the weekly distribution amounts
        await hre.run("emission-calc", { speed })

        // Distributes to dial Vaults
        await hre.run("emission-dist", { speed, dials: 15 })

        // // Distributes to dial Vaults but not the staking vaults
        // await hre.run("emission-dist", { speed, dialIds: "2,3,4,5,6,7,8,9,10" })

        // Dial 15 (Votium) is skipped for now
        if (proposal === undefined) {
            await hre.run("votium-forward", { speed, proposal })
        }
        // Distributes to dial 16
        await hre.run("emission-dist", { speed, dialIds: "16" })

        // Dump the expected dial distribution amounts
        await hre.run("dials-snap", { speed })
    })
