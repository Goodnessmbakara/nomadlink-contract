// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title XCELT (XcelTrip Token)
 * @dev ERC-20 token for XcelTrip platform
 * @notice Used for payments, cashback, staking, and NFT minting
 */
contract XCELT is
    Initializable,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event CashbackPaid(address indexed to, uint256 amount, string bookingId);

    // Errors
    error InvalidAmount(uint256 amount);
    error InsufficientBalance(
        address account,
        uint256 required,
        uint256 available
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address admin
    ) public initializer {
        __ERC20_init(name, symbol);
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        // Mint initial supply to admin
        if (initialSupply > 0) {
            _mint(admin, initialSupply);
        }
    }

    /**
     * @dev Mints new tokens
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(
        address to,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burns tokens from an address
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(
        address from,
        uint256 amount
    ) external onlyRole(BURNER_ROLE) whenNotPaused nonReentrant {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        if (balanceOf(from) < amount) {
            revert InsufficientBalance(from, amount, balanceOf(from));
        }

        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    /**
     * @dev Allows users to burn their own tokens
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        if (balanceOf(msg.sender) < amount) {
            revert InsufficientBalance(
                msg.sender,
                amount,
                balanceOf(msg.sender)
            );
        }

        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Pays cashback to a user for a booking
     * @param to The address to pay cashback to
     * @param amount The amount of cashback
     * @param bookingId The booking identifier
     */
    function payCashback(
        address to,
        uint256 amount,
        string memory bookingId
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        _mint(to, amount);
        emit CashbackPaid(to, amount, bookingId);
    }

    /**
     * @dev Batch mint tokens to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to mint
     */
    function batchMint(
        address[] memory recipients,
        uint256[] memory amounts
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        if (recipients.length != amounts.length) {
            revert("Arrays length mismatch");
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] == 0) {
                revert InvalidAmount(amounts[i]);
            }
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i]);
        }
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
