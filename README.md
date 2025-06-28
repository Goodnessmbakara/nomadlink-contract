# NomadLink Smart Contracts

A comprehensive smart contract suite for the NomadLink Web3 travel platform, featuring SoulStamp SBTs, NomadPass NFTs, $NOLN tokens, and SafeBox staking.

## 🏗️ Architecture

### Contracts Overview

- **SoulStamp (SBT)**: ERC-5114 soulbound token for user reputation and achievements
- **NomadPass (NFT)**: ERC-721 transferable token for booking passes and perks
- **NOLN Token**: ERC-20 token for payments, cashback, and staking
- **SafeBox**: Staking contract with lock periods and reward distribution

### Key Features

- ✅ **UUPS Upgradable**: All contracts support future upgrades
- ✅ **Access Control**: Role-based permissions for security
- ✅ **Pausable**: Emergency stop functionality
- ✅ **Reentrancy Protection**: Secure against reentrancy attacks
- ✅ **IPFS Integration**: Metadata storage on decentralized storage
- ✅ **Comprehensive Testing**: Full test coverage for all functions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Hardhat development environment
- Mumbai testnet MATIC for deployment
- Pinata account for IPFS storage

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nomadlink-contract

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Network Configuration
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC_URL=https://polygon-rpc.com

# Deployment
PRIVATE_KEY=your_private_key_here

# API Keys
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

# IPFS Configuration (Pinata)
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_key_here

# Gas Reporting
REPORT_GAS=true

# Contract Configuration
INITIAL_NOLN_SUPPLY=100000000000000000000000000
STAKING_ANNUAL_RATE=800
```

## 📋 Contract Specifications

### SoulStamp SBT (ERC-5114)

**Purpose**: Non-transferable reputation token tracking user achievements

**Key Features**:
- Soulbound (non-transferable)
- Metadata tracking: trips, reviews, safety score, referrals, quests
- IPFS metadata storage
- Role-based minting and updates

**Metadata Schema**:
```json
{
  "name": "NomadLink SoulStamp #1",
  "description": "Soulbound token representing travel reputation",
  "image": "ipfs://QmImageHash/soulstamp.png",
  "attributes": [
    {"trait_type": "Trip Count", "value": 5},
    {"trait_type": "Review Count", "value": 12},
    {"trait_type": "Safety Score", "value": 85},
    {"trait_type": "Referral Count", "value": 3},
    {"trait_type": "Completed Quests", "value": ["First Trip", "Review Master"]},
    {"trait_type": "Last Updated", "value": 1640995200}
  ]
}
```

### NomadPass NFT (ERC-721)

**Purpose**: Transferable booking passes with perks and benefits

**Key Features**:
- Transferable NFT
- Booking-specific metadata
- Perk redemption system
- Validity period tracking

**Metadata Schema**:
```json
{
  "name": "NomadPass #1",
  "description": "NomadLink travel pass for Lisbon, Portugal",
  "image": "ipfs://QmImageHash/nomadpass.png",
  "attributes": [
    {"trait_type": "Booking ID", "value": "BOOK001"},
    {"trait_type": "Location", "value": "Lisbon, Portugal"},
    {"trait_type": "Perk Type", "value": "VIP Access"},
    {"trait_type": "Valid Until", "value": 1672531200},
    {"trait_type": "Minted At", "value": 1640995200},
    {"trait_type": "Is Valid", "value": true}
  ]
}
```

### NOLN Token (ERC-20)

**Purpose**: Platform token for payments, cashback, and staking

**Key Features**:
- 100M initial supply
- Minting and burning capabilities
- Cashback distribution
- Batch operations

**Tokenomics**:
- **Total Supply**: 100,000,000 NOLN
- **Decimals**: 18
- **Initial Distribution**: Admin wallet
- **Use Cases**: Payments, cashback, staking, NFT minting

### SafeBox Staking

**Purpose**: Staking contract with lock periods and rewards

**Key Features**:
- 30-365 day lock periods
- 8% annual reward rate
- Reentrancy protection
- Emergency withdrawal

**Staking Parameters**:
- **Minimum Lock**: 30 days
- **Maximum Lock**: 365 days
- **Annual Reward Rate**: 8% (800 basis points)
- **Reward Calculation**: Linear based on time staked

## 🧪 Testing

### Run All Tests

```bash
# Run all tests
pnpm test

# Run tests with gas reporting
REPORT_GAS=true pnpm test

