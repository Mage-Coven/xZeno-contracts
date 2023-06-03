// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.6;

import { IEmissionsController } from "../interfaces/IEmissionsController.sol";
import { IZasset } from "../interfaces/IZasset.sol";
import { IRevenueRecipient } from "../interfaces/IRevenueRecipient.sol";
import { DialData } from "../emissions/EmissionsController.sol";
import { ImmutableModule } from "../shared/ImmutableModule.sol";
import { Initializable } from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IUniswapV3SwapRouter } from "../peripheral/Uniswap/IUniswapV3SwapRouter.sol";

struct RevenueBuyBackConfig {
    // Minimum price of bAssets compared to zAssets scaled to 1e18 (CONFIG_SCALE).
    uint128 minZasset2BassetPrice;
    // Minimum price of rewards token compared to bAssets scaled to 1e18 (CONFIG_SCALE).
    uint128 minBasset2RewardsPrice;
    // base asset of the zAsset that is being redeemed and then sold for reward tokens.
    address bAsset;
    // Uniswap V3 path
    bytes uniswapPath;
}

/**
 * @title   RevenueBuyBack
 * @author  xZeno
 * @notice  Uses protocol revenue to buy MTA rewards for stakers.
 * @dev     VERSION: 1.0
 *          DATE:    2021-11-09
 */
