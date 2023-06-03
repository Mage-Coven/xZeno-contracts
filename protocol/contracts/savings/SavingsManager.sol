// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

// External
import { IZasset } from "../interfaces/IZasset.sol";
import { ISavingsContractV2 } from "../interfaces/ISavingsContract.sol";

// Internal
import { IRevenueRecipient } from "../interfaces/IRevenueRecipient.sol";
import { ISavingsManager } from "../interfaces/ISavingsManager.sol";
import { PausableModule } from "../shared/PausableModule.sol";

// Libs
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { StableMath } from "../shared/StableMath.sol";
import { YieldValidator } from "../shared/YieldValidator.sol";

/**
 * @title   SavingsManager
 * @author  xZeno
 * @notice  Savings Manager collects interest from zAssets and sends them to the
 *          corresponding Savings Contract, performing some validation in the process.
 * @dev     VERSION: 1.4
 *          DATE:    2021-10-15
 */
contract SavingsManager is ISavingsManager, PausableModule {
    using StableMath for uint256;
    using SafeERC20 for IERC20;

    // Core admin events
    event RevenueRecipientSet(address indexed zAsset, address recipient);
    event SavingsContractAdded(address indexed zAsset, address savingsContract);
    event SavingsContractUpdated(address indexed zAsset, address savingsContract);
    event SavingsRateChanged(uint256 newSavingsRate);
    event StreamsFrozen();
    // Interest collection
    event LiquidatorDeposited(address indexed zAsset, uint256 amount);
    event InterestCollected(
        address indexed zAsset,
        uint256 interest,
        uint256 newTotalSupply,
        uint256 apy
    );
    event InterestDistributed(address indexed zAsset, uint256 amountSent);
    event RevenueRedistributed(address indexed zAsset, address recipient, uint256 amount);

    // Locations of each zAsset savings contract
    mapping(address => ISavingsContractV2) public savingsContracts;
    mapping(address => IRevenueRecipient) public revenueRecipients;
    // Time at which last collection was made
    mapping(address => uint256) public lastPeriodStart;
    mapping(address => uint256) public lastCollection;
    mapping(address => uint256) public periodYield;

    // Amount of collected interest that will be sent to Savings Contract (1e18 = 100%)
    uint256 private savingsRate;
    // Streaming liquidated tokens
    uint256 private immutable DURATION; // measure in days. eg 1 days or 7 days
    uint256 private constant ONE_DAY = 1 days;
    uint256 private constant THIRTY_MINUTES = 30 minutes;
    // Streams
    bool private streamsFrozen = false;
    // Liquidator
    mapping(address => Stream) public liqStream;
    // Platform
    mapping(address => Stream) public yieldStream;
    // Batches are for the platformInterest collection
    mapping(address => uint256) public override lastBatchCollected;

    enum StreamType {
        liquidator,
        yield
    }

    struct Stream {
        uint256 end;
        uint256 rate;
    }

    constructor(
        address _nexus,
        address[] memory _zAssets,
        address[] memory _savingsContracts,
        address[] memory _revenueRecipients,
        uint256 _savingsRate,
        uint256 _duration
    ) PausableModule(_nexus) {
        uint256 len = _zAssets.length;
        require(
            _savingsContracts.length == len && _revenueRecipients.length == len,
            "Invalid inputs"
        );
        for (uint256 i = 0; i < len; i++) {
            _updateSavingsContract(_zAssets[i], _savingsContracts[i]);
            emit SavingsContractAdded(_zAssets[i], _savingsContracts[i]);

            revenueRecipients[_zAssets[i]] = IRevenueRecipient(_revenueRecipients[i]);
            emit RevenueRecipientSet(_zAssets[i], _revenueRecipients[i]);
        }
        savingsRate = _savingsRate;
        DURATION = _duration;
    }

    modifier onlyLiquidator() {
        require(msg.sender == _liquidator(), "Only liquidator can execute");
        _;
    }

    modifier whenStreamsNotFrozen() {
        require(!streamsFrozen, "Streaming is currently frozen");
        _;
    }

    /***************************************
                    STATE
    ****************************************/

    /**
     * @dev Adds a new savings contract
     * @param _zAsset           Address of underlying zAsset
     * @param _savingsContract  Address of the savings contract
     */
    function addSavingsContract(address _zAsset, address _savingsContract) external onlyGovernor {
        require(
            address(savingsContracts[_zAsset]) == address(0),
            "Savings contract already exists"
        );
        _updateSavingsContract(_zAsset, _savingsContract);
        emit SavingsContractAdded(_zAsset, _savingsContract);
    }

    /**
     * @dev Updates an existing savings contract
     * @param _zAsset           Address of underlying zAsset
     * @param _savingsContract  Address of the savings contract
     */
    function updateSavingsContract(address _zAsset, address _savingsContract)
        external
        onlyGovernor
    {
        require(
            address(savingsContracts[_zAsset]) != address(0),
            "Savings contract does not exist"
        );
        _updateSavingsContract(_zAsset, _savingsContract);
        emit SavingsContractUpdated(_zAsset, _savingsContract);
    }

    function _updateSavingsContract(address _zAsset, address _savingsContract) internal {
        require(_zAsset != address(0) && _savingsContract != address(0), "Must be valid address");
        savingsContracts[_zAsset] = ISavingsContractV2(_savingsContract);

        IERC20(_zAsset).safeApprove(address(_savingsContract), 0);
        IERC20(_zAsset).safeApprove(address(_savingsContract), type(uint256).max);
    }

    /**
     * @dev Freezes streaming of zAssets
     */
    function freezeStreams() external onlyGovernor whenStreamsNotFrozen {
        streamsFrozen = true;

        emit StreamsFrozen();
    }

    /**
     * @dev Sets the revenue recipient address
     * @param _zAsset           Address of underlying zAsset
     * @param _recipient        Address of the recipient
     */
    function setRevenueRecipient(address _zAsset, address _recipient) external onlyGovernor {
        revenueRecipients[_zAsset] = IRevenueRecipient(_recipient);

        emit RevenueRecipientSet(_zAsset, _recipient);
    }

    /**
     * @dev Sets a new savings rate for interest distribution
     * @param _savingsRate   Rate of savings sent to SavingsContract (100% = 1e18)
     */
    function setSavingsRate(uint256 _savingsRate) external onlyGovernor {
        // Greater than 25% up to 100%
        require(_savingsRate >= 25e16 && _savingsRate <= 1e18, "Must be a valid rate");
        savingsRate = _savingsRate;
        emit SavingsRateChanged(_savingsRate);
    }

    /**
     * @dev Allows the liquidator to deposit proceeds from liquidated gov tokens.
     * Transfers proceeds on a second by second basis to the Savings Contract over 1 week.
     * @param _zAsset The zAsset to transfer and distribute
     * @param _liquidated Units of zAsset to distribute
     */
    function depositLiquidation(address _zAsset, uint256 _liquidated)
        external
        override
        whenNotPaused
        onlyLiquidator
        whenStreamsNotFrozen
    {
        // Collect existing interest to ensure everything is up to date
        _collectAndDistributeInterest(_zAsset);

        // transfer liquidated zUSD to here
        IERC20(_zAsset).safeTransferFrom(_liquidator(), address(this), _liquidated);

        uint256 leftover = _unstreamedRewards(_zAsset, StreamType.liquidator);
        _initialiseStream(_zAsset, StreamType.liquidator, _liquidated + leftover, DURATION);

        emit LiquidatorDeposited(_zAsset, _liquidated);
    }

    /**
     * @dev Collects the platform interest from a given zAsset and then adds capital to the
     * stream. If there is > 24h left in current stream, just top it up, otherwise reset.
     * @param _zAsset The zAsset to fetch interest
     */
    function collectAndStreamInterest(address _zAsset)
        external
        override
        whenNotPaused
        whenStreamsNotFrozen
    {
        // Collect existing interest to ensure everything is up to date
        _collectAndDistributeInterest(_zAsset);

        uint256 currentTime = block.timestamp;
        uint256 previousBatch = lastBatchCollected[_zAsset];
        uint256 timeSincePreviousBatch = currentTime - previousBatch;
        require(timeSincePreviousBatch > 6 hours, "Cannot deposit twice in 6 hours");
        lastBatchCollected[_zAsset] = currentTime;

        // Batch collect
        (uint256 interestCollected, uint256 totalSupply) = IZasset(_zAsset)
        .collectPlatformInterest();

        if (interestCollected > 0) {
            // Validate APY
            uint256 apy = YieldValidator.validateCollection(
                totalSupply,
                interestCollected,
                timeSincePreviousBatch
            );

            // Get remaining rewards
            uint256 leftover = _unstreamedRewards(_zAsset, StreamType.yield);
            _initialiseStream(_zAsset, StreamType.yield, interestCollected + leftover, ONE_DAY);

            emit InterestCollected(_zAsset, interestCollected, totalSupply, apy);
        } else {
            emit InterestCollected(_zAsset, interestCollected, totalSupply, 0);
        }
    }

    /**
     * @dev Calculates how many rewards from the stream are still to be distributed, from the
     * last collection time to the end of the stream.
     * @param _zAsset The zAsset in question
     * @return leftover The total amount of zAsset that is yet to be collected from a stream
     */
    function _unstreamedRewards(address _zAsset, StreamType _stream)
        internal
        view
        returns (uint256 leftover)
    {
        uint256 lastUpdate = lastCollection[_zAsset];

        Stream memory stream = _stream == StreamType.liquidator
            ? liqStream[_zAsset]
            : yieldStream[_zAsset];
        uint256 unclaimedSeconds = 0;
        if (lastUpdate < stream.end) {
            unclaimedSeconds = stream.end - lastUpdate;
        }
        return unclaimedSeconds * stream.rate;
    }

    /**
     * @dev Simply sets up the stream
     * @param _zAsset The zAsset in question
     * @param _amount Amount of units to stream
     * @param _duration Duration of the stream, from now
     */
    function _initialiseStream(
        address _zAsset,
        StreamType _stream,
        uint256 _amount,
        uint256 _duration
    ) internal {
        uint256 currentTime = block.timestamp;
        // Distribute reward per second over X seconds
        uint256 rate = _amount / _duration;
        uint256 end = currentTime + _duration;
        if (_stream == StreamType.liquidator) {
            liqStream[_zAsset] = Stream(end, rate);
        } else {
            yieldStream[_zAsset] = Stream(end, rate);
        }

        // Reset pool data to enable lastCollection usage twice
        require(lastCollection[_zAsset] == currentTime, "Stream data must be up to date");
    }

    /***************************************
                COLLECTION
    ****************************************/

    /**
     * @dev Collects interest from a target zAsset and distributes to the SavingsContract.
     *      Applies constraints such that the max APY since the last fee collection cannot
     *      exceed the "MAX_APY" variable.
     * @param _zAsset       zAsset for which the interest should be collected
     */
    function collectAndDistributeInterest(address _zAsset) external override whenNotPaused {
        _collectAndDistributeInterest(_zAsset);
    }

    function _collectAndDistributeInterest(address _zAsset) internal {
        ISavingsContractV2 savingsContract = savingsContracts[_zAsset];
        require(address(savingsContract) != address(0), "Must have a valid savings contract");

        // Get collection details
        uint256 recentPeriodStart = lastPeriodStart[_zAsset];
        uint256 previousCollection = lastCollection[_zAsset];
        lastCollection[_zAsset] = block.timestamp;

        // 1. Collect the new interest from the zAsset
        IZasset zAsset = IZasset(_zAsset);
        (uint256 interestCollected, uint256 totalSupply) = zAsset.collectInterest();

        // 2. Update all the time stamps
        //    Avoid division by 0 by adding a minimum elapsed time of 1 second
        uint256 timeSincePeriodStart = StableMath.max(1, block.timestamp - recentPeriodStart);
        uint256 timeSinceLastCollection = StableMath.max(1, block.timestamp - previousCollection);

        uint256 inflationOperand = interestCollected;
        //    If it has been 30 mins since last collection, reset period data
        if (timeSinceLastCollection > THIRTY_MINUTES) {
            lastPeriodStart[_zAsset] = block.timestamp;
            periodYield[_zAsset] = 0;
        }
        //    Else if period has elapsed, start a new period from the lastCollection time
        else if (timeSincePeriodStart > THIRTY_MINUTES) {
            lastPeriodStart[_zAsset] = previousCollection;
            periodYield[_zAsset] = interestCollected;
        }
        //    Else add yield to period yield
        else {
            inflationOperand = periodYield[_zAsset] + interestCollected;
            periodYield[_zAsset] = inflationOperand;
        }

        //    Add on liquidated
        uint256 newReward = _unclaimedRewards(_zAsset, previousCollection);
        // 3. Validate that interest is collected correctly and does not exceed max APY
        if (interestCollected > 0 || newReward > 0) {
            require(
                IERC20(_zAsset).balanceOf(address(this)) >= interestCollected + newReward,
                "Must receive zUSD"
            );

            uint256 extrapolatedAPY = YieldValidator.validateCollection(
                totalSupply,
                inflationOperand,
                timeSinceLastCollection
            );

            emit InterestCollected(_zAsset, interestCollected, totalSupply, extrapolatedAPY);

            // 4. Distribute the interest
            //    Calculate the share for savers (95e16 or 95%)
            uint256 saversShare = (interestCollected + newReward).mulTruncate(savingsRate);

            //    Call depositInterest on contract
            savingsContract.depositInterest(saversShare);

            emit InterestDistributed(_zAsset, saversShare);
        } else {
            emit InterestCollected(_zAsset, 0, totalSupply, 0);
        }
    }

    /**
     * @dev Calculates unclaimed rewards from the liquidation stream
     * @param _zAsset zAsset key
     * @param _previousCollection Time of previous collection
     * @return Units of zAsset that have been unlocked for distribution
     */
    function _unclaimedRewards(address _zAsset, uint256 _previousCollection)
        internal
        view
        returns (uint256)
    {
        Stream memory liq = liqStream[_zAsset];
        uint256 unclaimedSeconds_liq = _unclaimedSeconds(_previousCollection, liq.end);
        uint256 subtotal_liq = unclaimedSeconds_liq * liq.rate;

        Stream memory yield = yieldStream[_zAsset];
        uint256 unclaimedSeconds_yield = _unclaimedSeconds(_previousCollection, yield.end);
        uint256 subtotal_yield = unclaimedSeconds_yield * yield.rate;

        return subtotal_liq + subtotal_yield;
    }

    /**
     * @dev Calculates the seconds of unclaimed rewards, based on period length
     * @param _lastUpdate Time of last update
     * @param _end End time of period
     * @return Seconds of stream that should be compensated
     */
    function _unclaimedSeconds(uint256 _lastUpdate, uint256 _end) internal view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 unclaimedSeconds = 0;

        if (currentTime <= _end) {
            unclaimedSeconds = currentTime - _lastUpdate;
        } else if (_lastUpdate < _end) {
            unclaimedSeconds = _end - _lastUpdate;
        }
        return unclaimedSeconds;
    }

    /***************************************
            Revenue Redistribution
    ****************************************/

    /**
     * @dev Redistributes the unallocated interest to the saved recipient, allowing
     * the siphoned assets to be used elsewhere in the system
     * @param _zAsset  zAsset to collect
     */
    function distributeUnallocatedInterest(address _zAsset) external override {
        IRevenueRecipient recipient = revenueRecipients[_zAsset];
        require(address(recipient) != address(0), "Must have valid recipient");

        IERC20 zAsset = IERC20(_zAsset);
        uint256 balance = zAsset.balanceOf(address(this));
        uint256 leftover_liq = _unstreamedRewards(_zAsset, StreamType.liquidator);
        uint256 leftover_yield = _unstreamedRewards(_zAsset, StreamType.yield);

        uint256 unallocated = balance - leftover_liq - leftover_yield;

        zAsset.approve(address(recipient), unallocated);
        recipient.notifyRedistributionAmount(_zAsset, unallocated);

        emit RevenueRedistributed(_zAsset, address(recipient), unallocated);
    }
}
