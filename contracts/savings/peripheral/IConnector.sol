// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

interface IConnector {
    /**
     * @notice Deposits the zAsset into the connector
     * @param _amount Units of zAsset to receive and deposit
     */
    function deposit(uint256 _amount) external;

    /**
     * @notice Withdraws a specific amount of zAsset from the connector
     * @param _amount Units of zAsset to withdraw
     */
    function withdraw(uint256 _amount) external;

    /**
     * @notice Withdraws all zAsset from the connector
     */
    function withdrawAll() external;

    /**
     * @notice Returns the available balance in the connector. In connections
     * where there is likely to be an initial dip in value due to conservative
     * exchange rates (e.g. with Curves `get_virtual_price`), it should return
     * max(deposited, balance) to avoid temporary negative yield. Any negative yield
     * should be corrected during a withdrawal or over time.
     * @return Balance of zAsset in the connector
     */
    function checkBalance() external view returns (uint256);
}
