//I want to learn how to create a staking dapp

//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

//This handles the main contract
contract Stakechain {
    address public owner;

    //This handles the struct for the staking
    struct Stake {
        uint stakeID;
        address walletAddress;
        uint createdDate;
        uint unlockDate;
        uint percentInterest;
        uint weiStaked;
        uint weiInterest;
        bool open;
    }

    Stake stake;
    uint public currentStakeID;
    mapping(uint => Stake) public stakes;
    mapping(address => uint[]) public addressStakeID;
    mapping(uint => uint) public tiers;
    uint[] public lockPeriods;

    constructor() payable {
        owner = msg.sender;
        currentStakeID = 0;

        tiers[30] = 700;
        tiers[90] = 1000;
        tiers[180] = 1200;

        lockPeriods.push(30);
        lockPeriods.push(90);
        lockPeriods.push(180);
    }

    //This modifier checks for owner priviledge on the called function
    modifier onlyOnwer() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    //This function handles the staking of ether
    function stakeEther(uint numDays) external payable {
        require(tiers[numDays] > 0, "Mapping not found");

        stakes[currentStakeID] = Stake(
            currentStakeID,
            msg.sender,
            block.timestamp,
            block.timestamp + (numDays * 1 days),
            tiers[numDays],
            msg.value,
            calculateInterest(tiers[numDays], msg.value),
            true
        );

        addressStakeID[msg.sender].push(currentStakeID);
        currentStakeID += 1;
    }

    //This function calculates the interest of the staked ether
    function calculateInterest(uint roi, uint weiAmount)
        private
        pure
        returns (uint)
    {
        return (roi * weiAmount) / 10000;
    }

    //This function allows the owner to modifier the details about the tiers
    function modifyTier(uint numDays, uint roi) external onlyOnwer {
        tiers[numDays] = roi;
        lockPeriods.push(numDays);
    }

    //This function gets the lock periods
    function getLockPeriods() external view returns (uint[] memory) {
        return lockPeriods;
    }

    //This function gets the interest rate of a specified tier
    function getInterestRate(uint numDays) external view returns (uint) {
        return tiers[numDays];
    }

    //This function gets the stake details of a specified index
    function getStakeInfo(uint index) external view returns (Stake memory) {
        return stakes[index];
    }

    //This function gets the stake IDs of a specified address
    function getAddressStakeID(address walletAddress)
        external
        view
        returns (uint[] memory)
    {
        return addressStakeID[walletAddress];
    }

    //This function changes the unlock date
    function changeUnlockDate(uint index, uint newUnlockDate)
        external
        onlyOnwer
    {
        stakes[index].unlockDate = newUnlockDate;
    }

    //This function handles the evaluation of the staking periods
    function closePosition(uint index) external {
        require(
            stakes[index].walletAddress == msg.sender,
            "Only the staker can modify this stake"
        );
        require(stakes[index].open == true, "Position is closed");

        stakes[index].open = false;

        //Checking if the date period has been elapsed or not
        if (block.timestamp > stakes[index].unlockDate) {
            uint amount = stakes[index].weiStaked + stakes[index].weiStaked;
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "Transfer didn't go through");
        } else {
            (bool success, ) = payable(msg.sender).call{
                value: stakes[index].weiStaked
            }("");
            require(success, "Transfer didn't go through");
        }
    }
}
