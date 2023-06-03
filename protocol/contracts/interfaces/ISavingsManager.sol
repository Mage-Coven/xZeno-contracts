// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

/**
 * @title ISavingsManager
 */
interface ISavingsManager {
    /** @dev Admin privs */
    function distributeUnallocatedInterest(address _zAsset) external;

    /** @dev Liquidator */
    function depositLiquidation(address _zAsset, uint256 _liquidation) external;

    /** @dev Liquidator */
    function collectAndStreamInterest(address _zAsset) external;

    /** @dev Public privs */
    function collectAndDistributeInterest(address _zAsset) external;

    /** @dev getter for public lastBatchCollected mapping */
    function lastBatchCollected(address _zAsset) external view returns (uint256);
}
