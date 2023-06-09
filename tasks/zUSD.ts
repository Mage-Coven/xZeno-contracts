/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import "ts-node/register"
import "tsconfig-paths/register"
import { task, types } from "hardhat/config"
import { Signer } from "ethers"

import { Zasset, ZassetManager__factory, Zasset__factory, SavingsManager__factory } from "types/generated"
import { BN } from "@utils/math"
import { ZusdEth__factory } from "types/generated/factories/ZusdEth__factory"
import { ZusdLegacy__factory } from "types/generated/factories/ZusdLegacy__factory"
import { ZusdLegacy } from "types/generated/ZusdLegacy"
import { ZusdEth } from "types/generated/ZusdEth"
import { dumpBassetStorage, dumpConfigStorage, dumpTokenStorage } from "./utils/storage-utils"
import {
    getMultiRedemptions,
    getBlock,
    getBlockRange,
    getBasket,
    snapConfig,
    getMints,
    getMultiMints,
    getSwaps,
    getRedemptions,
    outputFees,
    getBalances,
    snapSave,
    getCollectedInterest,
} from "./utils/snap-utils"
import { Token, sUSD, USDC, DAI, USDT, PUSDT, PUSDC, PDAI, zUSD, PzUSD, MzUSD, RzUSD, Chain } from "./utils/tokens"
import { usdFormatter } from "./utils/quantity-formatters"
import { getSwapRates } from "./utils/rates-utils"
import { getSigner } from "./utils"
import { getChain, getChainAddress } from "./utils/networkAddressFactory"

const zUsdBassets: Token[] = [sUSD, USDC, DAI, USDT]
const zUsdPolygonBassets: Token[] = [PUSDC, PDAI, PUSDT]

// major zUSD upgrade to ZusdV3 that changes the ABI
export const zusdUpgradeBlock = 12094376

const getZasset = (signer: Signer, networkName: string, block: number): Zasset | ZusdEth | ZusdLegacy => {
    if (networkName === "polygon_mainnet") {
        return Zasset__factory.connect(PzUSD.address, signer)
    }
    if (networkName === "polygon_testnet") {
        return Zasset__factory.connect(MzUSD.address, signer)
    }
    if (networkName === "ropsten") {
        return ZusdEth__factory.connect(RzUSD.address, signer)
    }
    // The block zUSD was upgraded to the latest Zasset with contract name (Zusdv3)
    if (block < zusdUpgradeBlock) {
        return ZusdLegacy__factory.connect(zUSD.address, signer)
    }
    return ZusdEth__factory.connect(zUSD.address, signer)
}

task("zUSD-storage", "Dumps zUSD's storage data")
    .addOptionalParam("block", "Block number to get storage from. (default: current block)", 0, types.int)
    .addOptionalParam("type", "Type of storage to report. token, basset, config or all.", "all", types.string)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre)

        const blockNumber = taskArgs.block ? taskArgs.block : await hre.ethers.provider.getBlockNumber()
        console.log(`Block number ${blockNumber}`)

        const zAsset = getZasset(signer, hre.network.name, blockNumber)

        if (["token", "all"].includes(taskArgs.type)) await dumpTokenStorage(zAsset, blockNumber)
        if (["basset", "all"].includes(taskArgs.type)) await dumpBassetStorage(zAsset, blockNumber)
        if (["config", "all"].includes(taskArgs.type)) await dumpConfigStorage(zAsset, blockNumber)
    })

