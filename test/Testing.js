//This script would be used for testing my smart contract

//Useful libraries that I would be working with -->
const { expect } = require("chai");
const { ethers } = require("hardhat");

//Commencing with the tests
describe("Stakechain", () => {
  beforeEach(async () => {
    [signer1, signer2] = await ethers.getSigners();
    //console.log("Signer1", signer1);
    // console.log("Signer2", signer2);

    Stake = await ethers.getContractFactory("Stakechain", signer1);
    // console.log("Stake", Stake);
    staking = await Stake.deploy({
      value: ethers.utils.parseEther("25"),
    });
    // console.log("Staking", staking);
  });

  //This handles the test for the deployment of the smart contract
  describe("deploy", () => {
    it("should set owner", async () => {
      expect(await staking.owner()).to.equal(signer1.address);
    });
    it("sets up tiers and lockPeriods", async () => {
      expect(await staking.lockPeriods(0)).to.equal(30);
      expect(await staking.lockPeriods(1)).to.equal(90);
      expect(await staking.lockPeriods(2)).to.equal(180);

      expect(await staking.tiers(30)).to.equal(700);
      expect(await staking.tiers(90)).to.equal(1000);
      expect(await staking.tiers(180)).to.equal(1200);
    });
  });

  //This handles the test for the stake ether function
  describe("stakeEther", () => {
    it("transfers ether", async () => {
      const provider = waffle.provider;
      let contractBalance;
      let signerBalance;
      const transferAmount = ethers.utils.parseEther("2.0");

      contractBalance = await provider.getBalance();
      signerBalance = await signer1.getBalance();

      const data = { value: transferAmount };
      const transaction = await staking.connect(signer1).stakeEther(30, data);
      const receipt = await transaction.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      //This test the change in signer1 ether's balance
      expect(await signer1.getBalance()).to.equal(
        signerBalance.sub(transferAmount).sub(gasUsed)
      );

      //This test the change in the contract ether's balance
      expect(await provider.getBalance(staking.address)).to.equal(
        contractBalance.add(transferAmount)
      );
    });

    //This handles test for checking if stakes are added properly
    it("adds a stake to the Stake struct", async () => {
      const provider = waffle.provider;
      let stake;
      const transferAmount = ethers.utils.parseEther("1.0");
      stake = await staking.stakes(0);

      expect(stake.stakeID).to.equal(0);
      expect(stake.walletAddress).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(stake.createdDate).to.equal(0);
      expect(stake.unlockDate).to.equal(0);
      expect(stake.percentInterest).to.equal(0);
      expect(stake.weiStaked).to.equal(0);
      expect(stake.weiInterest).to.equal(0);
      expect(stake.open).to.equal(false);
      expect(await staking.currentStakeID()).to.equal(0);

      data = { value: transferAmount };
      const transaction = await staking.connect(signer1).stakeEther(90, data);
      const receipt = await transaction.wait();
      const block = await provider.getBlock(receipt.blockNumber);
      stake = await staking.stakes(0);

      expect(stake.stakeID).to.equal(0);
      expect(stake.walletAddress).to.equal(signer1.address);
      expect(stake.createdDate).to.equal(block.timestamp);
      expect(stake.unlockDate).to.equal(block.timestamp + 86400 * 90);
      expect(stake.percentInterest).to.equal(1000);
      expect(stake.weiStaked).to.equal(transferAmount);
      expect(stake.weiInterest).to.equal(
        ethers.BigNumber.from(transferAmount).mul(1000).div(10000)
      );
      expect(stake.open).to.equal(true);
      expect(await staking.currentStakeID()).to.equal(1);
    });

    //This handles the test for adding addresses to address stake ID
    it("adds address to stakeID to addressStakeID", async () => {
      const transferAmount = ethers.utils.parseEther("0.5");
      const data = { value: transferAmount };
      await staking.connect(signer1).stakeEther(30, data);
      await staking.connect(signer1).stakeEther(30, data);
      await staking.connect(signer2).stakeEther(90, data);

      expect(await staking.addressStakeID(signer1.address, 0)).to.equal(0);
      expect(await staking.addressStakeID(signer1.address, 1)).to.equal(1);
      expect(await staking.addressStakeID(signer2.address, 0)).to.equal(2);
    });
  });

  //This handles the test for modifying lock periods
  describe("modifyTier", () => {
    //This handles for owner
    describe("owner", () => {
      it("should create a new lock period", async () => {
        await staking.connect(signer1).modifyTier(100, 999);
        expect(await staking.tiers(100)).to.equal(999);
        expect(await staking.lockPeriods(3)).to.equal(100);
      });
      it("should modify an existing lock period", async () => {
        await staking.connect(signer1).modifyTier(30, 150);
        expect(await staking.tiers(30)).to.equal(150);
      });
    });

    //This handles for non-owner
    describe("non-owner", () => {
      it("it should revert since its accessed by the owner", async () => {
        expect(
          staking.connect(signer2).modifyTier(100, 999)
        ).to.be.revertedWith("Only owner may modify the staking periods");
      });
    });
  });

  //This handles the test for getting lock periods
  describe("getLockPeriods", () => {
    it("returns all lock periods", async () => {
      const lockPeriods = await staking.getLockPeriods();
      expect(lockPeriods.map((v) => Number(v._hex))).to.eql([30, 90, 180]);
    });
  });

  //This handles the test for getting interest rates
  describe("getInterestRate", () => {
    it("returns the interest rate for a specific lock period", async () => {
      const interestRate = await staking.getInterestRate(30);
      expect(interestRate).to.equal(700);
    });
  });

  //This handles the test for getting stake ID
  describe("getStakeInfo", () => {
    it("returns data about a specific stake, given the stake ID", async () => {
      const provider = waffle.provider;
      const transferAmount = ethers.utils.parseEther("3");
      const data = { value: transferAmount };
      const transaction = await staking.connect(signer1).stakeEther(90, data);
      const receipt = transaction.wait();
      const block = await provider.getBlock(receipt.blockNumber);
      const stake = await staking.connect(signer1.address).getStakeInfo(0);
      expect(stake.stakeID).to.equal(0);
      expect(stake.walletAddress).to.equal(signer1.address);
      expect(stake.createdDate).to.equal(block.timestamp);
      expect(stake.unlockDate).to.equal(block.timestamp + 86400 * 90);
      expect(stake.percentInterest).to.equal(1000);
      expect(stake.weiStaked).to.equal(transferAmount);
      expect(stake.weiInterest).to.equal(
        ethers.BigNumber.from(transferAmount).mul(1000).div(10000)
      );
      expect(stake.open).to.equal(true);
    });
  });

  //This handles the test for getting stake ID by address
  describe("getAddressStakeID", () => {
    it("returns a list of stake ID's created by the specific address", async () => {
      let data;
      let transaction;
      data = { value: ethers.utils.parseEther("5") };
      transaction = await staking.connect(signer1).stakeEther(90, data);
      data = { value: ethers.utils.parseEther("10") };
      transaction = await staking.connect(signer1).stakeEther(90, data);

      const stakeIDs = await staking.getAddressStakeID(signer1.address);
      expect(stakeIDs.map((p) => Number(p))).to.eql([0, 1]);
    });
  });

  //This handles the test for changing unlock dates
  describe("changeUnlockDate", () => {
    //This handles test for owners
    describe("owner", () => {
      it("changes the unlock date", async () => {
        const data = { value: ethers.utils.parseEther("8") };
        const transaction = await staking.connect(signer2).stakeEther(90, data);
        const oldStake = await staking.getStakeInfo(0);
        const newUnlockDate = oldStake.unlockDate - 86400 * 500;
        await staking.connect(signer1).changeUnlockDate(0, newUnlockDate);
        const newStake = await staking.getStakeInfo(0);
        expect(newStake.unlockDate).to.be.equal(
          oldStake.unlockDate - 86400 * 500
        );
      });
    });

    //This handles test for non-owners
    describe("non-owner", () => {
      it("it should revert because it's not been accessed by the owner", async () => {
        const data = { value: ethers.utils.parseEther("8") };
        const transaction = await staking.connect(signer2).stakeEther(90, data);
        const oldStake = await staking.getStakeInfo(0);
        const newUnlockDate = oldStake.unlockDate - 86400 * 500;
        expect(
          staking.connect(signer2).changeUnlockDate(0, newUnlockDate)
        ).to.be.revertedWith("Only owner may modify the staking periods");
      });
    });
  });

  //This handles the test for closing stakes
  describe("closePosition", () => {
    //This checks for the value if the unlock date is reached
    describe("after unlock date", () => {
      it("transfers both principal and interest", async () => {
        let transaction;
        let receipt;
        let block;
        const provider = waffle.provider;
        const data = { value: ethers.utils.parseEther("6") };
        transaction = await staking.connect(signer2).stakeEther(30, data);
        receipt = transaction.wait();
        block = await provider.getBlock(receipt.blockNumber);
        //console.log("block number", block);
        const newDate = 86400 * 100;
        const newUnlockDate = block.timestamp - newDate;
        await staking.connect(signer1).changeUnlockDate(0, newUnlockDate);
        const stake = await staking.getStakeInfo(0);
        // console.log("stake", stake);
        const signerBalanceBefore = await signer2.getBalance();
        console.log("Balance before", signerBalanceBefore);
        transaction = await staking.connect(signer2).closePosition(0);
        receipt = await transaction.wait();
        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const signerBalanceAfter = await signer2.getBalance();
        console.log("Balance after", signerBalanceAfter);

        before = signerBalanceBefore
          .sub(gasUsed)
          .add(stake.weiInterest)
          .add(stake.weiStaked);
        console.log("Balance before remodel", before);
        expect(signerBalanceAfter).to.equal(
          signerBalanceBefore
            .sub(gasUsed)
            .add(stake.weiStaked)
            .add(stake.weiInterest)
        );
      });
    });

    //This checks for the value if the unlock date is not reached
    describe("before unlock date", () => {
      it("transfers only principal", async () => {
        let transaction;
        let receipt;
        let block;
        const provider = waffle.provider;
        const data = { value: ethers.utils.parseEther("6") };
        transaction = await staking.connect(signer2).stakeEther(90, data);
        receipt = transaction.wait();
        block = await provider.getBlock(receipt.blockNumber);
        const newDate = 86400 * 100;
        const newUnlockDate = block.timestamp - newDate;
        await staking.connect(signer1).changeUnlockDate(0, newUnlockDate);
        const stake = await staking.getStakeInfo(0);
        const signerBalanceBefore = await signer2.getBalance();
        transaction = await staking.connect(signer2).closePosition(0);
        receipt = await transaction.wait();
        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const signerBalanceAfter = await signer2.getBalance();
        expect(signerBalanceAfter).to.equal(
          signerBalanceBefore.sub(gasUsed).add(stake.weiStaked)
        );
      });
    });
  });
});
