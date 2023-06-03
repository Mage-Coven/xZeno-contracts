// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

import { IRevenueRecipient } from "../interfaces/IRevenueRecipient.sol";
import { ImmutableModule } from "../shared/ImmutableModule.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title   RevenueForwarder
 * @author  xZeno
 * @notice  Sends to trusted forwarded
 * @dev     VERSION: 1.0
 *          DATE:    2021-10-26
 */
contract RevenueForwarder is IRevenueRecipient, ImmutableModule {
    using SafeERC20 for IERC20;

    event RevenueReceived(address indexed zAsset, uint256 amountIn);
    event Withdrawn(uint256 amountOut);
    event SetForwarder(address indexed newForwarder);

    IERC20 public immutable zAsset;

    address public forwarder;

    constructor(
        address _nexus,
        address _zAsset,
        address _forwarder
    ) ImmutableModule(_nexus) {
        require(_zAsset != address(0), "zAsset is zero");
        require(_forwarder != address(0), "Forwarder is zero");

        zAsset = IERC20(_zAsset);
        forwarder = _forwarder;
    }

    /**
     * @dev Simply transfers the zAsset from the sender to here
     * @param _zAsset Address of zAsset
     * @param _amount Units of zAsset collected
     */
    function notifyRedistributionAmount(address _zAsset, uint256 _amount) external override {
        require(_zAsset == address(zAsset), "Recipient is not zAsset");
        // Transfer from sender to here
        IERC20(_zAsset).safeTransferFrom(msg.sender, address(this), _amount);

        emit RevenueReceived(_zAsset, _amount);
    }

    /**
     * @dev Withdraws to forwarder
     */
    function forward() external onlyKeeperOrGovernor {
        uint256 amt = zAsset.balanceOf(address(this));
        if (amt == 0) {
            return;
        }

        zAsset.safeTransfer(forwarder, amt);

        emit Withdrawn(amt);
    }

    /**
     * @dev Sets details
     * @param _forwarder new forwarder
     */
    function setConfig(address _forwarder) external onlyGovernor {
        require(_forwarder != address(0), "Invalid forwarder");
        forwarder = _forwarder;

        emit SetForwarder(_forwarder);
    }

    /**
     * @dev Abstract override
     */
    function depositToPool(
        address[] calldata, /* _zAssets */
        uint256[] calldata /* _percentages */
    ) external override {}
}
