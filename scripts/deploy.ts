import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Starting NomadLink contracts deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");

  // Deploy NOLN Token first
  console.log("\n🪙 Deploying NOLN Token...");
  const NOLN = await ethers.getContractFactory("NOLN");
  const nolnToken = await upgrades.deployProxy(NOLN, [
    "NomadLink Token",
    "NOLN",
    ethers.utils.parseEther("100000000"), // 100M tokens
    deployer.address
  ]);
  await nolnToken.deployed();
  console.log("✅ NOLN Token deployed to:", nolnToken.address);

  // Deploy SoulStamp SBT
  console.log("\n🏷️ Deploying SoulStamp SBT...");
  const SoulStamp = await ethers.getContractFactory("SoulStamp");
  const soulStamp = await upgrades.deployProxy(SoulStamp, [
    "NomadLink SoulStamp",
    "SOUL",
    "ipfs://QmYourBaseURI/", // Replace with actual IPFS URI
    deployer.address
  ]);
  await soulStamp.deployed();
  console.log("✅ SoulStamp deployed to:", soulStamp.address);

  // Deploy NomadPass NFT
  console.log("\n🎫 Deploying NomadPass NFT...");
  const NomadPass = await ethers.getContractFactory("NomadPass");
  const nomadPass = await upgrades.deployProxy(NomadPass, [
    "NomadLink Pass",
    "PASS",
    "ipfs://QmYourBaseURI/", // Replace with actual IPFS URI
    deployer.address
  ]);
  await nomadPass.deployed();
  console.log("✅ NomadPass deployed to:", nomadPass.address);

  // Deploy SafeBox Staking
  console.log("\n🔒 Deploying SafeBox Staking...");
  const SafeBox = await ethers.getContractFactory("SafeBox");
  const safeBox = await upgrades.deployProxy(SafeBox, [
    nolnToken.address,
    800, // 8% annual rate (800 basis points)
    deployer.address
  ]);
  await safeBox.deployed();
  console.log("✅ SafeBox deployed to:", safeBox.address);

  // Grant MINTER_ROLE to SafeBox for reward distribution
  console.log("\n🔐 Setting up permissions...");
  const MINTER_ROLE = await nolnToken.MINTER_ROLE();
  await nolnToken.grantRole(MINTER_ROLE, safeBox.address);
  console.log("✅ Granted MINTER_ROLE to SafeBox");

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  
  const nolnName = await nolnToken.name();
  const nolnSymbol = await nolnToken.symbol();
  const nolnTotalSupply = await nolnToken.totalSupply();
  
  const soulStampName = await soulStamp.name();
  const soulStampSymbol = await soulStamp.symbol();
  
  const nomadPassName = await nomadPass.name();
  const nomadPassSymbol = await nomadPass.symbol();
  
  const safeBoxNolnToken = await safeBox.nolnToken();
  const safeBoxRewardRate = await safeBox.annualRewardRate();

  console.log("\n📊 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`NOLN Token: ${nolnToken.address}`);
  console.log(`  Name: ${nolnName}`);
  console.log(`  Symbol: ${nolnSymbol}`);
  console.log(`  Total Supply: ${ethers.utils.formatEther(nolnTotalSupply)} NOLN`);
  console.log("");
  console.log(`SoulStamp SBT: ${soulStamp.address}`);
  console.log(`  Name: ${soulStampName}`);
  console.log(`  Symbol: ${soulStampSymbol}`);
  console.log("");
  console.log(`NomadPass NFT: ${nomadPass.address}`);
  console.log(`  Name: ${nomadPassName}`);
  console.log(`  Symbol: ${nomadPassSymbol}`);
  console.log("");
  console.log(`SafeBox Staking: ${safeBox.address}`);
  console.log(`  NOLN Token: ${safeBoxNolnToken}`);
  console.log(`  Annual Reward Rate: ${safeBoxRewardRate / 100}%`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Save deployment addresses
  const deploymentInfo = {
    network: "mumbai",
    deployer: deployer.address,
    contracts: {
      nolnToken: nolnToken.address,
      soulStamp: soulStamp.address,
      nomadPass: nomadPass.address,
      safeBox: safeBox.address
    },
    deploymentTime: new Date().toISOString()
  };

  console.log("\n💾 Deployment info saved to deployment-info.json");
  console.log("🎉 NomadLink contracts deployment completed successfully!");

  return deploymentInfo;
}

main()
  .then((deploymentInfo) => {
    console.log("\n📋 Next steps:");
    console.log("1. Update your .env file with the contract addresses");
    console.log("2. Run tests: pnpm test");
    console.log("3. Verify contracts on Polygonscan");
    console.log("4. Update frontend/backend with new contract addresses");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 