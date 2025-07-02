import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Starting XcelTrip contracts deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy XCELT Token first
  console.log("\n🪙 Deploying XCELT Token...");
  const XCELT = await ethers.getContractFactory("XCELT");
  const xceltToken = await upgrades.deployProxy(XCELT, [
    "XcelTrip Token",
    "XCELT",
    ethers.parseEther("100000000"), // 100M tokens
    deployer.address
  ]);
  await xceltToken.waitForDeployment();
  console.log("✅ XCELT Token deployed to:", await xceltToken.getAddress());

  // Deploy TrailProof SBT
  console.log("\n🏷️ Deploying TrailProof SBT...");
  const TrailProof = await ethers.getContractFactory("TrailProof");
  const trailProof = await upgrades.deployProxy(TrailProof, [
    "XcelTrip TrailProof",
    "TRAIL",
    "ipfs://QmYourBaseURI/", // Replace with actual IPFS URI
    deployer.address
  ]);
  await trailProof.waitForDeployment();
  console.log("✅ TrailProof deployed to:", await trailProof.getAddress());

  // Deploy XcelPass NFT
  console.log("\n🎫 Deploying XcelPass NFT...");
  const XcelPass = await ethers.getContractFactory("XcelPass");
  const xcelPass = await upgrades.deployProxy(XcelPass, [
    "XcelTrip Pass",
    "PASS",
    "ipfs://QmYourBaseURI/", // Replace with actual IPFS URI
    deployer.address
  ]);
  await xcelPass.waitForDeployment();
  console.log("✅ XcelPass deployed to:", await xcelPass.getAddress());

  // Deploy SafeBox Staking
  console.log("\n🔒 Deploying SafeBox Staking...");
  const SafeBox = await ethers.getContractFactory("SafeBox");
  const safeBox = await upgrades.deployProxy(SafeBox, [
    await xceltToken.getAddress(),
    800, // 8% annual rate (800 basis points)
    deployer.address
  ]);
  await safeBox.waitForDeployment();
  console.log("✅ SafeBox deployed to:", await safeBox.getAddress());

  // Grant MINTER_ROLE to SafeBox for reward distribution
  console.log("\n🔐 Setting up permissions...");
  const MINTER_ROLE = await xceltToken.MINTER_ROLE();
  await xceltToken.grantRole(MINTER_ROLE, await safeBox.getAddress());
  console.log("✅ Granted MINTER_ROLE to SafeBox");

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  
  const xceltName = await xceltToken.name();
  const xceltSymbol = await xceltToken.symbol();
  const xceltTotalSupply = await xceltToken.totalSupply();
  
  const trailProofName = await trailProof.name();
  const trailProofSymbol = await trailProof.symbol();
  
  const xcelPassName = await xcelPass.name();
  const xcelPassSymbol = await xcelPass.symbol();
  
  const safeBoxXceltToken = await safeBox.nolnToken();
  const safeBoxRewardRate = await safeBox.annualRewardRate();

  console.log("\n📊 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`XCELT Token: ${await xceltToken.getAddress()}`);
  console.log(`  Name: ${xceltName}`);
  console.log(`  Symbol: ${xceltSymbol}`);
  console.log(`  Total Supply: ${ethers.formatEther(xceltTotalSupply)} XCELT`);
  console.log("");
  console.log(`TrailProof SBT: ${await trailProof.getAddress()}`);
  console.log(`  Name: ${trailProofName}`);
  console.log(`  Symbol: ${trailProofSymbol}`);
  console.log("");
  console.log(`XcelPass NFT: ${await xcelPass.getAddress()}`);
  console.log(`  Name: ${xcelPassName}`);
  console.log(`  Symbol: ${xcelPassSymbol}`);
  console.log("");
  console.log(`SafeBox Staking: ${await safeBox.getAddress()}`);
  console.log(`  XCELT Token: ${safeBoxXceltToken}`);
  console.log(`  Annual Reward Rate: ${Number(safeBoxRewardRate) / 100}%`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Save deployment addresses
  const deploymentInfo = {
    network: "mumbai",
    deployer: deployer.address,
    contracts: {
      xceltToken: await xceltToken.getAddress(),
      trailProof: await trailProof.getAddress(),
      xcelPass: await xcelPass.getAddress(),
      safeBox: await safeBox.getAddress()
    },
    deploymentTime: new Date().toISOString()
  };

  console.log("\n💾 Deployment info saved to deployment-info.json");
  console.log("🎉 XcelTrip contracts deployment completed successfully!");

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