# Run specific test file
pnpm test test/NomadLinkContracts.ts
```

### Test Coverage

The test suite covers:

- ✅ Contract initialization and configuration
- ✅ Token minting, burning, and transfers
- ✅ SBT soulbound properties (no transfers)
- ✅ NFT minting and metadata management
- ✅ Staking operations and reward calculations
- ✅ Access control and role management
- ✅ Pausable functionality
- ✅ Edge cases and error conditions
- ✅ Integration scenarios

## 🚀 Deployment

### Deploy to Mumbai Testnet

```bash
# Deploy all contracts
pnpm hardhat run scripts/deploy.ts --network mumbai

# Deploy specific contract
pnpm hardhat run scripts/deploy.ts --network mumbai
```

### Deployment Output

After successful deployment, you'll see:

```
📊 Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOLN Token: 0x...
  Name: NomadLink Token
  Symbol: NOLN
  Total Supply: 100000000.0 NOLN

SoulStamp SBT: 0x...
  Name: NomadLink SoulStamp
  Symbol: SOUL

NomadPass NFT: 0x...
  Name: NomadLink Pass
  Symbol: PASS

SafeBox Staking: 0x...
  NOLN Token: 0x...
  Annual Reward Rate: 8%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Verify Contracts

```bash
# Verify on Polygonscan
pnpm hardhat verify --network mumbai <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 🔧 Scripts

### Mock Booking Flow

Simulate a complete booking flow:

```bash
pnpm hardhat run scripts/BookingFlow.ts --network mumbai
```

This script demonstrates:
- SoulStamp minting for new users
- NomadPass minting on booking completion
- Cashback distribution
- Token staking

### IPFS Metadata Upload

Upload metadata to IPFS using Pinata:

```bash
pnpm hardhat run scripts/uploadToIPFS.ts
```

This script:
- Generates metadata JSON for tokens
- Uploads to IPFS via Pinata
- Returns IPFS hashes for contract use

## 🔌 Backend Integration

### Node.js Integration Example

```javascript
const { ethers } = require('ethers');
const SoulStamp = require('./artifacts/contracts/SoulStamp.sol/SoulStamp.json');
const NomadPass = require('./artifacts/contracts/NomadPass.sol/NomadPass.json');
const NOLN = require('./artifacts/contracts/NOLN.sol/NOLN.json');

// Initialize contracts
const provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const soulStamp = new ethers.Contract(SOUL_STAMP_ADDRESS, SoulStamp.abi, wallet);
const nomadPass = new ethers.Contract(NOMAD_PASS_ADDRESS, NomadPass.abi, wallet);
const nolnToken = new ethers.Contract(NOLN_TOKEN_ADDRESS, NOLN.abi, wallet);

// Mint SoulStamp for new user
async function mintSoulStamp(userAddress, metadataURI) {
  const tx = await soulStamp.mint(userAddress, metadataURI);
  await tx.wait();
  return tx;
}

// Mint NomadPass for booking completion
async function mintNomadPass(userAddress, bookingId, location, perkType, validUntil, metadataURI) {
  const tx = await nomadPass.mint(
    userAddress,
    bookingId,
    location,
    perkType,
    validUntil,
    metadataURI
  );
  await tx.wait();
  return tx;
}

// Pay cashback
async function payCashback(userAddress, amount, bookingId) {
  const tx = await nolnToken.payCashback(userAddress, amount, bookingId);
  await tx.wait();
  return tx;
}
```

### Frontend Integration

```javascript
import { ethers } from 'ethers';
import SoulStampABI from './artifacts/SoulStamp.json';
import NomadPassABI from './artifacts/NomadPass.json';
import NOLNABI from './artifacts/NOLN.json';

// Connect to user's wallet
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Initialize contracts
const soulStamp = new ethers.Contract(SOUL_STAMP_ADDRESS, SoulStampABI, signer);
const nomadPass = new ethers.Contract(NOMAD_PASS_ADDRESS, NomadPassABI, signer);
const nolnToken = new ethers.Contract(NOLN_TOKEN_ADDRESS, NOLNABI, signer);

// Check user's SoulStamp
async function getUserSoulStamp(userAddress) {
  const tokenId = await soulStamp.getTokenId(userAddress);
  if (tokenId.toNumber() > 0) {
    const metadata = await soulStamp.getMetadata(tokenId);
    return metadata;
  }
  return null;
}

// Get user's NomadPasses
async function getUserNomadPasses(userAddress) {
  const tokenIds = await nomadPass.getTokensByOwner(userAddress);
  const passes = [];
  
  for (const tokenId of tokenIds) {
    const metadata = await nomadPass.getMetadata(tokenId);
    passes.push({ tokenId, metadata });
  }
  
  return passes;
}

