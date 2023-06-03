// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

import { ISavingsManager } from "../interfaces/ISavingsManager.sol";
import { ImmutableModule } from "../shared/ImmutableModule.sol";

/**
 * @title Collector
 * @dev Distributes unallocated interest across multiple zAssets via savingsManager
 */
contract Collector is ImmutableModule {
    constructor(address _nexus) ImmutableModule(_nexus) {}

    /**
     * @dev Distributes the interest accrued across multiple zAssets, optionally
     * calling collectAndDistribute beforehand.
     */
    function distributeInterest(address[] calldata _zAssets, bool _collectFirst) external {
        ISavingsManager savingsManager = ISavingsManager(_savingsManager());
        uint256 len = _zAssets.length;
        require(len > 0, "Invalid inputs");
        for (uint256 i = 0; i < len; i++) {
            if (_collectFirst) savingsManager.collectAndDistributeInterest(_zAssets[i]);

            savingsManager.distributeUnallocatedInterest(_zAssets[i]);
        }
    }
}
