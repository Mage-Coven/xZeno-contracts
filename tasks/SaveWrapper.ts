import "ts-node/register"
import "tsconfig-paths/register"
import { task, types } from "hardhat/config"

import { SaveWrapper__factory } from "../types/generated"
import { getSigner } from "./utils/signerFactory"
import { deployContract, logTxDetails } from "./utils/deploy-utils"
import { getChain, resolveAddress, resolveToken } from "./utils/networkAddressFactory"
import { verifyEtherscan } from "./utils/etherscan"

task("SaveWrapper.deploy", "Deploy a new SaveWrapper")
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const chain = getChain(hre)
        const signer = await getSigner(hre, taskArgs.speed)

        const nexusAddress = resolveAddress("Nexus", chain)

        const constructorArguments = [nexusAddress]
        const wrapper = await deployContract(new SaveWrapper__factory(signer), "SaveWrapper", constructorArguments)

        await verifyEtherscan(hre, {
            address: wrapper.address,
            contract: "contracts/savings/peripheral/SaveWrapper.sol:SaveWrapper",
            constructorArguments,
        })
    })

task("SaveWrapper.approveZasset", "Sets approvals for a new zAsset")
    .addParam("zasset", "Token symbol of the zAsset. eg zUSD or zBTC", undefined, types.string, false)
    .addParam("bassets", "Comma separated symbols of the base assets. eg USDC,DAI,USDT,sUSD", undefined, types.string, false)
    .addParam("fassets", "Comma separated symbols of the Feeder Pool assets. eg GUSD,BUSD,alUSD,FEI,HBTC", undefined, types.string, false)
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const chain = getChain(hre)
        const signer = await getSigner(hre, taskArgs.speed)

        const wrapperAddress = resolveAddress("SaveWrapper", chain)
        const wrapper = SaveWrapper__factory.connect(wrapperAddress, signer)

        const zAssetToken = resolveToken(taskArgs.zasset, chain)

        const bAssetSymbols = taskArgs.bassets.split(",")
        const bAssetAddresses = bAssetSymbols.map((symbol) => resolveAddress(symbol, chain))

        const fAssetSymbols = taskArgs.fassets.split(",")
        const fAssetAddresses = fAssetSymbols.map((symbol) => resolveAddress(symbol, chain, "address"))
        const feederPoolAddresses = fAssetSymbols.map((symbol) => resolveAddress(symbol, chain, "feederPool"))

        const tx = await wrapper["approve(address,address[],address[],address[],address,address)"](
            zAssetToken.address,
            bAssetAddresses,
            feederPoolAddresses,
            fAssetAddresses,
            zAssetToken.savings,
            zAssetToken.vault,
        )
        await logTxDetails(
            tx,
            `SaveWrapper approve zAsset ${taskArgs.zasset}, bAssets ${taskArgs.bassets} and feeder pools ${taskArgs.fassets}`,
        )
    })

task("SaveWrapper.approveMulti", "Sets approvals for multiple tokens/a single spender")
    .addParam(
        "tokens",
        "Comma separated symbols of the tokens that is being approved. eg USDC,DAI,USDT,sUSD",
        undefined,
        types.string,
        false,
    )
    .addParam(
        "spender",
        "Token symbol of the zAsset or address type. eg zUSD, zBTC, feederPool, savings or vault",
        undefined,
        types.string,
        false,
    )
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        const chain = getChain(hre)
        const signer = await getSigner(hre, taskArgs.speed)

        const wrapperAddress = resolveAddress("SaveWrapper", chain)
        const wrapper = SaveWrapper__factory.connect(wrapperAddress, signer)

        const tokenSymbols = taskArgs.tokens.split(",")
        const tokenAddresses = tokenSymbols.map((symbol) => resolveAddress(symbol, chain))

        const spenderAddress = ["feederPool", "savings", "vault"].includes(taskArgs.spender)
            ? resolveAddress(taskArgs.token, chain, taskArgs.spender) // token is zUSD or zBTC
            : resolveAddress(taskArgs.spender, chain) // spender is zUSD or zBTC

        const tx = await wrapper["approve(address[],address)"](tokenAddresses, spenderAddress)
        await logTxDetails(tx, "Approve multiple tokens/single spender")
    })

task("SaveWrapper.approve", "Sets approvals for a single token/spender")
    .addParam("token", "Symbol of the token that is being approved. eg USDC, WBTC, FEI, HBTC, zUSD, izUSD", undefined, types.string, false)
    .addParam(
        "spender",
        "Token symbol of the zAsset or address type. eg zUSD, zBTC, feederPool, savings or vault",
        undefined,
        types.string,
        false,
    )
    .addOptionalParam("speed", "Defender Relayer speed param: 'safeLow' | 'average' | 'fast' | 'fastest'", "fast", types.string)
    .setAction(async (taskArgs, hre) => {
        if (!taskArgs.spender) {
            throw Error(`spender must be a zAsset symbol, eg zUSD or zBTC, or an address type of a zAsset, eg feederPool, savings or vault`)
        }
        const chain = getChain(hre)
        const signer = await getSigner(hre, taskArgs.speed)

        const wrapperAddress = resolveAddress("SaveWrapper", chain)
        const wrapper = SaveWrapper__factory.connect(wrapperAddress, signer)

        const tokenAddress = resolveAddress(taskArgs.token, chain)
        const spenderAddress = ["feederPool", "savings", "vault"].includes(taskArgs.spender)
            ? resolveAddress(taskArgs.token, chain, taskArgs.spender) // token is zUSD or zBTC
            : resolveAddress(taskArgs.spender, chain) // spender is zUSD or zBTC

        const tx = await wrapper["approve(address,address)"](tokenAddress, spenderAddress)
        await logTxDetails(tx, "Approve single token/spender")
    })

export {}
