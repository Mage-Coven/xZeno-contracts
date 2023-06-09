// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

import { IZasset } from "../../interfaces/IZasset.sol";
import { ISavingsContractV1 } from "../../interfaces/ISavingsContract.sol";
import { IRevenueRecipient } from "../../interfaces/IRevenueRecipient.sol";
import { IERC20 } from "../shared/MockERC20.sol";

contract MockSavingsManager {
    address public immutable save;
    IRevenueRecipient public recipient;
    uint256 public rate = 1e18;

    constructor(address _save) {
        save = _save;
    }

    function collectAndDistributeInterest(address _zAsset) public {
        require(save != address(0), "Must have a valid savings contract");

        // 1. Collect the new interest from the zAsset
        IZasset zAsset = IZasset(_zAsset);
        (uint256 interestCollected, ) = zAsset.collectInterest();

        // 3. Validate that interest is collected correctly and does not exceed max APY
        if (interestCollected > 0) {
            IERC20(_zAsset).approve(save, interestCollected);

            ISavingsContractV1(save).depositInterest((interestCollected * rate) / 1e18);
        }
    }

    function setRecipient(address _recipient, uint256 _rate) public {
        recipient = IRevenueRecipient(_recipient);
        rate = _rate;
    }

    function distributeUnallocatedInterest(address _zAsset) public {
        require(save != address(0), "Must have a valid savings contract");

        uint256 bal = IERC20(_zAsset).balanceOf(address(this));
        IERC20(_zAsset).approve(save, bal);

        recipient.notifyRedistributionAmount(_zAsset, bal);
    }
}
