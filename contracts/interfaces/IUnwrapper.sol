// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

/**
 * @title IUnwrapper
 */
interface IUnwrapper {
    /// @dev Estimate output
    function getUnwrapOutput(
        bool _isBassetOut,
        address _router,
        address _input,
        address _output,
        uint256 _amount
    ) external view returns (uint256 output);

    // @dev Get bAssetOut status
    function getIsBassetOut(address _masset, address _output)
        external
        view
        returns (bool isBassetOut);

    /// @dev Unwrap and send
    function unwrapAndSend(
        bool _isBassetOut,
        address _router,
        address _input,
        address _output,
        uint256 _amount,
        uint256 _minAmountOut,
        address _beneficiary
    ) external returns (uint256 outputQuantity);
}
