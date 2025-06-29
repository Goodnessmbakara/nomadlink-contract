// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title NomadPass
 * @dev ERC-721 NFT for NomadLink booking passes
 * @notice Transferable NFT minted on booking completion, unlocking perks and benefits
 */
contract NomadPass is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using Strings for uint256;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Metadata structure
    struct NomadPassMetadata {
        string bookingId;
        string location;
        string perkType;
        uint256 validUntil;
        string metadataURI;
        uint256 mintedAt;
    }

    // Storage
    mapping(uint256 => NomadPassMetadata) public tokenMetadata;
    mapping(string => bool) public usedBookingIds;

    uint256 private _tokenIdCounter;
    string private _baseTokenURI;

    // Events
    event NomadPassMinted(
        address indexed to,
        uint256 indexed tokenId,
        string bookingId,
        string location,
        string perkType,
        string metadataURI
    );
    event MetadataUpdated(uint256 indexed tokenId, string metadataURI);
    event PerkRedeemed(uint256 indexed tokenId, string perkType);

    // Errors
    error BookingIdAlreadyUsed(string bookingId);
    error InvalidTokenId(uint256 tokenId);
    error PassExpired(uint256 tokenId, uint256 validUntil);
    error UnauthorizedOperation();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        address admin
    ) public initializer {
        __ERC721_init(name, symbol);
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _baseTokenURI = baseTokenURI;
        _tokenIdCounter = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    /**
     * @dev Mints a new NomadPass for a completed booking
     * @param to The address to mint the NomadPass to
     * @param bookingId Unique booking identifier
     * @param location Travel destination
     * @param perkType Type of perk unlocked (e.g., "VIP Access", "Discount")
     * @param validUntil Timestamp until which the pass is valid
     * @param metadataURI IPFS URI containing the metadata
     */
    function mint(
        address to,
        string memory bookingId,
        string memory location,
        string memory perkType,
        uint256 validUntil,
        string memory metadataURI
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        if (usedBookingIds[bookingId]) {
            revert BookingIdAlreadyUsed(bookingId);
        }

        uint256 tokenId = _tokenIdCounter++;

        _safeMint(to, tokenId);

        usedBookingIds[bookingId] = true;

        tokenMetadata[tokenId] = NomadPassMetadata({
            bookingId: bookingId,
            location: location,
            perkType: perkType,
            validUntil: validUntil,
            metadataURI: metadataURI,
            mintedAt: block.timestamp
        });

        emit NomadPassMinted(
            to,
            tokenId,
            bookingId,
            location,
            perkType,
            metadataURI
        );
    }

    /**
     * @dev Updates the metadata for a NomadPass
     * @param tokenId The token ID to update
     * @param metadataURI New IPFS URI containing updated metadata
     */
    function updateMetadata(
        uint256 tokenId,
        string memory metadataURI
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (!_exists(tokenId)) {
            revert InvalidTokenId(tokenId);
        }

        tokenMetadata[tokenId].metadataURI = metadataURI;

        emit MetadataUpdated(tokenId, metadataURI);
    }

    /**
     * @dev Checks if a NomadPass is still valid
     * @param tokenId The token ID to check
     * @return True if the pass is valid, false otherwise
     */
    function isPassValid(uint256 tokenId) public view returns (bool) {
        if (!_exists(tokenId)) {
            return false;
        }
        return block.timestamp <= tokenMetadata[tokenId].validUntil;
    }

    /**
     * @dev Redeems a perk from a valid NomadPass
     * @param tokenId The token ID to redeem
     */
    function redeemPerk(uint256 tokenId) external whenNotPaused {
        if (!_exists(tokenId)) {
            revert InvalidTokenId(tokenId);
        }

        if (!isPassValid(tokenId)) {
            revert PassExpired(tokenId, tokenMetadata[tokenId].validUntil);
        }

        // Only the token owner can redeem perks
        if (ownerOf(tokenId) != msg.sender) {
            revert UnauthorizedOperation();
        }

        emit PerkRedeemed(tokenId, tokenMetadata[tokenId].perkType);
    }

    /**
     * @dev Gets the complete metadata for a token
     * @param tokenId The token ID
     * @return The metadata structure
     */
    function getMetadata(
        uint256 tokenId
    ) external view returns (NomadPassMetadata memory) {
        return tokenMetadata[tokenId];
    }

    /**
     * @dev Generates JSON metadata for IPFS storage
     * @param tokenId The token ID
     * @return JSON string containing the metadata
     */
    function generateMetadataJSON(
        uint256 tokenId
    ) external view returns (string memory) {
        NomadPassMetadata memory metadata = tokenMetadata[tokenId];

        return
            string(
                abi.encodePacked(
                    '{"name":"NomadPass #',
                    tokenId.toString(),
                    '",',
                    '"description":"NomadLink travel pass for ',
                    metadata.location,
                    '",',
                    '"image":"',
                    _baseTokenURI,
                    tokenId.toString(),
                    '.png",',
                    '"attributes":[',
                    '{"trait_type":"Booking ID","value":"',
                    metadata.bookingId,
                    '"},',
                    '{"trait_type":"Location","value":"',
                    metadata.location,
                    '"},',
                    '{"trait_type":"Perk Type","value":"',
                    metadata.perkType,
                    '"},',
                    '{"trait_type":"Valid Until","value":',
                    metadata.validUntil.toString(),
                    "},",
                    '{"trait_type":"Minted At","value":',
                    metadata.mintedAt.toString(),
                    "},",
                    '{"trait_type":"Is Valid","value":',
                    isPassValid(tokenId) ? "true" : "false",
                    "}",
                    "]}"
                )
            );
    }

    /**
     * @dev Gets all NomadPasses owned by an address
     * @param owner The address to query
     * @return Array of token IDs owned by the address
     */
    function getTokensByOwner(
        address owner
    ) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);

        uint256 index = 0;
        for (uint256 i = 1; i <= _tokenIdCounter - 1; i++) {
            if (_exists(i) && ownerOf(i) == owner) {
                tokens[index] = i;
                index++;
                if (index == balance) break;
            }
        }

        return tokens;
    }

    /**
     * @dev Gets all valid NomadPasses owned by an address
     * @param owner The address to query
     * @return Array of valid token IDs owned by the address
     */
    function getValidTokensByOwner(
        address owner
    ) external view returns (uint256[] memory) {
        uint256[] memory allTokens = getTokensByOwner(owner);
        uint256 validCount = 0;

        // Count valid tokens
        for (uint256 i = 0; i < allTokens.length; i++) {
            if (isPassValid(allTokens[i])) {
                validCount++;
            }
        }

        // Create array with valid tokens only
        uint256[] memory validTokens = new uint256[](validCount);
        uint256 index = 0;

        for (uint256 i = 0; i < allTokens.length; i++) {
            if (isPassValid(allTokens[i])) {
                validTokens[index] = allTokens[i];
                index++;
            }
        }

        return validTokens;
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
    )
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
