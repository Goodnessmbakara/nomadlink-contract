# XcelTrip Wallet Setup Guide

## 🔗 Network Configuration

### Mumbai Testnet RPC URLs

**Option 1: Infura (Recommended)**
```
https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
```
- Sign up at [infura.io](https://infura.io)
- Create a new project
- Get your project ID
- Replace `YOUR_PROJECT_ID` with your actual project ID

**Option 2: Alchemy (Excellent Alternative)**
```
https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY
```
- Sign up at [alchemy.com](https://alchemy.com)
- Create a new app for Polygon Mumbai
- Get your API key
- Replace `YOUR_API_KEY` with your actual API key

**Option 3: Public RPC (Free but less reliable)**
```
https://rpc-mumbai.maticvigil.com
```
- No signup required
- Can be rate-limited during high traffic

### Environment Variables
```env
# Network Configuration
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC_URL=https://polygon-rpc.com

# Contract Addresses
XCELT_TOKEN_ADDRESS=0x8C5Fcb19434aF9Cc255d376C04854d3fD22218A2
TRAIL_PROOF_ADDRESS=0xEFcD35327C259c8b248055414adeA3FAEB8D5AB7
XCEL_PASS_ADDRESS=0x7647EB9CCD5D0Cf591432c69EF582d03D76B15Cd
SAFE_BOX_ADDRESS=0xB591FfF908927474A32c7d2E4BF8214b78FE3F1A

# Backend Wallet
BACKEND_WALLET_ADDRESS=0xYourBackendWalletAddress
BACKEND_WALLET_PRIVATE_KEY=your_backend_wallet_private_key

# Deployment
PRIVATE_KEY=your_deployer_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

## 💼 Wallet Types & Requirements

### 1. Backend Wallet (Required)

**Purpose**: Automated minting and platform operations
- Mint TrailProof SBTs for new users
- Mint XcelPass NFTs for completed bookings
- Pay cashback in XCELT tokens
- Manage staking rewards

**Setup Steps**:

1. **Generate a new wallet**:
```javascript
const { ethers } = require('ethers');

// Generate a new wallet for backend operations
const backendWallet = ethers.Wallet.createRandom();
console.log("Backend wallet address:", backendWallet.address);
console.log("Backend wallet private key:", backendWallet.privateKey);
```

2. **Fund with MATIC**:
   - Send MATIC from your main wallet to the backend wallet
   - Get free MATIC from [Mumbai Faucet](https://faucet.polygon.technology/)
   - Recommended: 0.1-0.5 MATIC for testing

3. **Grant permissions**:
```bash
# Add backend wallet address to .env file
echo "BACKEND_WALLET_ADDRESS=0xYourBackendWalletAddress" >> .env

# Grant minting permissions
pnpm hardhat run scripts/grant-permissions.ts --network mumbai
```

### 2. User Wallets (Frontend)

**Purpose**: User interactions and transactions
- Connect to dApp via MetaMask or WalletConnect
- Approve token spending
- Stake XCELT tokens
- Transfer XcelPass NFTs

**No special setup required** - users connect their existing wallets.

### 3. Deployer Wallet (Already Set)

**Purpose**: Contract deployment and admin operations
- Already used for deployment
- Has admin roles on all contracts
- Can grant/revoke permissions

## 🔐 Security Best Practices

### Backend Wallet Security

1. **Store private keys securely**:
```javascript
// Use environment variables
const backendWallet = new ethers.Wallet(process.env.BACKEND_WALLET_PRIVATE_KEY, provider);
```

2. **Use hardware wallets for production**:
   - Consider using hardware wallets for mainnet
   - Implement multi-signature for critical operations

3. **Monitor wallet balance**:
```javascript
// Check balance before operations
const balance = await provider.getBalance(backendWallet.address);
if (ethers.formatEther(balance) < "0.01") {
  console.log("⚠️ Low MATIC balance for gas fees");
}
```

### Frontend Wallet Security

1. **Never expose private keys**:
   - Only use wallet connection (MetaMask, WalletConnect)
   - Never ask users for private keys

2. **Validate transactions**:
```javascript
// Always show transaction details before signing
const tx = await contract.someFunction(params);
console.log("Transaction hash:", tx.hash);
await tx.wait(); // Wait for confirmation
```

## 🧪 Testing Wallet Setup

### Create Test Wallets

```javascript
// Generate multiple test wallets
const testWallets = [];
for (let i = 0; i < 5; i++) {
  const wallet = ethers.Wallet.createRandom();
  testWallets.push({
    address: wallet.address,
    privateKey: wallet.privateKey
  });
}

console.log("Test wallets:", testWallets);
```

### Fund Test Wallets

```bash
# Send MATIC to test wallets
pnpm hardhat run scripts/fund-test-wallets.ts --network mumbai
```

### Test Minting Operations

```javascript
// Test TrailProof minting
const trailProof = new ethers.Contract(TRAIL_PROOF_ADDRESS, TRAIL_PROOF_ABI, backendWallet);
const tx = await trailProof.mint(userAddress, metadataURI);
await tx.wait();

// Test XcelPass minting
const xcelPass = new ethers.Contract(XCEL_PASS_ADDRESS, XCEL_PASS_ABI, backendWallet);
const tx2 = await xcelPass.mint(userAddress, bookingId, location, perkType, validUntil, metadataURI);
await tx2.wait();
```

## 📱 Frontend Integration

### MetaMask Connection

```javascript
import { ethers } from 'ethers';

async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      return { provider, signer, address: accounts[0] };
    } catch (error) {
      console.error('User rejected connection');
    }
  } else {
    console.error('MetaMask not installed');
  }
}
```

### WalletConnect Integration

```javascript
import WalletConnectProvider from "@walletconnect/web3-provider";

