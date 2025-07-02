import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, ContractFactory, Signer } from "ethers";

describe("XcelTrip Contracts", function () {
  let xceltToken: Contract;
  let trailProof: Contract;
  let xcelPass: Contract;
  
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let backend: Signer;
  
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let backendAddress: string;

  const MINTER_ROLE = ethers.id("MINTER_ROLE");
  const ADMIN_ROLE = ethers.id("ADMIN_ROLE");
  const BURNER_ROLE = ethers.id("BURNER_ROLE");
  const UPGRADER_ROLE = ethers.id("UPGRADER_ROLE");

  beforeEach(async function () {
    [owner, user1, user2, backend] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    backendAddress = await backend.getAddress();

    // Deploy XCELT Token
    const XCELT = await ethers.getContractFactory("XCELT");
    xceltToken = await upgrades.deployProxy(XCELT, [
      "XcelTrip Token",
      "XCELT",
      ethers.parseEther("100000000"), // 100M tokens
      ownerAddress
    ]);
    await xceltToken.waitForDeployment();

    // Deploy TrailProof SBT
    const TrailProof = await ethers.getContractFactory("TrailProof");
    trailProof = await upgrades.deployProxy(TrailProof, [
      "XcelTrip TrailProof",
      "TRAIL",
      "ipfs://QmTestBaseURI/",
      ownerAddress
    ]);
    await trailProof.waitForDeployment();

    // Deploy XcelPass
    const XcelPass = await ethers.getContractFactory("XcelPass");
    xcelPass = await upgrades.deployProxy(XcelPass, [
      "XcelTrip Pass",
      "PASS",
      "ipfs://QmTestBaseURI/",
      ownerAddress
    ]);
    await xcelPass.waitForDeployment();

    // Grant MINTER_ROLE to backend for testing
    await xceltToken.grantRole(MINTER_ROLE, backendAddress);
  });

  describe("XCELT Token Minting", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await xceltToken.name()).to.equal("XcelTrip Token");
      expect(await xceltToken.symbol()).to.equal("XCELT");
      expect(await xceltToken.decimals()).to.equal(18);
      expect(await xceltToken.totalSupply()).to.equal(ethers.parseEther("100000000"));
      expect(await xceltToken.balanceOf(ownerAddress)).to.equal(ethers.parseEther("100000000"));
    });

    it("Should allow minting by authorized accounts", async function () {
      const mintAmount = ethers.parseEther("1000");
      await xceltToken.mint(user1Address, mintAmount);
      expect(await xceltToken.balanceOf(user1Address)).to.equal(mintAmount);
    });

    it("Should prevent minting by unauthorized accounts", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        xceltToken.connect(user1).mint(user2Address, mintAmount)
      ).to.be.reverted;
    });

    it("Should emit TokensMinted event", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(xceltToken.mint(user1Address, mintAmount))
        .to.emit(xceltToken, "TokensMinted")
        .withArgs(user1Address, mintAmount);
    });

    it("Should batch mint correctly", async function () {
      const recipients = [user1Address, user2Address];
      const amounts = [
        ethers.parseEther("1000"),
        ethers.parseEther("2000")
      ];
      
      await xceltToken.batchMint(recipients, amounts);
      expect(await xceltToken.balanceOf(user1Address)).to.equal(amounts[0]);
      expect(await xceltToken.balanceOf(user2Address)).to.equal(amounts[1]);
    });

    it("Should pay cashback correctly", async function () {
      const cashbackAmount = ethers.parseEther("100");
      const bookingId = "BOOK001";
      
      await xceltToken.payCashback(user1Address, cashbackAmount, bookingId);
      expect(await xceltToken.balanceOf(user1Address)).to.equal(cashbackAmount);
    });

    it("Should emit CashbackPaid event", async function () {
      const cashbackAmount = ethers.parseEther("100");
      const bookingId = "BOOK001";
      
      await expect(xceltToken.payCashback(user1Address, cashbackAmount, bookingId))
        .to.emit(xceltToken, "CashbackPaid")
        .withArgs(user1Address, cashbackAmount, bookingId);
    });

    it("Should revert on invalid minting operations", async function () {
      // Mint zero amount
      await expect(
        xceltToken.mint(user1Address, 0)
      ).to.be.revertedWithCustomError(xceltToken, "InvalidAmount");

      // Batch mint with mismatched arrays
      await expect(
        xceltToken.batchMint([user1Address], [1000, 2000])
      ).to.be.revertedWith("Arrays length mismatch");

      // Batch mint with zero amount
      await expect(
        xceltToken.batchMint([user1Address, user2Address], [1000, 0])
      ).to.be.revertedWithCustomError(xceltToken, "InvalidAmount");
    });
  });

  describe("TrailProof SBT Minting", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await trailProof.name()).to.equal("XcelTrip TrailProof");
      expect(await trailProof.symbol()).to.equal("TRAIL");
    });

    it("Should mint TrailProof for new user", async function () {
      const metadataURI = "ipfs://QmTestTrailProof/metadata.json";
      await trailProof.mint(user1Address, metadataURI);
      
      const tokenId = await trailProof.getTokenId(user1Address);
      expect(tokenId).to.equal(1);
      expect(await trailProof.ownerOf(tokenId)).to.equal(user1Address);
    });

    it("Should emit TrailProofMinted event", async function () {
      const metadataURI = "ipfs://QmTestTrailProof/metadata.json";
      await expect(trailProof.mint(user1Address, metadataURI))
        .to.emit(trailProof, "TrailProofMinted")
        .withArgs(user1Address, 1, metadataURI);
    });

    it("Should prevent duplicate TrailProof minting", async function () {
      const metadataURI = "ipfs://QmTestTrailProof/metadata.json";
      await trailProof.mint(user1Address, metadataURI);
      
      await expect(
        trailProof.mint(user1Address, metadataURI)
      ).to.be.revertedWithCustomError(trailProof, "TrailProofAlreadyExists");
    });

    it("Should prevent minting by unauthorized accounts", async function () {
      const metadataURI = "ipfs://QmTestTrailProof/metadata.json";
      await expect(
        trailProof.connect(user1).mint(user2Address, metadataURI)
      ).to.be.reverted;
    });

    it("Should initialize metadata correctly", async function () {
      const metadataURI = "ipfs://QmTestTrailProof/metadata.json";
      await trailProof.mint(user1Address, metadataURI);
      
      const tokenId = await trailProof.getTokenId(user1Address);
      const metadata = await trailProof.getMetadata(tokenId);
      
      expect(metadata.tripCount).to.equal(0);
      expect(metadata.reviewCount).to.equal(0);
      expect(metadata.safetyScore).to.equal(50);
      expect(metadata.referralCount).to.equal(0);
      expect(metadata.completedQuests.length).to.equal(0);
      expect(metadata.metadataURI).to.equal(metadataURI);
      expect(metadata.lastUpdated).to.be.gt(0);
    });

    it("Should prevent transfers (Soulbound)", async function () {
      const metadataURI = "ipfs://QmTestTrailProof/metadata.json";
      await trailProof.mint(user1Address, metadataURI);
      const tokenId = await trailProof.getTokenId(user1Address);
      
      await expect(
        trailProof.connect(user1).transferFrom(user1Address, user2Address, tokenId)
      ).to.be.revertedWithCustomError(trailProof, "TransferNotAllowed");
      
      await expect(
        trailProof.connect(user1).safeTransferFrom(user1Address, user2Address, tokenId)
      ).to.be.revertedWithCustomError(trailProof, "TransferNotAllowed");
      
      await expect(
        trailProof.connect(user1).approve(user2Address, tokenId)
      ).to.be.revertedWithCustomError(trailProof, "TransferNotAllowed");
    });

    it("Should update metadata correctly", async function () {
      const metadataURI = "ipfs://QmTestTrailProof/metadata.json";
      await trailProof.mint(user1Address, metadataURI);
      const tokenId = await trailProof.getTokenId(user1Address);
      
      const newMetadataURI = "ipfs://QmTestTrailProof/updated.json";
      await trailProof.updateMetadata(tokenId, newMetadataURI);
      
      const metadata = await trailProof.getMetadata(tokenId);
      expect(metadata.metadataURI).to.equal(newMetadataURI);
    });

    it("Should emit MetadataUpdated event", async function () {
      const metadataURI = "ipfs://QmTestTrailProof/metadata.json";
      await trailProof.mint(user1Address, metadataURI);
      const tokenId = await trailProof.getTokenId(user1Address);
      
      const newMetadataURI = "ipfs://QmTestTrailProof/updated.json";
      await expect(trailProof.updateMetadata(tokenId, newMetadataURI))
        .to.emit(trailProof, "MetadataUpdated")
        .withArgs(tokenId, newMetadataURI);
    });
  });

  describe("XcelPass NFT Minting", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await xcelPass.name()).to.equal("XcelTrip Pass");
      expect(await xcelPass.symbol()).to.equal("PASS");
    });

    it("Should mint XcelPass for completed booking", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
      const metadataURI = "ipfs://QmTestXcelPass/metadata.json";
      
      await xcelPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      const tokenId = 1;
      expect(await xcelPass.ownerOf(tokenId)).to.equal(user1Address);
    });

    it("Should emit XcelPassMinted event", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const metadataURI = "ipfs://QmTestXcelPass/metadata.json";
      
      await expect(xcelPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      ))
        .to.emit(xcelPass, "XcelPassMinted")
        .withArgs(user1Address, 1, bookingId, location, perkType, metadataURI);
    });

    it("Should prevent duplicate booking ID usage", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const metadataURI = "ipfs://QmTestXcelPass/metadata.json";
      
      await xcelPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      await expect(
        xcelPass.mint(
          user2Address,
          bookingId,
          location,
          perkType,
          validUntil,
          metadataURI
        )
      ).to.be.revertedWithCustomError(xcelPass, "BookingIdAlreadyUsed");
    });

    it("Should prevent minting by unauthorized accounts", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const metadataURI = "ipfs://QmTestXcelPass/metadata.json";
      
      await expect(
        xcelPass.connect(user1).mint(
          user2Address,
          bookingId,
          location,
          perkType,
          validUntil,
          metadataURI
        )
      ).to.be.reverted;
    });

    it("Should store metadata correctly", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const metadataURI = "ipfs://QmTestXcelPass/metadata.json";
      
      await xcelPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      const tokenId = 1;
      const metadata = await xcelPass.getMetadata(tokenId);
      
      expect(metadata.bookingId).to.equal(bookingId);
      expect(metadata.location).to.equal(location);
      expect(metadata.perkType).to.equal(perkType);
      expect(metadata.validUntil).to.equal(validUntil);
      expect(metadata.metadataURI).to.equal(metadataURI);
      expect(metadata.mintedAt).to.be.gt(0);
    });

    it("Should check pass validity correctly", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const metadataURI = "ipfs://QmTestXcelPass/metadata.json";
      
      await xcelPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      const tokenId = 1;
      expect(await xcelPass.isPassValid(tokenId)).to.be.true;
    });

    it("Should allow perk redemption for valid pass", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const metadataURI = "ipfs://QmTestXcelPass/metadata.json";
      
      await xcelPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      const tokenId = 1;
      await expect(xcelPass.connect(user1).redeemPerk(tokenId))
        .to.emit(xcelPass, "PerkRedeemed")
        .withArgs(tokenId, perkType);
    });

    it("Should prevent perk redemption by non-owner", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const metadataURI = "ipfs://QmTestXcelPass/metadata.json";
      
      await xcelPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      const tokenId = 1;
      await expect(
        xcelPass.connect(user2).redeemPerk(tokenId)
      ).to.be.revertedWithCustomError(xcelPass, "UnauthorizedOperation");
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete booking flow", async function () {
      // 1. Mint TrailProof for new user
      const trailProofURI = "ipfs://QmTestTrailProof/metadata.json";
      await trailProof.mint(user1Address, trailProofURI);
      
      // 2. Mint XcelPass for booking completion
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const xcelPassURI = "ipfs://QmTestXcelPass/metadata.json";
      
      await xcelPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        xcelPassURI
      );
      
      // 3. Pay cashback
      const cashbackAmount = ethers.parseEther("50");
      await xceltToken.payCashback(user1Address, cashbackAmount, bookingId);
      
      // Verify all tokens are owned by user1
      const trailProofId = await trailProof.getTokenId(user1Address);
      expect(await trailProof.ownerOf(trailProofId)).to.equal(user1Address);
      
      expect(await xcelPass.ownerOf(1)).to.equal(user1Address);
      expect(await xceltToken.balanceOf(user1Address)).to.equal(cashbackAmount);
    });

    it("Should handle multiple users and bookings", async function () {
      // User 1 booking
      await trailProof.mint(user1Address, "ipfs://QmTestTrailProof1/metadata.json");
      await xcelPass.mint(
        user1Address,
        "BOOK001",
        "Lisbon, Portugal",
        "VIP Access",
        Math.floor(Date.now() / 1000) + 86400,
        "ipfs://QmTestXcelPass1/metadata.json"
      );
      
      // User 2 booking
      await trailProof.mint(user2Address, "ipfs://QmTestTrailProof2/metadata.json");
      await xcelPass.mint(
        user2Address,
        "BOOK002",
        "Barcelona, Spain",
        "Discount",
        Math.floor(Date.now() / 1000) + 86400,
        "ipfs://QmTestXcelPass2/metadata.json"
      );
      
      // Verify unique token IDs
      const user1TrailProofId = await trailProof.getTokenId(user1Address);
      const user2TrailProofId = await trailProof.getTokenId(user2Address);
      expect(user1TrailProofId).to.equal(1);
      expect(user2TrailProofId).to.equal(2);
      
      expect(await xcelPass.ownerOf(1)).to.equal(user1Address);
      expect(await xcelPass.ownerOf(2)).to.equal(user2Address);
    });
  });
});
