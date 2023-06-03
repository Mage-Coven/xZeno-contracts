// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;
pragma abicoder v2;

import { StakedToken } from "./StakedToken.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IBVault, ExitPoolRequest } from "./interfaces/IBVault.sol";
import { IBalancerGauge } from "../../peripheral/Balancer/IBalancerGauge.sol";

/**
 * @title StakedTokenBPT
 * @dev Derives from StakedToken, and simply adds the ability to withdraw any unclaimed $BAL tokens
 * that are at this address
 **/
contract StakedTokenBPT is StakedToken {
    using SafeERC20 for IERC20;

    /// @notice Balancer token
    IERC20 public immutable BAL;

    /// @notice Balancer vault
    IBVault public immutable balancerVault;

    /// @notice Balancer pool Id
    bytes32 public immutable poolId;

    /// @notice Balancer Pool Token Gauge. eg mBPT Gauge (mBPT-gauge)
    IBalancerGauge public immutable balancerGauge;

    /// @notice contract that can redistribute the $BAL
    /// @dev Deprecated as the $BAL recipient is now set in the BPT Gauge.
    address private balRecipient;

    /// @notice Keeper
    /// @dev  Deprecated as Keeper has been added as a module to the Nexus
    address private keeper;

    /// @notice Pending fees in BPT terms
    uint256 public pendingBPTFees;

    /// @notice Most recent PriceCoefficient
    uint256 public priceCoefficient;

    /// @notice Time of last priceCoefficient upgrade
    uint256 public lastPriceUpdateTime;

    event BalRecipientChanged(address newRecipient);
    event PriceCoefficientUpdated(uint256 newPriceCoeff);
    event FeesConverted(uint256 bpt, uint256 zeno);

    /***************************************
                    INIT
    ****************************************/

    /**
     * @param _nexus System nexus
     * @param _rewardsToken Token that is being distributed as a reward. eg Meta (ZENO)
     * @param _questManager Centralised manager of quests
     * @param _stakedToken Core token that is staked and tracked e.g. xZeno ZENO/WETH Staking BPT (mBPT)
     * @param _cooldownSeconds Seconds a user must wait after she initiates her cooldown before withdrawal is possible
     * @param _bal Balancer addresses, [0] = $BAL addr, [1] = BAL vault
     * @param _poolId Balancer Pool identifier
     * @param _balancerGauge Address of the Balancer Pool Token Gauge. eg mBPT Gauge (mBPT-gauge)
     */
    constructor(
        address _nexus,
        address _rewardsToken,
        address _questManager,
        address _stakedToken,
        uint256 _cooldownSeconds,
        address[2] memory _bal,
        bytes32 _poolId,
        address _balancerGauge
    )
        StakedToken(
            _nexus,
            _rewardsToken,
            _questManager,
            _stakedToken,
            _cooldownSeconds,
            true
        )
    {
        BAL = IERC20(_bal[0]);
        balancerVault = IBVault(_bal[1]);
        poolId = _poolId;
        balancerGauge = IBalancerGauge(_balancerGauge);
    }

    /**
     * @param _nameArg Token name
     * @param _symbolArg Token symbol
     * @param _rewardsDistributorArg xZeno Rewards Distributor
     * @param _priceCoefficient Initial pricing coefficient
     */
    function initialize(
        bytes32 _nameArg,
        bytes32 _symbolArg,
        address _rewardsDistributorArg,
        uint256 _priceCoefficient
    ) external {
        if (rewardsDistributor == address(0)) {
            __StakedToken_init(_nameArg, _symbolArg, _rewardsDistributorArg);
            priceCoefficient = _priceCoefficient;
        }

        // Staking Token contract approves the Balancer Pool Gauge to transfer the staking token. eg mBPT
        STAKED_TOKEN.safeApprove(address(balancerGauge), type(uint256).max);

        uint256 stakingBal = STAKED_TOKEN.balanceOf(address(this));

        if (stakingBal > 0) {
            balancerGauge.deposit(stakingBal);
        }
    }

    /***************************************
                BAL incentives
    ****************************************/

    /**
     * @dev Sets the recipient for any potential $BAL earnings
     */
    function setBalRecipient(address _newRecipient) external onlyGovernor {
        balancerGauge.set_rewards_receiver(_newRecipient);

        emit BalRecipientChanged(_newRecipient);
    }

    /***************************************
                    FEES
    ****************************************/

    /**
     * @dev Converts redemption fees accrued in mBPT into ZENO, before depositing to the rewards contract.
     */
    function convertFees() external nonReentrant {
        uint256 pendingBPT = pendingBPTFees;
        require(pendingBPT > 1, "no fees");
        pendingBPTFees = 1;

        // 1. Sell the mBPT
        uint256 stakingBalBefore = balancerGauge.balanceOf(address(this));
        uint256 zenoBalBefore = REWARDS_TOKEN.balanceOf(address(this));

        (address[] memory tokens, , ) = balancerVault.getPoolTokens(poolId);
        require(tokens[0] == address(REWARDS_TOKEN), "not ZENO");

        // 1.1. Calculate minimum output amount
        uint256[] memory minOut = new uint256[](2);
        {
            // 10% discount from the latest pcoeff
            // e.g. 1e18 * 42000 / 11000 = 3.81e18
            minOut[0] = (pendingBPT * priceCoefficient) / 11000;
        }

        // 1.2 Withdraw pending mBPT fees from the mBPT Gauge back to this mBPT staking contract
        balancerGauge.withdraw(pendingBPT - 1);

        // 1.3. Exits rewards (ZENO) to this staking contract for mBPT from this staking contract.
        // Assumes rewards token (ZENO) is in position 0
        balancerVault.exitPool(
            poolId,
            address(this),
            payable(address(this)),
            ExitPoolRequest(tokens, minOut, bytes(abi.encode(0, pendingBPT - 1, 0)), false)
        );

        // 2. Verify and update state
        uint256 stakingBalAfter = balancerGauge.balanceOf(address(this));
        require(
            stakingBalAfter == (stakingBalBefore - pendingBPT + 1),
            "< min BPT"
        );

        // 3. Inform HeadlessRewards about the new ZENO rewards
        uint256 received = REWARDS_TOKEN.balanceOf(address(this)) - zenoBalBefore;
        require(received >= minOut[0], "< min ZENO");
        super._notifyAdditionalReward(received);

        emit FeesConverted(pendingBPT, received);
    }

    /**
     * @dev Called by `StakedToken._withdraw` to add early withdrawal fee charged in the staking token mBPT.
     * @param _fees Units of staking token mBPT.
     */
    function _notifyAdditionalReward(uint256 _fees) internal override {
        require(_fees < 1e24, "> mil");

        pendingBPTFees += _fees;
    }

    /***************************************
                    PRICE
    ****************************************/

    /**
     * @dev Allows the governor or keeper to update the price coeff
     */
    function fetchPriceCoefficient() external onlyKeeperOrGovernor {
        require(block.timestamp > lastPriceUpdateTime + 14 days, "< 14 days");

        uint256 newPriceCoeff = getProspectivePriceCoefficient();
        uint256 oldPriceCoeff = priceCoefficient;
        uint256 diff = newPriceCoeff > oldPriceCoeff
            ? newPriceCoeff - oldPriceCoeff
            : oldPriceCoeff - newPriceCoeff;

        // e.g. 500 * 10000 / 35000 = 5000000 / 35000 = 142
        require((diff * 10000) / oldPriceCoeff > 500, "< 5% diff");
        require(newPriceCoeff > 15000 && newPriceCoeff < 75000, "Out of bounds");

        priceCoefficient = newPriceCoeff;
        lastPriceUpdateTime = block.timestamp;

        emit PriceCoefficientUpdated(newPriceCoeff);
    }

    /**
     * @dev Fetches most recent priceCoeff from the balancer pool.
     * PriceCoeff = units of ZENO per BPT, scaled to 1:1 = 10000
     * Assuming an 80/20 BPT, it is possible to calculate
     * PriceCoeff (p) = balanceOfZENO in pool (b) / bpt supply (s) / 0.8
     * p = b * 1.25 / s
     */
    function getProspectivePriceCoefficient() public view returns (uint256 newPriceCoeff) {
        (address[] memory tokens, uint256[] memory balances, ) = balancerVault.getPoolTokens(
            poolId
        );
        require(tokens[0] == address(REWARDS_TOKEN), "not ZENO");

        // Calculate units of ZENO per BPT
        // e.g. 800e18 * 125e16 / 1000e18 = 1e18
        // e.g. 1280e18 * 125e16 / 1000e18 = 16e17
        uint256 unitsPerToken = (balances[0] * 125e16) / STAKED_TOKEN.totalSupply();
        // e.g. 1e18 / 1e14 = 10000
        // e.g. 16e17 / 1e14 = 16000
        newPriceCoeff = unitsPerToken / 1e14;
    }

    /**
     * @dev Get the current priceCoeff
     */
    function _getPriceCoeff() internal view override returns (uint256 priceCoeff) {
        priceCoeff = priceCoefficient;
    }

    /***************************************
                BALANCER POOL GAUGE
    ****************************************/

    /**
     * @dev Transfers staked tokens from sender to this staking token contract,
     * deposits staked tokens in the Balancer Pool Gauge to earn rewards and
     * finally call `_settleStake`.
     */
    function _transferAndStake(
        uint256 _amount,
        address _delegatee,
        bool _exitCooldown
    ) internal override {
        STAKED_TOKEN.safeTransferFrom(_msgSender(), address(this), _amount);

        balancerGauge.deposit(_amount);

        _settleStake(_amount, _delegatee, _exitCooldown);
    }

    function _withdrawStakedTokens(
        address _recipient,
        uint256 userWithdrawal
    ) internal override {
        balancerGauge.withdraw(userWithdrawal);

        STAKED_TOKEN.safeTransfer(_recipient, userWithdrawal);
    }

    function _balanceOfStakedTokens() internal override view returns (uint256 stakedTokens) {
        stakedTokens = balancerGauge.balanceOf(address(this));
    }
}
