import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, ContractFactory, Signer } from "ethers";

describe("NomadLink Contracts", function () {
  let nolnToken: Contract;
  let soulStamp: Contract;
  let nomadPass: Contract;
  let safeBox: Contract;
  
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

    // Deploy NOLN Token
    const NOLN = await ethers.getContractFactory("NOLN");
    nolnToken = await upgrades.deployProxy(NOLN, [
      "NomadLink Token",
      "NOLN",
      ethers.parseEther("100000000"), // 100M tokens
      ownerAddress
    ]);
    await nolnToken.deployed();

    // Deploy SoulStamp
    const SoulStamp = await ethers.getContractFactory("SoulStamp");
    soulStamp = await upgrades.deployProxy(SoulStamp, [
      "NomadLink SoulStamp",
      "SOUL",
      "ipfs://QmTestBaseURI/",
      ownerAddress
    ]);
    await soulStamp.deployed();

    // Deploy NomadPass
    const NomadPass = await ethers.getContractFactory("NomadPass");
    nomadPass = await upgrades.deployProxy(NomadPass, [
      "NomadLink Pass",
      "PASS",
      "ipfs://QmTestBaseURI/",
      ownerAddress
    ]);
    await nomadPass.deployed();

    // Deploy SafeBox
    const SafeBox = await ethers.getContractFactory("SafeBox");
    safeBox = await upgrades.deployProxy(SafeBox, [
      nolnToken.address,
      800, // 8% annual rate
      ownerAddress
    ]);
    await safeBox.deployed();

    // Grant MINTER_ROLE to SafeBox
    await nolnToken.grantRole(MINTER_ROLE, safeBox.address);
  });

  describe("NOLN Token", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await nolnToken.name()).to.equal("NomadLink Token");
      expect(await nolnToken.symbol()).to.equal("NOLN");
      expect(await nolnToken.decimals()).to.equal(18);
      expect(await nolnToken.totalSupply()).to.equal(ethers.parseEther("100000000"));
      expect(await nolnToken.balanceOf(ownerAddress)).to.equal(ethers.parseEther("100000000"));
    });

    it("Should allow minting by authorized accounts", async function () {
      const mintAmount = ethers.parseEther("1000");
      await nolnToken.mint(user1Address, mintAmount);
      expect(await nolnToken.balanceOf(user1Address)).to.equal(mintAmount);
    });

    it("Should prevent minting by unauthorized accounts", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        nolnToken.connect(user1).mint(user2Address, mintAmount)
      ).to.be.revertedWith("AccessControl");
    });

    it("Should allow burning by authorized accounts", async function () {
      const burnAmount = ethers.parseEther("1000");
      await nolnToken.burn(ownerAddress, burnAmount);
      expect(await nolnToken.balanceOf(ownerAddress)).to.equal(
        ethers.parseEther("99999000")
      );
    });

    it("Should allow users to burn their own tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await nolnToken.mint(user1Address, mintAmount);
      
      const burnAmount = ethers.parseEther("500");
      await nolnToken.connect(user1).burn(burnAmount);
      expect(await nolnToken.balanceOf(user1Address)).to.equal(
        ethers.parseEther("500")
      );
    });

    it("Should pay cashback correctly", async function () {
      const cashbackAmount = ethers.parseEther("100");
      const bookingId = "BOOK001";
      
      await nolnToken.payCashback(user1Address, cashbackAmount, bookingId);
      expect(await nolnToken.balanceOf(user1Address)).to.equal(cashbackAmount);
    });

    it("Should batch mint correctly", async function () {
      const recipients = [user1Address, user2Address];
      const amounts = [
        ethers.parseEther("1000"),
        ethers.parseEther("2000")
      ];
      
      await nolnToken.batchMint(recipients, amounts);
      expect(await nolnToken.balanceOf(user1Address)).to.equal(amounts[0]);
      expect(await nolnToken.balanceOf(user2Address)).to.equal(amounts[1]);
    });

    it("Should revert on invalid operations", async function () {
      // Mint zero amount
      await expect(
        nolnToken.mint(user1Address, 0)
      ).to.be.revertedWithCustomError(nolnToken, "InvalidAmount");

      // Burn more than balance
      await expect(
        nolnToken.burn(user1Address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(nolnToken, "InsufficientBalance");

      // Batch mint with mismatched arrays
      await expect(
        nolnToken.batchMint([user1Address], [1000, 2000])
      ).to.be.revertedWith("Arrays length mismatch");
    });
  });

  describe("SoulStamp SBT", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await soulStamp.name()).to.equal("NomadLink SoulStamp");
      expect(await soulStamp.symbol()).to.equal("SOUL");
    });

    it("Should mint SoulStamp for new user", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      
      const tokenId = await soulStamp.getTokenId(user1Address);
      expect(tokenId).to.equal(1);
      expect(await soulStamp.ownerOf(tokenId)).to.equal(user1Address);
    });

    it("Should prevent duplicate SoulStamp minting", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      
      await expect(
        soulStamp.mint(user1Address, metadataURI)
      ).to.be.revertedWithCustomError(soulStamp, "SoulStampAlreadyExists");
    });

    it("Should prevent transfers", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      const tokenId = await soulStamp.getTokenId(user1Address);
      
      await expect(
        soulStamp.connect(user1).transferFrom(user1Address, user2Address, tokenId)
      ).to.be.revertedWithCustomError(soulStamp, "TransferNotAllowed");
      
      await expect(
        soulStamp.connect(user1).safeTransferFrom(user1Address, user2Address, tokenId)
      ).to.be.revertedWithCustomError(soulStamp, "TransferNotAllowed");
      
      await expect(
        soulStamp.connect(user1).approve(user2Address, tokenId)
      ).to.be.revertedWithCustomError(soulStamp, "TransferNotAllowed");
    });

    it("Should update metadata correctly", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      const tokenId = await soulStamp.getTokenId(user1Address);
      
      const newMetadataURI = "ipfs://QmTestSoulStamp/new-metadata.json";
      await soulStamp.updateMetadata(tokenId, newMetadataURI);
      
      const metadata = await soulStamp.getMetadata(tokenId);
      expect(metadata.metadataURI).to.equal(newMetadataURI);
    });

    it("Should record trips correctly", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      const tokenId = await soulStamp.getTokenId(user1Address);
      
      await soulStamp.recordTrip(tokenId);
      let metadata = await soulStamp.getMetadata(tokenId);
      expect(metadata.tripCount).to.equal(1);
      
      await soulStamp.recordTrip(tokenId);
      metadata = await soulStamp.getMetadata(tokenId);
      expect(metadata.tripCount).to.equal(2);
    });

    it("Should record reviews correctly", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      const tokenId = await soulStamp.getTokenId(user1Address);
      
      await soulStamp.recordReview(tokenId);
      let metadata = await soulStamp.getMetadata(tokenId);
      expect(metadata.reviewCount).to.equal(1);
    });

    it("Should update safety score correctly", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      const tokenId = await soulStamp.getTokenId(user1Address);
      
      await soulStamp.updateSafetyScore(tokenId, 85);
      let metadata = await soulStamp.getMetadata(tokenId);
      expect(metadata.safetyScore).to.equal(85);
      
      // Should revert for invalid score
      await expect(
        soulStamp.updateSafetyScore(tokenId, 150)
      ).to.be.revertedWithCustomError(soulStamp, "InvalidSafetyScore");
    });

    it("Should record referrals correctly", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      const tokenId = await soulStamp.getTokenId(user1Address);
      
      await soulStamp.recordReferral(tokenId);
      let metadata = await soulStamp.getMetadata(tokenId);
      expect(metadata.referralCount).to.equal(1);
    });

    it("Should complete quests correctly", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      const tokenId = await soulStamp.getTokenId(user1Address);
      
      await soulStamp.completeQuest(tokenId, "First Trip");
      let metadata = await soulStamp.getMetadata(tokenId);
      expect(metadata.completedQuests[0]).to.equal("First Trip");
    });

    it("Should generate metadata JSON", async function () {
      const metadataURI = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, metadataURI);
      const tokenId = await soulStamp.getTokenId(user1Address);
      
      const metadataJSON = await soulStamp.generateMetadataJSON(tokenId);
      expect(metadataJSON).to.include("NomadLink SoulStamp #1");
      expect(metadataJSON).to.include("tripCount");
    });
  });

  describe("NomadPass NFT", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await nomadPass.name()).to.equal("NomadLink Pass");
      expect(await nomadPass.symbol()).to.equal("PASS");
    });

    it("Should mint NomadPass for booking completion", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const metadataURI = "ipfs://QmTestNomadPass/metadata.json";
      
      await nomadPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      expect(await nomadPass.ownerOf(1)).to.equal(user1Address);
      expect(await nomadPass.usedBookingIds(bookingId)).to.be.true;
    });

    it("Should prevent duplicate booking ID usage", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const metadataURI = "ipfs://QmTestNomadPass/metadata.json";
      
      await nomadPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      await expect(
        nomadPass.mint(
          user2Address,
          bookingId,
          location,
          perkType,
          validUntil,
          metadataURI
        )
      ).to.be.revertedWithCustomError(nomadPass, "BookingIdAlreadyUsed");
    });

    it("Should allow transfers", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const metadataURI = "ipfs://QmTestNomadPass/metadata.json";
      
      await nomadPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      await nomadPass.connect(user1).transferFrom(user1Address, user2Address, 1);
      expect(await nomadPass.ownerOf(1)).to.equal(user2Address);
    });

    it("Should check pass validity correctly", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const metadataURI = "ipfs://QmTestNomadPass/metadata.json";
      
      await nomadPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      expect(await nomadPass.isPassValid(1)).to.be.true;
    });

    it("Should redeem perks correctly", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const metadataURI = "ipfs://QmTestNomadPass/metadata.json";
      
      await nomadPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      await nomadPass.connect(user1).redeemPerk(1);
      // Should not revert
    });

    it("Should prevent perk redemption by non-owner", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const metadataURI = "ipfs://QmTestNomadPass/metadata.json";
      
      await nomadPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      await expect(
        nomadPass.connect(user2).redeemPerk(1)
      ).to.be.revertedWithCustomError(nomadPass, "UnauthorizedOperation");
    });

    it("Should get user tokens correctly", async function () {
      const bookingId1 = "BOOK001";
      const bookingId2 = "BOOK002";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const metadataURI = "ipfs://QmTestNomadPass/metadata.json";
      
      await nomadPass.mint(
        user1Address,
        bookingId1,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      await nomadPass.mint(
        user1Address,
        bookingId2,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      const userTokens = await nomadPass.getTokensByOwner(user1Address);
      expect(userTokens.length).to.equal(2);
      expect(userTokens[0]).to.equal(1);
      expect(userTokens[1]).to.equal(2);
    });

    it("Should generate metadata JSON", async function () {
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const metadataURI = "ipfs://QmTestNomadPass/metadata.json";
      
      await nomadPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        metadataURI
      );
      
      const metadataJSON = await nomadPass.generateMetadataJSON(1);
      expect(metadataJSON).to.include("NomadPass #1");
      expect(metadataJSON).to.include("Lisbon, Portugal");
    });
  });

  describe("SafeBox Staking", function () {
    beforeEach(async function () {
      // Mint some NOLN tokens to users for testing
      await nolnToken.mint(user1Address, ethers.parseEther("10000"));
      await nolnToken.mint(user1Address, ethers.utils.parseEther("10000"));
      await nolnToken.mint(user2Address, ethers.utils.parseEther("10000"));
    });

    it("Should initialize with correct parameters", async function () {
      expect(await safeBox.nolnToken()).to.equal(nolnToken.address);
      expect(await safeBox.annualRewardRate()).to.equal(800);
      expect(await safeBox.minLockPeriod()).to.equal(30 * 24 * 60 * 60);
      expect(await safeBox.maxLockPeriod()).to.equal(365 * 24 * 60 * 60);
    });

    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 90 * 24 * 60 * 60; // 90 days
      
      await nolnToken.connect(user1).approve(safeBox.address, stakeAmount);
      await safeBox.connect(user1).stake(stakeAmount, lockPeriod);
      
      const userStakes = await safeBox.getUserStakes(user1Address);
      expect(userStakes.length).to.equal(1);
      expect(userStakes[0].amount).to.equal(stakeAmount);
      expect(userStakes[0].isActive).to.be.true;
      
      expect(await safeBox.userTotalStaked(user1Address)).to.equal(stakeAmount);
      expect(await safeBox.totalStaked()).to.equal(stakeAmount);
    });

    it("Should prevent staking with invalid lock period", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const invalidLockPeriod = 10 * 24 * 60 * 60; // 10 days (too short)
      
      await nolnToken.connect(user1).approve(safeBox.address, stakeAmount);
      await expect(
        safeBox.connect(user1).stake(stakeAmount, invalidLockPeriod)
      ).to.be.revertedWithCustomError(safeBox, "InvalidLockPeriod");
    });

    it("Should prevent staking with zero amount", async function () {
      const stakeAmount = 0;
      const lockPeriod = 90 * 24 * 60 * 60;
      
      await nolnToken.connect(user1).approve(safeBox.address, ethers.utils.parseEther("1000"));
      await expect(
        safeBox.connect(user1).stake(stakeAmount, lockPeriod)
      ).to.be.revertedWithCustomError(safeBox, "InvalidAmount");
    });

    it("Should calculate rewards correctly", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 365 * 24 * 60 * 60; // 1 year
      
      await nolnToken.connect(user1).approve(safeBox.address, stakeAmount);
      await safeBox.connect(user1).stake(stakeAmount, lockPeriod);
      
      // For 1 year with 8% rate, reward should be 80 NOLN
      const reward = await safeBox.calculateRewards(user1Address, 0);
      expect(reward).to.be.closeTo(
        ethers.utils.parseEther("80"),
        ethers.utils.parseEther("1") // Allow small tolerance for time differences
      );
    });

    it("Should allow withdrawal after lock period", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 30 * 24 * 60 * 60; // 30 days
      
      await nolnToken.connect(user1).approve(safeBox.address, stakeAmount);
      await safeBox.connect(user1).stake(stakeAmount, lockPeriod);
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      const initialBalance = await nolnToken.balanceOf(user1Address);
      await safeBox.connect(user1).withdraw(0);
      const finalBalance = await nolnToken.balanceOf(user1Address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should prevent withdrawal before lock period", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 30 * 24 * 60 * 60; // 30 days
      
      await nolnToken.connect(user1).approve(safeBox.address, stakeAmount);
      await safeBox.connect(user1).stake(stakeAmount, lockPeriod);
      
      await expect(
        safeBox.connect(user1).withdraw(0)
      ).to.be.revertedWithCustomError(safeBox, "StakeNotMatured");
    });

    it("Should prevent double withdrawal", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 30 * 24 * 60 * 60; // 30 days
      
      await nolnToken.connect(user1).approve(safeBox.address, stakeAmount);
      await safeBox.connect(user1).stake(stakeAmount, lockPeriod);
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      await safeBox.connect(user1).withdraw(0);
      
      await expect(
        safeBox.connect(user1).withdraw(0)
      ).to.be.revertedWithCustomError(safeBox, "StakeAlreadyWithdrawn");
    });

    it("Should get total pending rewards correctly", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 90 * 24 * 60 * 60; // 90 days
      
      await nolnToken.connect(user1).approve(safeBox.address, stakeAmount);
      await safeBox.connect(user1).stake(stakeAmount, lockPeriod);
      
      const pendingRewards = await safeBox.getTotalPendingRewards(user1Address);
      expect(pendingRewards).to.be.gt(0);
    });

    it("Should update reward rate correctly", async function () {
      const newRate = 1000; // 10%
      await safeBox.updateRewardRate(newRate);
      expect(await safeBox.annualRewardRate()).to.equal(newRate);
    });

    it("Should update lock periods correctly", async function () {
      const newMinPeriod = 60 * 24 * 60 * 60; // 60 days
      const newMaxPeriod = 730 * 24 * 60 * 60; // 2 years
      
      await safeBox.updateLockPeriods(newMinPeriod, newMaxPeriod);
      expect(await safeBox.minLockPeriod()).to.equal(newMinPeriod);
      expect(await safeBox.maxLockPeriod()).to.equal(newMaxPeriod);
    });

    it("Should prevent unauthorized operations", async function () {
      await expect(
        safeBox.connect(user1).updateRewardRate(1000)
      ).to.be.revertedWith("AccessControl");
      
      await expect(
        safeBox.connect(user1).updateLockPeriods(60 * 24 * 60 * 60, 730 * 24 * 60 * 60)
      ).to.be.revertedWith("AccessControl");
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete booking flow", async function () {
      // 1. Mint SoulStamp for new user
      const soulStampMetadata = "ipfs://QmTestSoulStamp/metadata.json";
      await soulStamp.mint(user1Address, soulStampMetadata);
      const soulStampTokenId = await soulStamp.getTokenId(user1Address);
      
      // 2. Complete booking and mint NomadPass
      const bookingId = "BOOK001";
      const location = "Lisbon, Portugal";
      const perkType = "VIP Access";
      const validUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const nomadPassMetadata = "ipfs://QmTestNomadPass/metadata.json";
      
      await nomadPass.mint(
        user1Address,
        bookingId,
        location,
        perkType,
        validUntil,
        nomadPassMetadata
      );
      
      // 3. Pay cashback
      const cashbackAmount = ethers.utils.parseEther("100");
      await nolnToken.payCashback(user1Address, cashbackAmount, bookingId);
      
      // 4. User stakes tokens
      const stakeAmount = ethers.utils.parseEther("50");
      const lockPeriod = 90 * 24 * 60 * 60;
      
      await nolnToken.connect(user1).approve(safeBox.address, stakeAmount);
      await safeBox.connect(user1).stake(stakeAmount, lockPeriod);
      
      // Verify final state
      expect(await soulStamp.ownerOf(soulStampTokenId)).to.equal(user1Address);
      expect(await nomadPass.ownerOf(1)).to.equal(user1Address);
      expect(await nolnToken.balanceOf(user1Address)).to.equal(
        cashbackAmount.sub(stakeAmount)
      );
      expect(await safeBox.userTotalStaked(user1Address)).to.equal(stakeAmount);
    });

    it("Should handle multiple users and stakes", async function () {
      // Setup users with tokens
      await nolnToken.mint(user1Address, ethers.utils.parseEther("10000"));
      await nolnToken.mint(user2Address, ethers.utils.parseEther("10000"));
      
      // User 1 stakes
      const stake1Amount = ethers.utils.parseEther("1000");
      const lock1Period = 90 * 24 * 60 * 60;
      await nolnToken.connect(user1).approve(safeBox.address, stake1Amount);
      await safeBox.connect(user1).stake(stake1Amount, lock1Period);
      
      // User 2 stakes
      const stake2Amount = ethers.utils.parseEther("2000");
      const lock2Period = 180 * 24 * 60 * 60;
      await nolnToken.connect(user2).approve(safeBox.address, stake2Amount);
      await safeBox.connect(user2).stake(stake2Amount, lock2Period);
      
      // Verify total staked
      expect(await safeBox.totalStaked()).to.equal(stake1Amount.add(stake2Amount));
      
      // Verify individual stakes
      const user1Stakes = await safeBox.getUserStakes(user1Address);
      const user2Stakes = await safeBox.getUserStakes(user2Address);
      
      expect(user1Stakes.length).to.equal(1);
      expect(user2Stakes.length).to.equal(1);
      expect(user1Stakes[0].amount).to.equal(stake1Amount);
      expect(user2Stakes[0].amount).to.equal(stake2Amount);
    });
  });

  describe("Access Control", function () {
    it("Should enforce role-based access control", async function () {
      // Test admin functions
      await soulStamp.pause();
      expect(await soulStamp.paused()).to.be.true;
      await soulStamp.unpause();
      expect(await soulStamp.paused()).to.be.false;
      
      await nomadPass.pause();
      expect(await nomadPass.paused()).to.be.true;
      await nomadPass.unpause();
      expect(await nomadPass.paused()).to.be.false;
      
      await nolnToken.pause();
      expect(await nolnToken.paused()).to.be.true;
      await nolnToken.unpause();
      expect(await nolnToken.paused()).to.be.false;
      
      await safeBox.pause();
      expect(await safeBox.paused()).to.be.true;
      await safeBox.unpause();
      expect(await safeBox.paused()).to.be.false;
    });

    it("Should prevent unauthorized access", async function () {
      await expect(
        soulStamp.connect(user1).pause()
      ).to.be.revertedWith("AccessControl");
      
      await expect(
        nomadPass.connect(user1).pause()
      ).to.be.revertedWith("AccessControl");
      
      await expect(
        nolnToken.connect(user1).pause()
      ).to.be.revertedWith("AccessControl");
      
      await expect(
        safeBox.connect(user1).pause()
      ).to.be.revertedWith("AccessControl");
    });
  });

  describe("Upgradability", function () {
    it("Should support UUPS upgrades", async function () {
      // This test verifies that the contracts are properly set up for UUPS upgrades
      // In a real scenario, you would deploy a new implementation and upgrade
      expect(await soulStamp.UPGRADER_ROLE()).to.equal(UPGRADER_ROLE);
      expect(await nomadPass.UPGRADER_ROLE()).to.equal(UPGRADER_ROLE);
      expect(await nolnToken.UPGRADER_ROLE()).to.equal(UPGRADER_ROLE);
      expect(await safeBox.UPGRADER_ROLE()).to.equal(UPGRADER_ROLE);
    });
  });
}); 