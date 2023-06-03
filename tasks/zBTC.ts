import { btcBassets, capFactor, contracts, startingCap } from "@utils/btcConstants"
import { Signer } from "ethers"
import { formatUnits } from "ethers/lib/utils"
import { task, types } from "hardhat/config"
import { BN } from "@utils/math"
import { ZusdEth__factory } from "types/generated/factories/ZusdEth__factory"
import { ZusdEth } from "types/generated/ZusdEth"
import { SavingsManager__factory } from "types/generated"
import { dumpBassetStorage, dumpConfigStorage, dumpTokenStorage } from "./utils/storage-utils"
import {
    getMultiRedemptions,
    getBlockRange,
    getBasket,
    getBlock,
    snapConfig,
    getMints,
    getMultiMints,
    getRedemptions,
    getSwaps,
    outputFees,
    getBalances,
    getCollectedInterest,
} from "./utils/snap-utils"
import { Token, renBTC, sBTC, WBTC, zBTC, TBTC, HBTC, Chain } from "./utils/tokens"
import { getSwapRates } from "./utils/rates-utils"
import { getSigner } from "./utils/signerFactory"
import { getChain, getChainAddress } from "./utils/networkAddressFactory"

const bAssets: Token[] = [renBTC, sBTC, WBTC]

const btcFormatter = (amount, decimals = 18, pad = 7, displayDecimals = 3): string => {
    const string2decimals = parseFloat(formatUnits(amount, decimals)).toFixed(displayDecimals)
    // Add thousands separator
    return string2decimals.replace(/\B(?=(\d{3})+(?!\d))/g, ",").padStart(pad)
}

const getZasset = (signer: Signer, contractAddress = zBTC.address): ZusdEth => ZusdEth__factory.connect(contractAddress, signer)

task("zBTC-storage", "Dumps zBTC's storage data")
    .addOptionalParam("block", "Block number to get storage from. (default: current block)", 0, types.int)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre)

        const toBlockNumber = taskArgs.block ? taskArgs.block : await hre.ethers.provider.getBlockNumber()
        console.log(`Block number ${toBlockNumber}`)

        const zAsset = getZasset(signer)

        await dumpTokenStorage(zAsset, toBlockNumber)
        await dumpBassetStorage(zAsset, toBlockNumber)
        await dumpConfigStorage(zAsset, toBlockNumber)
    })

task("zBTC-snap", "Get the latest data from the zBTC contracts")
    .addOptionalParam("from", "Block to query transaction events from. (default: deployment block)", 12094461, types.int)
    .addOptionalParam("to", "Block to query transaction events to. (default: current block)", 0, types.int)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre)
        const chain = getChain(hre)
        const { ethers, network } = hre

        let exposedValidator
        if (network.name === "hardhat") {
            const LogicFactory = await ethers.getContractFactory("ZassetLogic")
            const logicLib = await LogicFactory.deploy()
            const linkedAddress = {
                libraries: {
                    ZassetLogic: logicLib.address,
                },
            }
            const zassetFactory = await ethers.getContractFactory("ExposedZassetLogic", linkedAddress)
            exposedValidator = await zassetFactory.deploy()
        }

        const zAsset = getZasset(signer)
        const savingsManagerAddress = getChainAddress("SavingsManager", chain)
        const savingsManager = SavingsManager__factory.connect(savingsManagerAddress, signer)

        const { fromBlock, toBlock } = await getBlockRange(ethers, taskArgs.from, taskArgs.to)

        const mintSummary = await getMints(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, btcFormatter)
        const mintMultiSummary = await getMultiMints(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, btcFormatter)
        const redeemSummary = await getRedemptions(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, btcFormatter)
        const redeemMultiSummary = await getMultiRedemptions(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, btcFormatter)
        const swapSummary = await getSwaps(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, btcFormatter)

        const tvlConfig = {
            startingCap,
            capFactor,
            invariantValidatorAddress: contracts.mainnet.InvariantValidator,
        }
        await getBasket(
            zAsset,
            btcBassets.map((b) => b.symbol),
            "zBTC",
            btcFormatter,
            toBlock.blockNumber,
            tvlConfig,
            exposedValidator,
        )
        await snapConfig(zAsset, toBlock.blockNumber)

        let accounts = []
        if (chain === Chain.mainnet) {
            accounts = [
                {
                    name: "izBTC",
                    address: zBTC.savings,
                },
                {
                    name: "tBTC Feeder Pool",
                    address: TBTC.feederPool,
                },
                {
                    name: "HBTC Feeder Pool",
                    address: HBTC.feederPool,
                },
            ]
        }
        const balances = await getBalances(zAsset, accounts, btcFormatter, toBlock.blockNumber)

        await getCollectedInterest(bAssets, zAsset, savingsManager, fromBlock, toBlock, btcFormatter, balances.save)

        outputFees(
            mintSummary,
            mintMultiSummary,
            swapSummary,
            redeemSummary,
            redeemMultiSummary,
            balances,
            fromBlock.blockTime,
            toBlock.blockTime,
            btcFormatter,
        )
    })

task("zBTC-rates", "zBTC rate comparison to Curve")
    .addOptionalParam("block", "Block number to compare rates at. (default: current block)", 0, types.int)
    .addOptionalParam("swapSize", "Swap size to compare rates with Curve", 1, types.float)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre)
        const chain = getChain(hre)

        const zAsset = await getZasset(signer)
        const block = await getBlock(hre.ethers, taskArgs.block)

        console.log(`\nGetting rates for zBTC at block ${block.blockNumber}, ${block.blockTime}`)

        console.log("      Qty Input     Output      Qty Out    Rate             Output    Rate   Diff      Arb$")
        await getSwapRates(bAssets, bAssets, zAsset, block.blockNumber, btcFormatter, BN.from(taskArgs.swapSize), chain)
        await snapConfig(zAsset, block.blockNumber)
    })

module.exports = {}
