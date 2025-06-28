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
 * @title SoulStamp
 * @dev ERC-5114 Soulbound Token for NomadLink user reputation
 * @notice Non-transferable token tracking user's travel reputation, trips, reviews, and achievements
 */
contract SoulStamp is
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
    struct SoulStampMetadata {
        uint256 tripCount;
        uint256 reviewCount;
        uint256 safetyScore; // 0-100
        uint256 referralCount;
        string[] completedQuests;
        string metadataURI;
        uint256 lastUpdated;
    }

    // Storage
    mapping(address => uint256) public walletToTokenId;
    mapping(uint256 => SoulStampMetadata) public tokenMetadata;
    mapping(uint256 => address) public tokenIdToWallet;

    uint256 private _tokenIdCounter;
    string private _baseTokenURI;

    // Events
    event SoulStampMinted(
        address indexed to,
        uint256 indexed tokenId,
        string metadataURI
    );
    event MetadataUpdated(uint256 indexed tokenId, string metadataURI);
    event QuestCompleted(uint256 indexed tokenId, string questId);
    event TripRecorded(uint256 indexed tokenId, uint256 newTripCount);
    event ReviewSubmitted(uint256 indexed tokenId, uint256 newReviewCount);
    event SafetyScoreUpdated(uint256 indexed tokenId, uint256 newScore);
    event ReferralRecorded(uint256 indexed tokenId, uint256 newReferralCount);

    // Errors
    error SoulStampAlreadyExists(address wallet);
    error SoulStampNotFound(address wallet);
    error InvalidSafetyScore(uint256 score);
    error TransferNotAllowed();
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
     * @dev Mints a new SoulStamp for a user
     * @param to The address to mint the SoulStamp to
     * @param metadataURI IPFS URI containing the metadata
     */
    function mint(
        address to,
        string memory metadataURI
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        if (walletToTokenId[to] != 0) {
            revert SoulStampAlreadyExists(to);
        }

        uint256 tokenId = _tokenIdCounter++;

        _safeMint(to, tokenId);

        walletToTokenId[to] = tokenId;
        tokenIdToWallet[tokenId] = to;

        tokenMetadata[tokenId] = SoulStampMetadata({
            tripCount: 0,
            reviewCount: 0,
            safetyScore: 50, // Default safety score
            referralCount: 0,
            completedQuests: new string[](0),
            metadataURI: metadataURI,
            lastUpdated: block.timestamp
        });

        emit SoulStampMinted(to, tokenId, metadataURI);
    }

    /**
     * @dev Updates the metadata for a SoulStamp
     * @param tokenId The token ID to update
     * @param metadataURI New IPFS URI containing updated metadata
     */
    function updateMetadata(
        uint256 tokenId,
        string memory metadataURI
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (!_exists(tokenId)) {
            revert SoulStampNotFound(tokenIdToWallet[tokenId]);
        }

        tokenMetadata[tokenId].metadataURI = metadataURI;
        tokenMetadata[tokenId].lastUpdated = block.timestamp;

        emit MetadataUpdated(tokenId, metadataURI);
    }

    /**
     * @dev Records a new trip for a user
     * @param tokenId The token ID to update
     */
    function recordTrip(
        uint256 tokenId
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (!_exists(tokenId)) {
            revert SoulStampNotFound(tokenIdToWallet[tokenId]);
        }

        tokenMetadata[tokenId].tripCount++;
        tokenMetadata[tokenId].lastUpdated = block.timestamp;

        emit TripRecorded(tokenId, tokenMetadata[tokenId].tripCount);
    }

    /**
     * @dev Records a new review for a user
     * @param tokenId The token ID to update
     */
    function recordReview(
        uint256 tokenId
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (!_exists(tokenId)) {
            revert SoulStampNotFound(tokenIdToWallet[tokenId]);
        }

        tokenMetadata[tokenId].reviewCount++;
        tokenMetadata[tokenId].lastUpdated = block.timestamp;

        emit ReviewSubmitted(tokenId, tokenMetadata[tokenId].reviewCount);
    }

    /**
     * @dev Updates the safety score for a user
     * @param tokenId The token ID to update
     * @param newScore New safety score (0-100)
     */
    function updateSafetyScore(
        uint256 tokenId,
        uint256 newScore
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (!_exists(tokenId)) {
            revert SoulStampNotFound(tokenIdToWallet[tokenId]);
        }

        if (newScore > 100) {
            revert InvalidSafetyScore(newScore);
        }

        tokenMetadata[tokenId].safetyScore = newScore;
        tokenMetadata[tokenId].lastUpdated = block.timestamp;

        emit SafetyScoreUpdated(tokenId, newScore);
    }

    /**
     * @dev Records a new referral for a user
     * @param tokenId The token ID to update
     */
    function recordReferral(
        uint256 tokenId
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (!_exists(tokenId)) {
            revert SoulStampNotFound(tokenIdToWallet[tokenId]);
        }

        tokenMetadata[tokenId].referralCount++;
        tokenMetadata[tokenId].lastUpdated = block.timestamp;

        emit ReferralRecorded(tokenId, tokenMetadata[tokenId].referralCount);
    }

    /**
     * @dev Records a completed quest for a user
     * @param tokenId The token ID to update
     * @param questId The quest identifier
     */
    function completeQuest(
        uint256 tokenId,
        string memory questId
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (!_exists(tokenId)) {
            revert SoulStampNotFound(tokenIdToWallet[tokenId]);
        }

        tokenMetadata[tokenId].completedQuests.push(questId);
        tokenMetadata[tokenId].lastUpdated = block.timestamp;

        emit QuestCompleted(tokenId, questId);
    }

    /**
     * @dev Gets the SoulStamp token ID for a wallet address
     * @param wallet The wallet address
     * @return The token ID (0 if not found)
     */
    function getTokenId(address wallet) external view returns (uint256) {
        return walletToTokenId[wallet];
    }

    /**
     * @dev Gets the wallet address for a token ID
     * @param tokenId The token ID
     * @return The wallet address
     */
    function getWallet(uint256 tokenId) external view returns (address) {
        return tokenIdToWallet[tokenId];
    }

    /**
     * @dev Gets the complete metadata for a token
     * @param tokenId The token ID
     * @return The metadata structure
     */
    function getMetadata(
        uint256 tokenId
    ) external view returns (SoulStampMetadata memory) {
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
        SoulStampMetadata memory metadata = tokenMetadata[tokenId];

        string memory questsArray = "[";
        for (uint256 i = 0; i < metadata.completedQuests.length; i++) {
            if (i > 0) questsArray = string(abi.encodePacked(questsArray, ","));
            questsArray = string(
                abi.encodePacked(
                    questsArray,
                    '"',
                    metadata.completedQuests[i],
                    '"'
                )
            );
        }
        questsArray = string(abi.encodePacked(questsArray, "]"));

        return
            string(
                abi.encodePacked(
                    '{"name":"NomadLink SoulStamp #',
                    tokenId.toString(),
                    '",',
                    '"description":"Soulbound token representing travel reputation and achievements",',
                    '"image":"',
                    _baseTokenURI,
                    tokenId.toString(),
                    '.png",',
                    '"attributes":[',
                    '{"trait_type":"Trip Count","value":',
                    metadata.tripCount.toString(),
                    "},",
                    '{"trait_type":"Review Count","value":',
                    metadata.reviewCount.toString(),
                    "},",
                    '{"trait_type":"Safety Score","value":',
                    metadata.safetyScore.toString(),
                    "},",
                    '{"trait_type":"Referral Count","value":',
                    metadata.referralCount.toString(),
                    "},",
                    '{"trait_type":"Completed Quests","value":',
                    questsArray,
                    "},",
                    '{"trait_type":"Last Updated","value":',
                    metadata.lastUpdated.toString(),
                    "}",
                    "]}"
                )
            );
    }

    // Override functions to prevent transfers (Soulbound)
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721Upgradeable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);

        // Only allow minting, not transfers
        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        revert TransferNotAllowed();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        revert TransferNotAllowed();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        revert TransferNotAllowed();
    }

    function approve(address to, uint256 tokenId) public virtual override {
        revert TransferNotAllowed();
    }

    function setApprovalForAll(
        address operator,
        bool approved
    ) public virtual override {
        revert TransferNotAllowed();
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
