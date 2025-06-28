// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SafeBox
 * @dev Staking contract for NOLN tokens with lock periods and rewards
 * @notice Users can stake NOLN tokens for 30-365 days with 8% annual yield
 */
contract SafeBox is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Staking structure
    struct Stake {
        uint256 amount;
        uint256 lockUntil;
        uint256 stakedAt;
        uint256 lastRewardCalculation;
        bool isActive;
    }

    // Contract state
    IERC20 public nolnToken;
    uint256 public annualRewardRate; // Basis points (e.g., 800 = 8%)
    uint256 public minLockPeriod; // 30 days in seconds
    uint256 public maxLockPeriod; // 365 days in seconds
    uint256 public totalStaked;
    uint256 public totalRewardsPaid;

    // User stakes
    mapping(address => Stake[]) public userStakes;
    mapping(address => uint256) public userTotalStaked;
    mapping(address => uint256) public userTotalRewards;

    // Events
    event Staked(
        address indexed user,
        uint256 stakeId,
        uint256 amount,
        uint256 lockUntil
    );
    event Withdrawn(
        address indexed user,
        uint256 stakeId,
        uint256 amount,
        uint256 reward
    );
    event RewardRateUpdated(uint256 newRate);
    event LockPeriodsUpdated(uint256 minPeriod, uint256 maxPeriod);

    // Errors
    error InvalidAmount(uint256 amount);
    error InvalidLockPeriod(uint256 period);
    error StakeNotFound(uint256 stakeId);
    error StakeNotMatured(uint256 stakeId, uint256 lockUntil);
    error InsufficientBalance(
        address account,
        uint256 required,
        uint256 available
    );
    error StakeAlreadyWithdrawn(uint256 stakeId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _nolnToken,
        uint256 _annualRewardRate,
        address admin
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        nolnToken = IERC20(_nolnToken);
        annualRewardRate = _annualRewardRate; // 800 = 8%
        minLockPeriod = 30 days;
        maxLockPeriod = 365 days;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    /**
     * @dev Stake NOLN tokens for a specified lock period
     * @param amount Amount of NOLN tokens to stake
     * @param lockPeriod Lock period in seconds (30-365 days)
     */
    function stake(
        uint256 amount,
        uint256 lockPeriod
    ) external whenNotPaused nonReentrant {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        if (lockPeriod < minLockPeriod || lockPeriod > maxLockPeriod) {
            revert InvalidLockPeriod(lockPeriod);
        }

        if (nolnToken.balanceOf(msg.sender) < amount) {
            revert InsufficientBalance(
                msg.sender,
                amount,
                nolnToken.balanceOf(msg.sender)
            );
        }

        // Transfer tokens to contract
        nolnToken.safeTransferFrom(msg.sender, address(this), amount);

        // Create new stake
        uint256 lockUntil = block.timestamp + lockPeriod;
        uint256 stakeId = userStakes[msg.sender].length;

        userStakes[msg.sender].push(
            Stake({
                amount: amount,
                lockUntil: lockUntil,
                stakedAt: block.timestamp,
                lastRewardCalculation: block.timestamp,
                isActive: true
            })
        );

        userTotalStaked[msg.sender] += amount;
        totalStaked += amount;

        emit Staked(msg.sender, stakeId, amount, lockUntil);
    }

    /**
     * @dev Withdraw staked tokens and claim rewards
     * @param stakeId The ID of the stake to withdraw
     */
    function withdraw(uint256 stakeId) external whenNotPaused nonReentrant {
        if (stakeId >= userStakes[msg.sender].length) {
            revert StakeNotFound(stakeId);
        }

        Stake storage userStake = userStakes[msg.sender][stakeId];

        if (!userStake.isActive) {
            revert StakeAlreadyWithdrawn(stakeId);
        }

        if (block.timestamp < userStake.lockUntil) {
            revert StakeNotMatured(stakeId, userStake.lockUntil);
        }

        // Calculate rewards
        uint256 reward = calculateRewards(msg.sender, stakeId);
        uint256 totalAmount = userStake.amount + reward;

        // Mark stake as withdrawn
        userStake.isActive = false;

        // Update totals
        userTotalStaked[msg.sender] -= userStake.amount;
        userTotalRewards[msg.sender] += reward;
        totalStaked -= userStake.amount;
        totalRewardsPaid += reward;

        // Transfer tokens back to user
        nolnToken.safeTransfer(msg.sender, totalAmount);

        emit Withdrawn(msg.sender, stakeId, userStake.amount, reward);
    }

    /**
     * @dev Calculate rewards for a specific stake
     * @param user The user address
     * @param stakeId The stake ID
     * @return The calculated reward amount
     */
    function calculateRewards(
        address user,
        uint256 stakeId
    ) public view returns (uint256) {
        if (stakeId >= userStakes[user].length) {
            return 0;
        }

        Stake memory userStake = userStakes[user][stakeId];

        if (!userStake.isActive) {
            return 0;
        }

        uint256 endTime = block.timestamp > userStake.lockUntil
            ? userStake.lockUntil
            : block.timestamp;

        uint256 stakingDuration = endTime - userStake.stakedAt;

        if (stakingDuration == 0) {
            return 0;
        }

        // Calculate reward: (amount * rate * duration) / (365 days * 10000)
        uint256 reward = (userStake.amount *
            annualRewardRate *
            stakingDuration) / (365 days * 10000);

        return reward;
    }

    /**
     * @dev Get all stakes for a user
     * @param user The user address
     * @return Array of stakes
     */
    function getUserStakes(
        address user
    ) external view returns (Stake[] memory) {
        return userStakes[user];
    }

    /**
     * @dev Get total pending rewards for a user
     * @param user The user address
     * @return Total pending rewards
     */
    function getTotalPendingRewards(
        address user
    ) external view returns (uint256) {
        uint256 totalRewards = 0;

        for (uint256 i = 0; i < userStakes[user].length; i++) {
            if (userStakes[user][i].isActive) {
                totalRewards += calculateRewards(user, i);
            }
        }

        return totalRewards;
    }

    /**
     * @dev Get stake information
     * @param user The user address
     * @param stakeId The stake ID
     * @return Stake information
     */
    function getStake(
        address user,
        uint256 stakeId
    ) external view returns (Stake memory) {
        if (stakeId >= userStakes[user].length) {
            revert StakeNotFound(stakeId);
        }
        return userStakes[user][stakeId];
    }

    /**
     * @dev Update the annual reward rate (admin only)
     * @param newRate New annual reward rate in basis points
     */
    function updateRewardRate(uint256 newRate) external onlyRole(ADMIN_ROLE) {
        annualRewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }

    /**
     * @dev Update lock periods (admin only)
     * @param newMinPeriod New minimum lock period in seconds
     * @param newMaxPeriod New maximum lock period in seconds
     */
    function updateLockPeriods(
        uint256 newMinPeriod,
        uint256 newMaxPeriod
    ) external onlyRole(ADMIN_ROLE) {
        if (newMinPeriod >= newMaxPeriod) {
            revert("Invalid lock periods");
        }

        minLockPeriod = newMinPeriod;
        maxLockPeriod = newMaxPeriod;

        emit LockPeriodsUpdated(newMinPeriod, newMaxPeriod);
    }

    /**
     * @dev Emergency withdraw function (admin only)
     * @param token Address of token to withdraw
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        IERC20(token).safeTransfer(to, amount);
    }

    // Pausable functions
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // UUPS upgrade functions
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    // Access control
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
