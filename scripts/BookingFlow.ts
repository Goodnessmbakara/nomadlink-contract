import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🎯 Starting Mock Booking Flow...");

  const [deployer, user1, user2] = await ethers.getSigners();
  
  // Contract addresses (replace with actual deployed addresses)
  const SOUL_STAMP_ADDRESS = process.env.SOUL_STAMP_ADDRESS || "0x...";
  const NOMAD_PASS_ADDRESS = process.env.NOMAD_PASS_ADDRESS || "0x...";
  const NOLN_TOKEN_ADDRESS = process.env.NOLN_TOKEN_ADDRESS || "0x...";
  const SAFE_BOX_ADDRESS = process.env.SAFE_BOX_ADDRESS || "0x...";

  // Get contract instances
  const SoulStamp = await ethers.getContractFactory("SoulStamp");
  const NomadPass = await ethers.getContractFactory("NomadPass");
  const NOLN = await ethers.getContractFactory("NOLN");
  const SafeBox = await ethers.getContractFactory("SafeBox");

  const soulStamp = SoulStamp.attach(SOUL_STAMP_ADDRESS);
  const nomadPass = NomadPass.attach(NOMAD_PASS_ADDRESS);
  const nolnToken = NOLN.attach(NOLN_TOKEN_ADDRESS);
  const safeBox = SafeBox.attach(SAFE_BOX_ADDRESS);

  console.log("📋 Mock Booking Flow Simulation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Simulate User 1 booking flow
  console.log("\n👤 User 1 Booking Flow (First-time user):");
  console.log("User Address:", user1.address);

  // 1. Mint SoulStamp for new user
  console.log("\n1️⃣ Minting SoulStamp for new user...");
  const soulStampMetadata1 = "ipfs://QmSoulStamp1/metadata.json";
  await soulStamp.mint(user1.address, soulStampMetadata1);
  console.log("✅ SoulStamp minted for User 1");

  // 2. Complete booking and mint NomadPass
  console.log("\n2️⃣ Completing booking and minting NomadPass...");
  const bookingId1 = "BOOK001";
  const location1 = "Lisbon, Portugal";
  const perkType1 = "VIP Access";
  const validUntil1 = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
  const nomadPassMetadata1 = "ipfs://QmNomadPass1/metadata.json";

  await nomadPass.mint(
    user1.address,
    bookingId1,
    location1,
    perkType1,
    validUntil1,
    nomadPassMetadata1
  );
  console.log("✅ NomadPass minted for User 1");
  console.log(`   Booking ID: ${bookingId1}`);
  console.log(`   Location: ${location1}`);
  console.log(`   Perk: ${perkType1}`);

  // 3. Pay cashback in NOLN tokens
  console.log("\n3️⃣ Paying cashback in NOLN tokens...");
  const cashbackAmount1 = ethers.utils.parseEther("100"); // 100 NOLN
  await nolnToken.payCashback(user1.address, cashbackAmount1, bookingId1);
  console.log(`✅ Cashback paid: ${ethers.utils.formatEther(cashbackAmount1)} NOLN`);

  // 4. User stakes NOLN tokens
  console.log("\n4️⃣ User staking NOLN tokens...");
  const stakeAmount1 = ethers.utils.parseEther("50"); // 50 NOLN
  const lockPeriod1 = 90 * 24 * 60 * 60; // 90 days

  // Approve SafeBox to spend NOLN tokens
  await nolnToken.connect(user1).approve(safeBox.address, stakeAmount1);
  await safeBox.connect(user1).stake(stakeAmount1, lockPeriod1);
  console.log(`✅ Staked ${ethers.utils.formatEther(stakeAmount1)} NOLN for ${lockPeriod1 / (24 * 60 * 60)} days`);

  // Simulate User 2 booking flow (returning user)
  console.log("\n\n👤 User 2 Booking Flow (Returning user):");
  console.log("User Address:", user2.address);

  // 1. Check if user already has SoulStamp
  console.log("\n1️⃣ Checking existing SoulStamp...");
  const user2TokenId = await soulStamp.getTokenId(user2.address);
  
  if (user2TokenId.toNumber() === 0) {
    console.log("   No SoulStamp found, minting new one...");
    const soulStampMetadata2 = "ipfs://QmSoulStamp2/metadata.json";
    await soulStamp.mint(user2.address, soulStampMetadata2);
    console.log("✅ SoulStamp minted for User 2");
  } else {
    console.log(`   Existing SoulStamp found: Token ID ${user2TokenId}`);
    
    // Update SoulStamp metadata (record new trip)
    await soulStamp.recordTrip(user2TokenId);
    console.log("✅ Trip recorded in SoulStamp");
  }

  // 2. Complete booking and mint NomadPass
  console.log("\n2️⃣ Completing booking and minting NomadPass...");
  const bookingId2 = "BOOK002";
  const location2 = "Bali, Indonesia";
  const perkType2 = "Premium Discount";
  const validUntil2 = Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60); // 6 months
  const nomadPassMetadata2 = "ipfs://QmNomadPass2/metadata.json";

  await nomadPass.mint(
    user2.address,
    bookingId2,
    location2,
    perkType2,
    validUntil2,
    nomadPassMetadata2
  );
  console.log("✅ NomadPass minted for User 2");
  console.log(`   Booking ID: ${bookingId2}`);
  console.log(`   Location: ${location2}`);
  console.log(`   Perk: ${perkType2}`);

  // 3. Pay cashback
  console.log("\n3️⃣ Paying cashback in NOLN tokens...");
  const cashbackAmount2 = ethers.utils.parseEther("150"); // 150 NOLN (higher for returning user)
  await nolnToken.payCashback(user2.address, cashbackAmount2, bookingId2);
  console.log(`✅ Cashback paid: ${ethers.utils.formatEther(cashbackAmount2)} NOLN`);

  // 4. User stakes NOLN tokens
  console.log("\n4️⃣ User staking NOLN tokens...");
  const stakeAmount2 = ethers.utils.parseEther("100"); // 100 NOLN
  const lockPeriod2 = 180 * 24 * 60 * 60; // 180 days

  await nolnToken.connect(user2).approve(safeBox.address, stakeAmount2);
  await safeBox.connect(user2).stake(stakeAmount2, lockPeriod2);
  console.log(`✅ Staked ${ethers.utils.formatEther(stakeAmount2)} NOLN for ${lockPeriod2 / (24 * 60 * 60)} days`);

  // Display final state
  console.log("\n\n📊 Final State Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // User 1 state
  const user1TokenId = await soulStamp.getTokenId(user1.address);
  const user1Stakes = await safeBox.getUserStakes(user1.address);
  const user1NolnBalance = await nolnToken.balanceOf(user1.address);
  const user1NomadPasses = await nomadPass.getTokensByOwner(user1.address);

  console.log("👤 User 1:");
  console.log(`   SoulStamp Token ID: ${user1TokenId}`);
  console.log(`   NOLN Balance: ${ethers.utils.formatEther(user1NolnBalance)} NOLN`);
  console.log(`   Active Stakes: ${user1Stakes.length}`);
  console.log(`   NomadPasses: ${user1NomadPasses.length}`);

  // User 2 state
  const user2Stakes = await safeBox.getUserStakes(user2.address);
  const user2NolnBalance = await nolnToken.balanceOf(user2.address);
  const user2NomadPasses = await nomadPass.getTokensByOwner(user2.address);

  console.log("\n👤 User 2:");
  console.log(`   SoulStamp Token ID: ${user2TokenId}`);
  console.log(`   NOLN Balance: ${ethers.utils.formatEther(user2NolnBalance)} NOLN`);
  console.log(`   Active Stakes: ${user2Stakes.length}`);
  console.log(`   NomadPasses: ${user2NomadPasses.length}`);

  // Contract state
  const totalStaked = await safeBox.totalStaked();
  const totalRewardsPaid = await safeBox.totalRewardsPaid();
  const nolnTotalSupply = await nolnToken.totalSupply();

  console.log("\n📈 Contract State:");
  console.log(`   Total NOLN Supply: ${ethers.utils.formatEther(nolnTotalSupply)} NOLN`);
  console.log(`   Total Staked: ${ethers.utils.formatEther(totalStaked)} NOLN`);
  console.log(`   Total Rewards Paid: ${ethers.utils.formatEther(totalRewardsPaid)} NOLN`);

  console.log("\n🎉 Mock Booking Flow completed successfully!");
  console.log("\n📋 Next steps for backend integration:");
  console.log("1. Replace hardcoded addresses with actual deployed contract addresses");
  console.log("2. Implement IPFS metadata upload for SoulStamp and NomadPass");
  console.log("3. Add proper error handling and transaction confirmation");
  console.log("4. Integrate with your booking system database");
  console.log("5. Add user authentication and authorization checks");
}

main()
  .then(() => {
    console.log("\n✅ Mock booking flow simulation completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Mock booking flow failed:", error);
    process.exit(1);
  }); 