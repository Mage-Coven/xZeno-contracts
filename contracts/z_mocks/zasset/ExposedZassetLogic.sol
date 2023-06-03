// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

import "../../zasset/ZassetStructs.sol";
import { ZassetLogic } from "../../zasset/ZassetLogic.sol";

contract ExposedZassetLogic {
    function computeMint(
        BassetData[] memory _bAssets,
        uint8 _i,
        uint256 _rawInput,
        InvariantConfig memory _config
    ) public pure returns (uint256 mintAmount) {
        return ZassetLogic.computeMint(_bAssets, _i, _rawInput, _config);
    }

    function computeMintMulti(
        BassetData[] memory _bAssets,
        uint8[] memory _indices,
        uint256[] memory _rawInputs,
        InvariantConfig memory _config
    ) public pure returns (uint256 mintAmount) {
        return ZassetLogic.computeMintMulti(_bAssets, _indices, _rawInputs, _config);
    }

    function computeSwap(
        BassetData[] memory _bAssets,
        uint8 _i,
        uint8 _o,
        uint256 _rawInput,
        uint256 _feeRate,
        InvariantConfig memory _config
    ) public pure returns (uint256 bAssetOutputQuantity, uint256 scaledSwapFee) {
        return ZassetLogic.computeSwap(_bAssets, _i, _o, _rawInput, _feeRate, _config);
    }

    function computeRedeem(
        BassetData[] memory _bAssets,
        uint8 _o,
        uint256 _netZassetQuantity,
        InvariantConfig memory _config,
        uint256 _feeRate
    ) public pure returns (uint256 rawOutputUnits, uint256 scaledFee) {
        return ZassetLogic.computeRedeem(_bAssets, _o, _netZassetQuantity, _config, _feeRate);
    }

    function computeRedeemExact(
        BassetData[] memory _bAssets,
        uint8[] memory _indices,
        uint256[] memory _rawOutputs,
        InvariantConfig memory _config,
        uint256 _feeRate
    ) public pure returns (uint256 grossZasset, uint256 fee) {
        return ZassetLogic.computeRedeemExact(_bAssets, _indices, _rawOutputs, _config, _feeRate);
    }

    function getK(BassetData[] memory _bAssets, InvariantConfig memory _config)
        external
        pure
        returns (uint256 k)
    {
        (, k) = ZassetLogic.computePrice(_bAssets, _config);
    }
}
