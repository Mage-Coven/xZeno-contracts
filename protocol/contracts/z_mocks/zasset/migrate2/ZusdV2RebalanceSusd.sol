// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IZassetV1 } from "./IZassetV1.sol";

/**
 * @title   Contract to balance zUSD bAssets using sUSD in preparation for the zUSD V3 upgrade.
 * @author  xZeno
 * @notice  Should only be used if sUSD is under the target zUSD basket weight. eg 25%.
 *          The bAssets to be swapped with should be over the target zUSD basket weight. eg TUSD and USDT.
 * @dev     VERSION: 1.0
 *          DATE:    2021-03-22
 */
contract ZusdV2SusdBalancer is Ownable {
    using SafeERC20 for IERC20;

    // address immutable private owner;
    IZassetV1 constant zUsdV1 = IZassetV1(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5);
    IERC20 constant sUSD = IERC20(0x57Ab1ec28D129707052df4dF418D58a2D46d5f51);

    /**
     * @notice balances zUSD bAssets like TUSD and USDT using borrowed sUSD.
     *         Assumes the sUSD funding account has already approved a transfer to this contract.
     * @param bAssets address of the tokens the sUSD will be swapped for in the zUSD basket. eg TUSD and USDT.
     * @param amounts sUSD input quantities for each zUSD swap.
     * @param funderAccount account that the sUSD will be borrowed from and swap output returned to.
     */
    function balanceSusd(
        address[] memory bAssets,
        uint256[] memory amounts,
        address funderAccount
    ) public onlyOwner {
        // sum the total sUSD to be swapped on zUSD
        uint256 len = bAssets.length;
        require(amounts.length == len, "bAssets and amounts lengths");
        uint256 sUsdTotal;
        for (uint256 i = 0; i < len; i++) {
            sUsdTotal += amounts[i];
        }

        // transfer sUSD to this contracts
        sUSD.safeTransferFrom(funderAccount, address(this), sUsdTotal);

        // Approve zUSD contract to transfer sUSD from this contract
        IERC20(sUSD).safeApprove(address(zUsdV1), sUsdTotal);

        uint256 output;
        for (uint256 i = 0; i < len; i++) {
            // Swap sUSD for bAsset using zUSD to balance the bAsset
            output = zUsdV1.swap(address(sUSD), bAssets[i], amounts[i], address(this));

            // Send the swap output back to the funder account
            IERC20(bAssets[i]).safeTransfer(funderAccount, output);
        }
    }
}