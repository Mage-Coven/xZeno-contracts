/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { FeederPool, Zasset, MV1, MV2 } from "types/generated"
import { BasketManager__factory } from "types/generated/factories/BasketManager__factory"
import { ZusdEth } from "types/generated/ZusdEth"
import { ZusdLegacy } from "types/generated/ZusdLegacy"
import { getChainAddress } from "./networkAddressFactory"
import { isFeederPool, isZusdEth, isZusdLegacy } from "./snap-utils"
import { Chain } from "./tokens"

// Get zAsset token storage variables
export const dumpTokenStorage = async (token: Zasset | ZusdEth | ZusdLegacy | FeederPool, toBlock: number): Promise<void> => {
    const override = {
        blockTag: toBlock,
    }
    console.log("\nSymbol  : ", (await token.symbol(override)).toString())
    console.log("Name    : ", (await token.name(override)).toString())
    console.log("Decimals: ", (await token.decimals(override)).toString())
    console.log("Supply  : ", (await token.totalSupply(override)).toString())
}

// Get bAsset storage variables
export const dumpBassetStorage = async (
    zAsset: Zasset | ZusdEth | ZusdLegacy | MV1 | MV2,
    block: number,
    chain = Chain.mainnet,
): Promise<void> => {
    const override = {
        blockTag: block,
    }

    console.log("\nbAssets")
    // After the zUSD upgrade to ZusdV3
    if (!isZusdLegacy(zAsset)) {
        const bAssets = await zAsset.getBassets(override)
        bAssets.personal.forEach(async (personal, i) => {
            console.log(`bAsset with index ${i}`)
            console.log(` Address    :`, personal.addr.toString())
            console.log(` Integration:`, personal.integrator.toString())
            console.log(` Tx fee     :`, personal.hasTxFee.toString())
            console.log(` Status     :`, personal.status.toString())
            console.log(` Ratio      :`, bAssets[1][i].ratio.toString())
            console.log(` Vault bal  :`, bAssets[1][i].vaultBalance.toString())
            console.log("\n")
        })
    } else {
        // Before the zUSD upgrade to ZusdV3 where the bAssets were in a separate Basket Manager contract
        const basketManagerAddress = getChainAddress("BasketManager", chain)
        const basketManager = BasketManager__factory.connect(basketManagerAddress, zAsset.signer)
        const basket = await basketManager.getBassets(override)
        let i = 0
        for (const bAsset of basket.bAssets) {
            console.log(`bAsset with index ${i}`)
            console.log(` Address    :`, bAsset.addr.toString())
            const integrationAddress = await basketManager.integrations(i, override)
            console.log(` Integration:`, integrationAddress)
            console.log(` Tx fee     :`, bAsset.isTransferFeeCharged.toString())
            console.log(` Status     :`, bAsset.status.toString())
            console.log(` Ratio      :`, bAsset.ratio.toString())
            console.log(` Vault bal  :`, bAsset.vaultBalance.toString())
            console.log(` Max weight :`, bAsset.maxWeight.toString())
            console.log("\n")
            i += 1
        }
    }
}

// Get fAsset storage variables
export const dumpFassetStorage = async (pool: FeederPool, bock: number): Promise<void> => {
    const override = {
        blockTag: bock,
    }

    console.log("\nbAssets")
    const fAssets = await pool.getBassets(override)
    fAssets.forEach(async (_, i) => {
        console.log(`bAsset with index ${i}`)
        console.log(` Address    :`, fAssets[0][i].addr.toString())
        console.log(` Integration:`, fAssets[0][i].integrator.toString())
        console.log(` Tx fee     :`, fAssets[0][i].hasTxFee.toString())
        console.log(` Status     :`, fAssets[0][i].status.toString())
        console.log(` Ratio      :`, fAssets[1][i].ratio.toString())
        console.log(` Vault      :`, fAssets[1][i].vaultBalance.toString())
        console.log("\n")
    })
}

// Get Zasset storage variables
export const dumpConfigStorage = async (zAsset: Zasset | ZusdEth | ZusdLegacy | FeederPool, block: number): Promise<void> => {
    const override = {
        blockTag: block,
    }

    if (!isZusdLegacy(zAsset)) {
        const invariantConfig = await zAsset.getConfig(override)
        console.log("A              : ", invariantConfig.a.toString())
        console.log("Min            : ", invariantConfig.limits.min.toString())
        console.log("Max            : ", invariantConfig.limits.max.toString())
    }

    if (!isZusdEth(zAsset) && !isZusdLegacy(zAsset)) {
        // Zasset and FeederPool
        const data = await (zAsset as FeederPool).data(override)

        console.log("\nCacheSize      : ", data.cacheSize.toString())
        console.log("\nSwapFee        : ", data.swapFee.toString())
        console.log("RedemptionFee  : ", data.redemptionFee.toString())

        if (isFeederPool(zAsset)) {
            // Only FeederPools
            console.log("GovFee         : ", data.govFee.toString())
            console.log("pendingFees    : ", data.pendingFees.toString())
        }
    } else {
        // zUSD or zBTC
        console.log(
            "\nSwapFee        : ",
            (
                await zAsset.swapFee({
                    blockTag: block,
                })
            ).toString(),
        )
        console.log(
            "RedemptionFee  : ",
            (
                await zAsset.redemptionFee({
                    blockTag: block,
                })
            ).toString(),
        )
        console.log(
            "Surplus        : ",
            (
                await zAsset.surplus({
                    blockTag: block,
                })
            ).toString(),
        )
    }
}
