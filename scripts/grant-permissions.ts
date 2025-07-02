import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔐 Granting permissions to backend wallet...");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Using deployer account:", deployer.address);

  // Contract addresses from deployment
  const XCELT_TOKEN_ADDRESS = "0x8C5Fcb19434aF9Cc255d376C04854d3fD22218A2";
  const TRAIL_PROOF_ADDRESS = "0xEFcD35327C259c8b248055414adeA3FAEB8D5AB7";
  const XCEL_PASS_ADDRESS = "0x7647EB9CCD5D0Cf591432c69EF582d03D76B15Cd";

  // Backend wallet address - replace with your actual backend wallet
  const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";

  if (BACKEND_WALLET_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  Please set BACKEND_WALLET_ADDRESS in your .env file");
    console.log("💡 Example: BACKEND_WALLET_ADDRESS=0xYourBackendWalletAddress");
    return;
  }

  console.log("🎯 Backend wallet address:", BACKEND_WALLET_ADDRESS);

  // Get contract instances
  const xceltToken = await ethers.getContractAt("XCELT", XCELT_TOKEN_ADDRESS);
  const trailProof = await ethers.getContractAt("TrailProof", TRAIL_PROOF_ADDRESS);
  const xcelPass = await ethers.getContractAt("XcelPass", XCEL_PASS_ADDRESS);

  try {
    // Grant MINTER_ROLE to backend wallet for XCELT token
    console.log("\n🪙 Granting MINTER_ROLE for XCELT token...");
    const MINTER_ROLE = await xceltToken.MINTER_ROLE();
    await xceltToken.grantRole(MINTER_ROLE, BACKEND_WALLET_ADDRESS);
    console.log("✅ MINTER_ROLE granted for XCELT token");

    // Grant MINTER_ROLE to backend wallet for TrailProof SBT
    console.log("\n🏷️ Granting MINTER_ROLE for TrailProof SBT...");
    const trailProofMinterRole = await trailProof.MINTER_ROLE();
    await trailProof.grantRole(trailProofMinterRole, BACKEND_WALLET_ADDRESS);
    console.log("✅ MINTER_ROLE granted for TrailProof SBT");

    // Grant MINTER_ROLE to backend wallet for XcelPass NFT
    console.log("\n🎫 Granting MINTER_ROLE for XcelPass NFT...");
    const xcelPassMinterRole = await xcelPass.MINTER_ROLE();
    await xcelPass.grantRole(xcelPassMinterRole, BACKEND_WALLET_ADDRESS);
    console.log("✅ MINTER_ROLE granted for XcelPass NFT");

    // Verify permissions
    console.log("\n🔍 Verifying permissions...");
    
    const xceltHasMinterRole = await xceltToken.hasRole(MINTER_ROLE, BACKEND_WALLET_ADDRESS);
    const trailProofHasMinterRole = await trailProof.hasRole(trailProofMinterRole, BACKEND_WALLET_ADDRESS);
    const xcelPassHasMinterRole = await xcelPass.hasRole(xcelPassMinterRole, BACKEND_WALLET_ADDRESS);

    console.log("XCELT Token MINTER_ROLE:", xceltHasMinterRole ? "✅ Granted" : "❌ Not granted");
    console.log("TrailProof SBT MINTER_ROLE:", trailProofHasMinterRole ? "✅ Granted" : "❌ Not granted");
    console.log("XcelPass NFT MINTER_ROLE:", xcelPassHasMinterRole ? "✅ Granted" : "❌ Not granted");

    console.log("\n🎉 Permissions granted successfully!");
    console.log("\n📋 Backend wallet can now:");
    console.log("  • Mint XCELT tokens for cashback");
    console.log("  • Mint TrailProof SBTs for new users");
    console.log("  • Mint XcelPass NFTs for completed bookings");

  } catch (error) {
    console.error("❌ Error granting permissions:", error);
  }
}

main()
  .then(() => {
    console.log("\n📋 Next steps:");
    console.log("1. Fund your backend wallet with MATIC for gas fees");
    console.log("2. Test minting functions with the backend wallet");
    console.log("3. Update your backend environment variables");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 