contract RevenueBuyBack is IRevenueRecipient, Initializable, ImmutableModule {
    using SafeERC20 for IERC20;

    event RevenueReceived(address indexed zAsset, uint256 amountIn);
    event BuyBackRewards(
        address indexed zAsset,
        uint256 zAssetAmount,
        uint256 bAssetAmount,
        uint256 rewardsAmount
    );
    event DonatedRewards(uint256 totalRewards);
    event AddedZassetConfig(
        address indexed zAsset,
        address indexed bAsset,
        uint128 minZasset2BassetPrice,
        uint128 minBasset2RewardsPrice,
        bytes uniswapPath
    );
    event AddedStakingContract(uint16 stakingDialId);

    /// @notice scale of the `minZasset2BassetPrice` and `minBasset2RewardsPrice` configuration properties.
    uint256 public constant CONFIG_SCALE = 1e18;

    /// @notice address of the rewards token that is being purchased. eg MTA
    IERC20 public immutable REWARDS_TOKEN;
    /// @notice address of the Emissions Controller that does the weekly MTA reward emissions based off on-chain voting power.
    IEmissionsController public immutable EMISSIONS_CONTROLLER;
    /// @notice Uniswap V3 Router address
    IUniswapV3SwapRouter public immutable UNISWAP_ROUTER;

    /// @notice Mapping of zAssets to RevenueBuyBack config
    mapping(address => RevenueBuyBackConfig) public zassetConfig;
    /// @notice Emissions Controller dial ids for all staking contracts that will receive reward tokens.
    uint256[] public stakingDialIds;

    /**
     * @param _nexus xZeno system Nexus address
     * @param _rewardsToken Rewards token address that are purchased. eg MTA
     * @param _uniswapRouter Uniswap V3 Router address
     * @param _emissionsController Emissions Controller address that rewards tokens are donated to.
     */
    constructor(
        address _nexus,
        address _rewardsToken,
        address _uniswapRouter,
        address _emissionsController
    ) ImmutableModule(_nexus) {
        require(_rewardsToken != address(0), "Rewards token is zero");
        REWARDS_TOKEN = IERC20(_rewardsToken);

        require(_uniswapRouter != address(0), "Uniswap Router is zero");
        UNISWAP_ROUTER = IUniswapV3SwapRouter(_uniswapRouter);

        require(_emissionsController != address(0), "Emissions controller is zero");
        EMISSIONS_CONTROLLER = IEmissionsController(_emissionsController);
    }

    /**
     * @param _stakingDialIds Emissions Controller dial ids for all staking contracts that will receive reward tokens.
     */
    function initialize(uint16[] memory _stakingDialIds) external initializer {
        for (uint256 i = 0; i < _stakingDialIds.length; i++) {
            _addStakingContract(_stakingDialIds[i]);
        }

        // RevenueBuyBack approves the Emissions Controller to transfer rewards. eg MTA
        REWARDS_TOKEN.safeApprove(address(EMISSIONS_CONTROLLER), type(uint256).max);
    }

    /***************************************
                    EXTERNAL
    ****************************************/

    /**
     * @dev Simply transfers the zAsset from the sender to here
     * @param _zAsset Address of zAsset
     * @param _amount Units of zAsset collected
     */
    function notifyRedistributionAmount(address _zAsset, uint256 _amount) external override {
        require(zassetConfig[_zAsset].bAsset != address(0), "Invalid zAsset");

        // Transfer from sender to here
        IERC20(_zAsset).safeTransferFrom(msg.sender, address(this), _amount);

        emit RevenueReceived(_zAsset, _amount);
    }

    /**
     * @notice Buys reward tokens, eg MTA, using zAssets like zUSD or zBTC from protocol revenue.
     * @param _zAssets Addresses of zAssets that are to be sold for rewards. eg zUSD and zBTC.
     */
    function buyBackRewards(address[] calldata _zAssets) external onlyKeeperOrGovernor {
        uint256 len = _zAssets.length;
        require(len > 0, "Invalid args");

        // for each zAsset
        for (uint256 i = 0; i < len; i++) {
            // Get config for zAsset
            RevenueBuyBackConfig memory config = zassetConfig[_zAssets[i]];
            require(config.bAsset != address(0), "Invalid zAsset");

            // STEP 1 - Redeem zAssets for bAssets
            IZasset zAsset = IZasset(_zAssets[i]);
            uint256 zAssetBal = IERC20(_zAssets[i]).balanceOf(address(this));
            uint256 minBassetOutput = (zAssetBal * config.minZasset2BassetPrice) / CONFIG_SCALE;
            uint256 bAssetAmount = zAsset.redeem(
                config.bAsset,
                zAssetBal,
                minBassetOutput,
                address(this)
            );

            // STEP 2 - Swap bAssets for rewards using Uniswap V3
            IERC20(config.bAsset).safeApprove(address(UNISWAP_ROUTER), bAssetAmount);
            uint256 minRewardsAmount = (bAssetAmount * config.minBasset2RewardsPrice) /
                CONFIG_SCALE;
            IUniswapV3SwapRouter.ExactInputParams memory param = IUniswapV3SwapRouter
            .ExactInputParams(
                config.uniswapPath,
                address(this),
                block.timestamp,
                bAssetAmount,
                minRewardsAmount
            );
            uint256 rewardsAmount = UNISWAP_ROUTER.exactInput(param);

            emit BuyBackRewards(_zAssets[i], zAssetBal, bAssetAmount, rewardsAmount);
        }
    }

    /**
     * @notice donates purchased rewards, eg MTA, to staking contracts via the Emissions Controller.
     */
    function donateRewards() external onlyKeeperOrGovernor {
        // STEP 1 - Get the voting power of the staking contracts
        uint256 numberStakingContracts = stakingDialIds.length;
        uint256[] memory votingPower = new uint256[](numberStakingContracts);
        uint256 totalVotingPower;
        // Get the voting power of each staking contract
        for (uint256 i = 0; i < numberStakingContracts; i++) {
            address stakingContractAddress = EMISSIONS_CONTROLLER.getDialRecipient(
                stakingDialIds[i]
            );
            require(stakingContractAddress != address(0), "invalid dial id");

            votingPower[i] = IERC20(stakingContractAddress).totalSupply();
            totalVotingPower += votingPower[i];
        }
        require(totalVotingPower > 0, "No voting power");

        // STEP 2 - Get rewards that need to be distributed
        uint256 rewardsBal = REWARDS_TOKEN.balanceOf(address(this));
        require(rewardsBal > 0, "No rewards to donate");

        // STEP 3 - Calculate rewards for each staking contract
        uint256[] memory rewardDonationAmounts = new uint256[](numberStakingContracts);
        for (uint256 i = 0; i < numberStakingContracts; i++) {
            rewardDonationAmounts[i] = (rewardsBal * votingPower[i]) / totalVotingPower;
        }

        // STEP 4 - donate rewards to staking contract dials in the Emissions Controller
        EMISSIONS_CONTROLLER.donate(stakingDialIds, rewardDonationAmounts);

        // To get a details split of rewards to staking contracts,
        // see the `DonatedRewards` event on the `EmissionsController`
        emit DonatedRewards(rewardsBal);
    }

    /***************************************
                    ADMIN
    ****************************************/

    /**
     * @notice Adds or updates rewards buyback config for a zAsset.
     * @param _zAsset Address of the meta asset that is received as protocol revenue.
     * @param _bAsset Address of the base asset that is redeemed from the zAsset.
     * @param _minZasset2BassetPrice Minimum price of bAssets compared to zAssets scaled to 1e18 (CONFIG_SCALE).
     * eg USDC/zUSD and wBTC/zBTC exchange rates.
     * USDC has 6 decimal places so `minZasset2BassetPrice` with no slippage is 1e6.
     * If a 2% slippage is allowed, the `minZasset2BassetPrice` is 98e4.
     * WBTC has 8 decimal places so `minZasset2BassetPrice` with no slippage is 1e8.
     * If a 5% slippage is allowed, the `minZasset2BassetPrice` is 95e6.
     * @param _minBasset2RewardsPrice Minimum price of rewards token compared to bAssets scaled to 1e18 (CONFIG_SCALE).
     * eg USDC/MTA and wBTC/MTA exchange rates scaled to 1e18.
     * USDC only has 6 decimal places
     * 2 MTA/USDC = 0.5 USDC/MTA * (1e18 / 1e6) * 1e18 = 0.5e30 = 5e29
     * wBTC only has 8 decimal places
     * 0.000033 MTA/wBTC = 30,000 WBTC/MTA * (1e18 / 1e8) * 1e18 = 3e4 * 1e28 = 3e32
     * @param _uniswapPath The Uniswap V3 bytes encoded path.
     */
    function setZassetConfig(
        address _zAsset,
        address _bAsset,
        uint128 _minZasset2BassetPrice,
        uint128 _minBasset2RewardsPrice,
        bytes calldata _uniswapPath
    ) external onlyGovernor {
        require(_zAsset != address(0), "zAsset token is zero");
        require(_bAsset != address(0), "bAsset token is zero");
        // bAsset slippage must be plus or minus 10%
        require(_minZasset2BassetPrice > 0, "Invalid min bAsset price");
        require(_minBasset2RewardsPrice > 0, "Invalid min reward price");
        require(
            _validUniswapPath(_bAsset, address(REWARDS_TOKEN), _uniswapPath),
            "Invalid uniswap path"
        );

        zassetConfig[_zAsset] = RevenueBuyBackConfig({
            bAsset: _bAsset,
            minZasset2BassetPrice: _minZasset2BassetPrice,
            minBasset2RewardsPrice: _minBasset2RewardsPrice,
            uniswapPath: _uniswapPath
        });

        emit AddedZassetConfig(
            _zAsset,
            _bAsset,
            _minZasset2BassetPrice,
            _minBasset2RewardsPrice,
            _uniswapPath
        );
    }

    /**
     * @notice Adds a new staking contract that will receive MTA rewards
     * @param _stakingDialId dial identifier from the Emissions Controller of the staking contract.
     */
    function addStakingContract(uint16 _stakingDialId) external onlyGovernor {
        _addStakingContract(_stakingDialId);
    }

    function _addStakingContract(uint16 _stakingDialId) internal {
        for (uint256 i = 0; i < stakingDialIds.length; i++) {
            require(stakingDialIds[i] != _stakingDialId, "Staking dial id already exists");
        }
        // Make sure the dial id of the staking contract is valid
        require(
            EMISSIONS_CONTROLLER.getDialRecipient(_stakingDialId) != address(0),
            "Missing staking dial"
        );

        stakingDialIds.push(_stakingDialId);

        emit AddedStakingContract(_stakingDialId);
    }

    /**
     * @notice Validates a given uniswap path - valid if sellToken at position 0 and bAsset at end
     * @param _sellToken Token harvested from the integration contract
     * @param _bAsset New asset to buy on Uniswap
     * @param _uniswapPath The Uniswap V3 bytes encoded path.
     */
    function _validUniswapPath(
        address _sellToken,
        address _bAsset,
        bytes calldata _uniswapPath
    ) internal pure returns (bool) {
        uint256 len = _uniswapPath.length;
        require(_uniswapPath.length >= 43, "Uniswap path too short");
        // check sellToken is first 20 bytes and bAsset is the last 20 bytes of the uniswap path
        return
            keccak256(abi.encodePacked(_sellToken)) ==
            keccak256(abi.encodePacked(_uniswapPath[0:20])) &&
            keccak256(abi.encodePacked(_bAsset)) ==
            keccak256(abi.encodePacked(_uniswapPath[len - 20:len]));
    }

    /**
     * @dev Abstract override
     */
    function depositToPool(
        address[] calldata, /* _zAssets */
        uint256[] calldata /* _percentages */
    ) external override {}
}