const provider = new WalletConnectProvider({
  rpc: {
    80001: "https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID"
  }
});

await provider.enable();
const ethersProvider = new ethers.providers.Web3Provider(provider);
const signer = ethersProvider.getSigner();
```

## 🔄 Backend Integration

### Initialize Backend Wallet

```javascript
const { ethers } = require('ethers');

// Initialize provider
const provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC_URL);

// Initialize backend wallet
const backendWallet = new ethers.Wallet(process.env.BACKEND_WALLET_PRIVATE_KEY, provider);

// Initialize contracts
const xceltToken = new ethers.Contract(process.env.XCELT_TOKEN_ADDRESS, XCELT_ABI, backendWallet);
const trailProof = new ethers.Contract(process.env.TRAIL_PROOF_ADDRESS, TRAIL_PROOF_ABI, backendWallet);
const xcelPass = new ethers.Contract(process.env.XCEL_PASS_ADDRESS, XCEL_PASS_ABI, backendWallet);
```

### API Endpoints Example

```javascript
// Mint TrailProof for new user
app.post('/api/mint-trailproof', async (req, res) => {
  try {
    const { userAddress, metadataURI } = req.body;
    
    const tx = await trailProof.mint(userAddress, metadataURI);
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      transactionHash: receipt.transactionHash,
      tokenId: receipt.events[0].args.tokenId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pay cashback
app.post('/api/pay-cashback', async (req, res) => {
  try {
    const { userAddress, amount, bookingId } = req.body;
    
    const tx = await xceltToken.payCashback(userAddress, amount, bookingId);
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      transactionHash: receipt.transactionHash
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 🚨 Emergency Procedures

### If Backend Wallet is Compromised

1. **Immediately revoke permissions**:
```bash
pnpm hardhat run scripts/revoke-permissions.ts --network mumbai
```

2. **Create new backend wallet**:
```javascript
const newBackendWallet = ethers.Wallet.createRandom();
```

3. **Grant permissions to new wallet**:
```bash
# Update .env with new wallet
BACKEND_WALLET_ADDRESS=0xNewBackendWalletAddress

# Grant permissions
pnpm hardhat run scripts/grant-permissions.ts --network mumbai
```

### If User Wallet is Compromised

1. **User should transfer XcelPass NFTs** to new wallet
2. **TrailProof SBTs are soulbound** - cannot be transferred
3. **XCELT tokens can be transferred** to new wallet

## 📊 Monitoring & Analytics

### Track Wallet Activities

```javascript
// Monitor backend wallet balance
async function monitorBackendWallet() {
  const balance = await provider.getBalance(backendWallet.address);
  console.log(`Backend wallet balance: ${ethers.formatEther(balance)} MATIC`);
  
  if (ethers.formatEther(balance) < "0.01") {
    // Send alert or auto-fund
    console.log("⚠️ Low balance alert");
  }
}

// Monitor contract events
trailProof.on("TrailProofMinted", (to, tokenId, metadataURI) => {
  console.log(`TrailProof minted: ${tokenId} to ${to}`);
});

xcelPass.on("XcelPassMinted", (to, tokenId, bookingId, location) => {
  console.log(`XcelPass minted: ${tokenId} to ${to} for ${location}`);
});
```

---

**🎯 Key Takeaways**:
- Use Infura/Alchemy RPC for reliability
- Create dedicated backend wallet for automated operations
- Grant minting permissions to backend wallet
- Never expose private keys in frontend
- Monitor wallet balances and activities
- Have emergency procedures ready 