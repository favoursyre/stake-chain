//I want to create the deploy script for the stakechain app

//Useful libraries that I would be working with -->
const { ethers, waffle } = require("hardhat");

//Commencing the script
async function stakechain() {
  [signer1, signer2] = await ethers.getSigners();
  Stake = await ethers.getContractFactory("Stakechain", signer1);
  // console.log("Stake", Stake);
  staking = await Stake.deploy({
    value: ethers.utils.parseEther("25"),
  });
  console.log(
    "Stakechain contract deployed to ",
    staking.address,
    "by ",
    signer1.address
  );
  const provider = waffle.provider;
  let data;
  let transaction;
  let receipt;
  let block;
  let newUnlockDate;

  data = { value: ethers.utils.parseEther("0.5") };
  transaction = await staking.connect(signer2).stakeEther(30, data);
  console.log("transaction 1", transaction);

  data = { value: ethers.utils.parseEther("1") };
  transaction = await staking.connect(signer2).stakeEther(90, data);
  console.log("transaction 2", transaction);

  data = { value: ethers.utils.parseEther("1.75") };
  transaction = await staking.connect(signer2).stakeEther(180, data);
  console.log("transaction 3", transaction);

  data = { value: ethers.utils.parseEther("5") };
  transaction = await staking.connect(signer2).stakeEther(90, data);
  console.log("transaction 4", transaction);
  receipt = await transaction.wait();
  block = await provider.getBlock();
  newUnlockDate = block.timestamp - 8640000;
  await staking.connect(signer1).changeUnlockDate(3, newUnlockDate);

  data = { value: ethers.utils.parseEther("1.75") };
  transaction = await staking.connect(signer2).stakeEther(90, data);
  console.log("transaction 5", transaction);
  receipt = await transaction.wait();
  block = await provider.getBlock();
  console.log("Before", block.timestamp);
  newUnlockDate = block.timestamp - 8640000;
  console.log("After", block.timestamp);
  await staking.connect(signer1).changeUnlockDate(4, newUnlockDate);
}

async function main() {
  await stakechain();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
