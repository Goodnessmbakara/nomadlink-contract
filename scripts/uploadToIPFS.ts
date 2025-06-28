import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { PinataSDK } from "pinata-sdk";

dotenv.config();

interface SoulStampMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number | boolean;
  }>;
}

interface NomadPassMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number | boolean;
  }>;
}

async function main() {
  console.log("🌐 Starting IPFS metadata upload...");

  // Initialize Pinata SDK
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

  if (!pinataApiKey || !pinataSecretApiKey) {
    throw new Error("Pinata API keys not found in environment variables");
  }

  const pinata = new PinataSDK(pinataApiKey, pinataSecretApiKey);

  // Test Pinata connection
  try {
    const testResult = await pinata.testAuthentication();
    console.log("✅ Pinata authentication successful");
  } catch (error) {
    console.error("❌ Pinata authentication failed:", error);
    process.exit(1);
  }

  // Upload SoulStamp metadata
  console.log("\n🏷️ Uploading SoulStamp metadata...");
  
  const soulStampMetadata: SoulStampMetadata = {
    name: "NomadLink SoulStamp #1",
    description: "Soulbound token representing travel reputation and achievements",
    image: "ipfs://QmYourImageHash/soulstamp.png", // Replace with actual image hash
    attributes: [
      {
        trait_type: "Trip Count",
        value: 5
      },
      {
        trait_type: "Review Count",
        value: 12
      },
      {
        trait_type: "Safety Score",
        value: 85
      },
      {
        trait_type: "Referral Count",
        value: 3
      },
      {
        trait_type: "Completed Quests",
        value: ["First Trip", "Review Master", "Safety Champion"]
      },
      {
        trait_type: "Last Updated",
        value: Math.floor(Date.now() / 1000)
      }
    ]
  };

  try {
    const soulStampResult = await pinata.pinJSONToIPFS(soulStampMetadata, {
      pinataMetadata: {
        name: "NomadLink SoulStamp Metadata",
        keyvalues: {
          type: "soulstamp",
          tokenId: "1"
        }
      }
    });
    console.log("✅ SoulStamp metadata uploaded to IPFS");
    console.log(`   IPFS Hash: ${soulStampResult.IpfsHash}`);
    console.log(`   IPFS URI: ipfs://${soulStampResult.IpfsHash}`);
  } catch (error) {
    console.error("❌ Failed to upload SoulStamp metadata:", error);
  }

  // Upload NomadPass metadata
  console.log("\n🎫 Uploading NomadPass metadata...");
  
  const nomadPassMetadata: NomadPassMetadata = {
    name: "NomadPass #1",
    description: "NomadLink travel pass for Lisbon, Portugal",
    image: "ipfs://QmYourImageHash/nomadpass.png", // Replace with actual image hash
    attributes: [
      {
        trait_type: "Booking ID",
        value: "BOOK001"
      },
      {
        trait_type: "Location",
        value: "Lisbon, Portugal"
      },
      {
        trait_type: "Perk Type",
        value: "VIP Access"
      },
      {
        trait_type: "Valid Until",
        value: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
      },
      {
        trait_type: "Minted At",
        value: Math.floor(Date.now() / 1000)
      },
      {
        trait_type: "Is Valid",
        value: true
      }
    ]
  };

  try {
    const nomadPassResult = await pinata.pinJSONToIPFS(nomadPassMetadata, {
      pinataMetadata: {
        name: "NomadLink NomadPass Metadata",
        keyvalues: {
          type: "nomadpass",
          tokenId: "1",
          bookingId: "BOOK001"
        }
      }
    });
    console.log("✅ NomadPass metadata uploaded to IPFS");
    console.log(`   IPFS Hash: ${nomadPassResult.IpfsHash}`);
    console.log(`   IPFS URI: ipfs://${nomadPassResult.IpfsHash}`);
  } catch (error) {
    console.error("❌ Failed to upload NomadPass metadata:", error);
  }

  // Upload multiple metadata examples
  console.log("\n📦 Uploading batch metadata examples...");
  
  const batchMetadata = [];
  
  // Multiple SoulStamp examples
  for (let i = 2; i <= 5; i++) {
    const soulStampExample: SoulStampMetadata = {
      name: `NomadLink SoulStamp #${i}`,
      description: "Soulbound token representing travel reputation and achievements",
      image: `ipfs://QmYourImageHash/soulstamp${i}.png`,
      attributes: [
        {
          trait_type: "Trip Count",
          value: Math.floor(Math.random() * 20) + 1
        },
        {
          trait_type: "Review Count",
          value: Math.floor(Math.random() * 50) + 1
        },
        {
          trait_type: "Safety Score",
          value: Math.floor(Math.random() * 40) + 60
        },
        {
          trait_type: "Referral Count",
          value: Math.floor(Math.random() * 10)
        },
        {
          trait_type: "Completed Quests",
          value: ["First Trip", "Review Master", "Safety Champion", "Referral Pro"]
        },
        {
          trait_type: "Last Updated",
          value: Math.floor(Date.now() / 1000)
        }
      ]
    };
    
    batchMetadata.push({
      metadata: soulStampExample,
      pinataMetadata: {
        name: `NomadLink SoulStamp Metadata #${i}`,
        keyvalues: {
          type: "soulstamp",
          tokenId: i.toString()
        }
      }
    });
  }

  // Multiple NomadPass examples
  const locations = ["Bali, Indonesia", "Tokyo, Japan", "Barcelona, Spain", "New York, USA"];
  const perkTypes = ["VIP Access", "Premium Discount", "Free Upgrade", "Exclusive Experience"];
  
  for (let i = 2; i <= 5; i++) {
    const nomadPassExample: NomadPassMetadata = {
      name: `NomadPass #${i}`,
      description: `NomadLink travel pass for ${locations[i-2]}`,
      image: `ipfs://QmYourImageHash/nomadpass${i}.png`,
      attributes: [
        {
          trait_type: "Booking ID",
          value: `BOOK00${i}`
        },
        {
          trait_type: "Location",
          value: locations[i-2]
        },
        {
          trait_type: "Perk Type",
          value: perkTypes[i-2]
        },
        {
          trait_type: "Valid Until",
          value: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60) // 6 months
        },
        {
          trait_type: "Minted At",
          value: Math.floor(Date.now() / 1000)
        },
        {
          trait_type: "Is Valid",
          value: true
        }
      ]
    };
    
    batchMetadata.push({
      metadata: nomadPassExample,
      pinataMetadata: {
        name: `NomadLink NomadPass Metadata #${i}`,
        keyvalues: {
          type: "nomadpass",
          tokenId: i.toString(),
          bookingId: `BOOK00${i}`
        }
      }
    });
  }

  // Upload batch metadata
  try {
    for (const item of batchMetadata) {
      const result = await pinata.pinJSONToIPFS(item.metadata, {
        pinataMetadata: item.pinataMetadata
      });
      console.log(`✅ Uploaded ${item.pinataMetadata.name}: ipfs://${result.IpfsHash}`);
    }
  } catch (error) {
    console.error("❌ Failed to upload batch metadata:", error);
  }

  // Generate metadata template functions
  console.log("\n📝 Generating metadata template functions...");
  
  const generateSoulStampMetadata = (tokenId: number, tripCount: number, reviewCount: number, safetyScore: number, referralCount: number, completedQuests: string[]) => {
    return {
      name: `NomadLink SoulStamp #${tokenId}`,
      description: "Soulbound token representing travel reputation and achievements",
      image: `ipfs://QmYourImageHash/soulstamp${tokenId}.png`,
      attributes: [
        {
          trait_type: "Trip Count",
          value: tripCount
        },
        {
          trait_type: "Review Count",
          value: reviewCount
        },
        {
          trait_type: "Safety Score",
          value: safetyScore
        },
        {
          trait_type: "Referral Count",
          value: referralCount
        },
        {
          trait_type: "Completed Quests",
          value: completedQuests
        },
        {
          trait_type: "Last Updated",
          value: Math.floor(Date.now() / 1000)
        }
      ]
    };
  };

  const generateNomadPassMetadata = (tokenId: number, bookingId: string, location: string, perkType: string, validUntil: number) => {
    return {
      name: `NomadPass #${tokenId}`,
      description: `NomadLink travel pass for ${location}`,
      image: `ipfs://QmYourImageHash/nomadpass${tokenId}.png`,
      attributes: [
        {
          trait_type: "Booking ID",
          value: bookingId
        },
        {
          trait_type: "Location",
          value: location
        },
        {
          trait_type: "Perk Type",
          value: perkType
        },
        {
          trait_type: "Valid Until",
          value: validUntil
        },
        {
          trait_type: "Minted At",
          value: Math.floor(Date.now() / 1000)
        },
        {
          trait_type: "Is Valid",
          value: true
        }
      ]
    };
  };

  console.log("✅ Metadata template functions generated");
  console.log("\n📋 Usage examples:");
  console.log("1. Call generateSoulStampMetadata() with user data");
  console.log("2. Call generateNomadPassMetadata() with booking data");
  console.log("3. Upload the generated metadata to IPFS using pinata.pinJSONToIPFS()");
  console.log("4. Use the returned IPFS hash as metadataURI in contract minting");

  console.log("\n🎉 IPFS metadata upload completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Replace placeholder image hashes with actual uploaded images");
  console.log("2. Integrate this script with your backend booking system");
  console.log("3. Add proper error handling and retry logic");
  console.log("4. Consider using IPFS gateways for faster metadata access");
}

main()
  .then(() => {
    console.log("\n✅ IPFS upload script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ IPFS upload script failed:", error);
    process.exit(1);
  }); 