// Stake NOLN tokens
async function stakeTokens(amount, lockPeriod) {
  const approveTx = await nolnToken.approve(SAFE_BOX_ADDRESS, amount);
  await approveTx.wait();
  
  const stakeTx = await safeBox.stake(amount, lockPeriod);
  await stakeTx.wait();
  return stakeTx;
}
```

## 🔒 Security Features

### Access Control

All contracts implement role-based access control:

- **DEFAULT_ADMIN_ROLE**: Full administrative access
- **ADMIN_ROLE**: Administrative functions (pause/unpause)
- **MINTER_ROLE**: Token minting permissions
- **BURNER_ROLE**: Token burning permissions
- **UPGRADER_ROLE**: Contract upgrade permissions

### Security Measures

- **Reentrancy Protection**: All external calls protected
- **Pausable**: Emergency stop functionality
- **Input Validation**: All parameters validated
- **Safe Math**: Overflow protection (Solidity 0.8+)
- **UUPS Upgrades**: Secure upgrade pattern

### Best Practices

- ✅ Use OpenZeppelin audited contracts
- ✅ Implement proper access control
- ✅ Add comprehensive testing
- ✅ Use events for important state changes
- ✅ Validate all inputs
- ✅ Handle edge cases

## 🌐 IPFS Integration

### Metadata Upload Process

1. **Generate Metadata**: Use contract functions to generate JSON metadata
2. **Upload to IPFS**: Use Pinata SDK to upload metadata
3. **Store Hash**: Use returned IPFS hash in contract minting

### Example Metadata Generation

```javascript
// Generate SoulStamp metadata
const soulStampMetadata = await soulStamp.generateMetadataJSON(tokenId);

// Generate NomadPass metadata
const nomadPassMetadata = await nomadPass.generateMetadataJSON(tokenId);

// Upload to IPFS
const result = await pinata.pinJSONToIPFS(JSON.parse(metadata));
const ipfsURI = `ipfs://${result.IpfsHash}`;
```

## 🔄 Solana Migration Note

For production deployment, consider migrating $NOLN to Solana:

### SPL Token Equivalent

```rust
// Rust/Solana equivalent for NOLN token
use spl_token::state::Account;
use spl_token::instruction::mint_to;

// Key considerations:
// - Use SPL Token standard
// - Implement minting authority
// - Add metadata program support
// - Consider cross-chain bridges
```

### Migration Steps

1. **Deploy SPL Token**: Create NOLN token on Solana
2. **Bridge Setup**: Implement cross-chain bridge
3. **Liquidity Migration**: Move liquidity to Solana
4. **Frontend Updates**: Update UI for Solana integration

## 📊 Gas Optimization

### Optimization Techniques

- **Batch Operations**: Use batch minting for multiple tokens
- **Storage Packing**: Optimize struct layouts
- **Loop Optimization**: Minimize storage reads in loops
- **Event Optimization**: Use indexed parameters efficiently

### Gas Costs (Estimated)

- **SoulStamp Mint**: ~150,000 gas
- **NomadPass Mint**: ~120,000 gas
- **NOLN Transfer**: ~65,000 gas
- **SafeBox Stake**: ~180,000 gas
- **SafeBox Withdraw**: ~120,000 gas

## 🐛 Troubleshooting

### Common Issues

**Deployment Fails**
- Check Mumbai RPC URL and private key
- Ensure sufficient MATIC balance
- Verify contract compilation

**Transaction Reverts**
- Check user permissions and roles
- Verify input parameters
- Ensure sufficient token balance

**IPFS Upload Issues**
- Verify Pinata API keys
- Check network connectivity
- Validate JSON metadata format

### Debug Commands

```bash
# Check contract compilation
pnpm hardhat compile

# Run specific test
pnpm test --grep "SoulStamp"

# Check gas usage
REPORT_GAS=true pnpm test

# Verify contract on Polygonscan
pnpm hardhat verify --network mumbai <ADDRESS> <ARGS>
```

## 📈 Roadmap

### Phase 1: Core Contracts ✅
- [x] SoulStamp SBT implementation
- [x] NomadPass NFT implementation
- [x] NOLN token implementation
- [x] SafeBox staking implementation

### Phase 2: Advanced Features
- [ ] Cross-chain bridge integration
- [ ] Advanced reward mechanisms
- [ ] Governance token implementation
- [ ] DAO structure

### Phase 3: Ecosystem Expansion
- [ ] Solana migration
- [ ] Layer 2 scaling solutions
- [ ] Advanced DeFi integrations
- [ ] Mobile wallet integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions and support:

- **Documentation**: [Project Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discord**: [NomadLink Community](link-to-discord)
- **Email**: support@nomadlink.com

---

**Built with ❤️ for the NomadLink community**
