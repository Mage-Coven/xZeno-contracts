// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

import { Zasset, InvariantConfig } from "../../zasset/Zasset.sol";
import { ZassetLogic } from "../../zasset/ZassetLogic.sol";

contract ExposedZasset is Zasset {
    constructor(address _nexus, uint256 _recolFee) Zasset(_nexus, _recolFee) {}

    uint256 private amountToMint = 0;

    function getK() external view returns (uint256 k) {
        (, k) = ZassetLogic.computePrice(data.bAssetData, _getConfig());
    }

    function getA() public view returns (uint256) {
        return super._getA();
    }

    function simulateRedeemZasset(
        uint256 _amt,
        uint256[] calldata _minOut,
        uint256 _recolFee
    ) external {
        // Get config before burning. Burn > CacheSize
        InvariantConfig memory config = _getConfig();
        config.recolFee = _recolFee;
        ZassetLogic.redeemProportionately(data, config, _amt, _minOut, msg.sender);
    }

    // Inject amount of tokens to mint
    function setAmountForCollectInterest(uint256 _amount) public {
        amountToMint = _amount;
    }
}