task("zUSD-snap", "Snaps zUSD")
    .addOptionalParam("from", "Block to query transaction events from. (default: deployment block)", 12094461, types.int)
    .addOptionalParam("to", "Block to query transaction events to. (default: current block)", 0, types.int)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre)
        const chain = getChain(hre)
        const { network, ethers } = hre

        let exposedValidator
        if (!["mainnet", "polygon_mainnet"].includes(network.name)) {
            console.log("Not a mainnet chain")

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

        const { fromBlock, toBlock } = await getBlockRange(hre.ethers, taskArgs.from, taskArgs.to)

        const zAsset = getZasset(signer, network.name, toBlock.blockNumber)
        const savingsManagerAddress = getChainAddress("SavingsManager", chain)
        const savingsManager = SavingsManager__factory.connect(savingsManagerAddress, signer)

        const bAssets = network.name.includes("polygon") ? zUsdPolygonBassets : zUsdBassets

        let accounts = []
        if (chain === Chain.mainnet) {
            accounts = [
                {
                    name: "izUSD",
                    address: zUSD.savings,
                },
                {
                    name: "Iron Bank",
                    address: "0xbe86e8918dfc7d3cb10d295fc220f941a1470c5c",
                },
                {
                    name: "Curve zUSD",
                    address: "0x8474ddbe98f5aa3179b3b3f5942d724afcdec9f6",
                },
                {
                    name: "xZeno DAO",
                    address: "0x3dd46846eed8D147841AE162C8425c08BD8E1b41",
                },
                {
                    name: "Balancer ETH/zUSD 50/50 #2",
                    address: "0xe036cce08cf4e23d33bc6b18e53caf532afa8513",
                },
            ]
        } else if (chain === Chain.polygon) {
            accounts = [
                {
                    name: "izUSD",
                    address: PzUSD.savings,
                },
            ]
        }

        const mintSummary = await getMints(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, usdFormatter)
        const mintMultiSummary = await getMultiMints(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, usdFormatter)
        const swapSummary = await getSwaps(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, usdFormatter)
        const redeemSummary = await getRedemptions(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, usdFormatter)
        const redeemMultiSummary = await getMultiRedemptions(bAssets, zAsset, fromBlock.blockNumber, toBlock.blockNumber, usdFormatter)

        await snapConfig(zAsset, toBlock.blockNumber)

        await getBasket(
            zAsset,
            bAssets.map((b) => b.symbol),
            "zUSD",
            usdFormatter,
            toBlock.blockNumber,
            undefined,
            exposedValidator,
        )

        const balances = await getBalances(zAsset, accounts, usdFormatter, toBlock.blockNumber)

        await getCollectedInterest(bAssets, zAsset, savingsManager, fromBlock, toBlock, usdFormatter, balances.save)

        await snapSave("zUSD", signer, chain, toBlock.blockNumber)

        outputFees(
            mintSummary,
            mintMultiSummary,
            swapSummary,
            redeemSummary,
            redeemMultiSummary,
            balances,
            fromBlock.blockTime,
            toBlock.blockTime,
            usdFormatter,
        )
    })

task("zUSD-rates", "zUSD rate comparison to Curve")
    .addOptionalParam("block", "Block number to compare rates at. (default: current block)", 0, types.int)
    .addOptionalParam("swapSize", "Swap size to compare rates with Curve", 10000, types.float)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre)
        const chain = getChain(hre)

        const block = await getBlock(hre.ethers, taskArgs.block)
        const zAsset = await getZasset(signer, hre.network.name, block.blockNumber)

        console.log(`\nGetting rates for zUSD at block ${block.blockNumber}, ${block.blockTime}`)

        const bAssets = chain === Chain.polygon ? zUsdPolygonBassets : zUsdBassets

        console.log("      Qty Input     Output      Qty Out    Rate             Output    Rate   Diff      Arb$")
        await getSwapRates(bAssets, bAssets, zAsset, block.blockNumber, usdFormatter, BN.from(taskArgs.swapSize), chain)
        await snapConfig(zAsset, block.blockNumber)
    })

task("zUSD-BassetAdded", "Lists the BassetAdded events from a zAsset")
    .addOptionalParam("zasset", "Token symbol of zAsset. eg zUSD or zBTC", "zUSD", types.string)
    .addOptionalParam("from", "Block to query transaction events from. (default: deployment block)", 10148031, types.int)
    .addOptionalParam("to", "Block to query transaction events to. (default: current block)", 0, types.int)
    .setAction(async (taskArgs, hre) => {
        const signer = await getSigner(hre)
        const chain = await getChain(hre)

        const { fromBlock, toBlock } = await getBlockRange(hre.ethers, taskArgs.from, taskArgs.to)

        const zAsset = await getZasset(signer, hre.network.name, toBlock.blockNumber)
        const zassetManagerAddress = getChainAddress("ZassetManager", chain)
        const manager = ZassetManager__factory.connect(zassetManagerAddress, signer)

        const filter = await manager.filters.BassetAdded()
        filter.address = zAsset.address
        const logs = await zAsset.queryFilter(filter, fromBlock.blockNumber, toBlock.blockNumber)

        console.log(`${await zAsset.symbol()} ${zAsset.address}`)
        if (logs.length === 0)
            console.error(`Failed to find any BassetAdded events between blocks ${fromBlock.blockNumber} and ${toBlock.blockNumber}`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logs.forEach((log: any) => {
            console.log(`Basset added at block ${log.blockNumber} in tx ${log.blockHash}`)
        })
    })

module.exports = {}
