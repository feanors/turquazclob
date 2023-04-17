
const { expect } = require("chai");

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("Settler contract", function () {

  async function deployTokenFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const FakeAvax = await ethers.getContractFactory("Token");
    const favax = await FakeAvax.deploy("fake avax", "favax", 1000000);
    await favax.deployed();

    const FakeUSD = await ethers.getContractFactory("Token");
    const fusd = await FakeUSD.deploy("fake usd", "fusd", 100000000);
    await fusd.deployed();

    const settler = await ethers.getContractFactory("Settler");
    const settlerContract = await settler.deploy();
    await settlerContract.deployed();

    const fillOrderVRS = async (order, signer) => {
      const types = [
        "address",
        "address",
        "address",
        "address",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
      ];
        
      const values = [
        order.creator,
        order.settler,
        order.requestedToken,
        order.releasedToken,
        order.requestAmount,
        order.releaseAmount,
        order.creationTime,
        order.expirationTime,
        order.randNonce
      ];

      const packedValues = ethers.utils.defaultAbiCoder.encode(types, values);
      const msgHash = ethers.utils.keccak256(packedValues);
      const signature = await signer.signMessage(ethers.utils.arrayify(msgHash))
      const {v, r, s} = ethers.utils.splitSignature(signature);

      order.v = v;
      order.r = r;
      order.s = s;
    }


    const date = new Date(Date.now() + (1000 * 60 * 60 * 24))
    const order1 = {
        creator: addr1.address,
        settler: owner.address,
        requestedToken: fusd.address,
        releasedToken: favax.address,
        requestAmount: 1000,
        releaseAmount: 100,
        creationTime: Date.now(),
        expirationTime: Math.floor(date.getTime() / 1000),
        randNonce: Math.floor(Math.random() * 100000),
    }

    const ethOrderSeller = {
      creator: addr1.address,
        settler: owner.address,
        requestedToken: fusd.address,
        releasedToken: ethers.constants.AddressZero,
        requestAmount: 10,
        releaseAmount: ethers.utils.parseEther("1"),
        creationTime: Date.now(),
        expirationTime: Math.floor(date.getTime() / 1000),
        randNonce: Math.floor(Math.random() * 100000),
    }

    const ethOrderBuyer = {
      creator: addr2.address,
        settler: owner.address,
        requestedToken: ethers.constants.AddressZero,
        releasedToken: fusd.address,
        requestAmount: ethers.utils.parseEther("1"),
        releaseAmount: 10,
        creationTime: Date.now(),
        expirationTime: Math.floor(date.getTime() / 1000),
        randNonce: Math.floor(Math.random() * 100000),
    }

    const order2 = {
        creator: addr2.address,
        settler: owner.address,
        requestedToken: favax.address,
        releasedToken: fusd.address,
        requestAmount: 100,
        releaseAmount: 1000,
        creationTime: Date.now(),
        expirationTime: Math.floor(date.getTime() / 1000),
        randNonce: Math.floor(Math.random() * 100000),
    }

    const order3 = {
      creator: addr1.address,
      settler: owner.address,
      requestedToken: fusd.address,
      releasedToken: favax.address,
      requestAmount: 1000,
      releaseAmount: 100,
      creationTime: order1.creationTime,
      expirationTime: order1.expirationTime,
      randNonce: order1.randNonce,
  }

  const order4 = {
      creator: addr2.address,
      settler: owner.address,
      requestedToken: favax.address,
      releasedToken: fusd.address,
      requestAmount: 100,
      releaseAmount: 1000,
      creationTime: order2.creationTime,
      expirationTime: order2.expirationTime,
      randNonce: order2.randNonce,
  }

    // Fill addresses from owner
    await favax.transfer(addr1.address, 10000);
    await fusd.transfer(addr2.address, 10000);

    // addr1 deposits 100 fake eth
    await favax.connect(addr1).approve(settlerContract.address, 1000);
    await settlerContract.connect(addr1).deposit(favax.address, 1000);

    // addr1 deposits 1 eth
    const depositAmount = ethers.utils.parseEther("1")
    await settlerContract.connect(addr1).deposit(ethers.constants.AddressZero, depositAmount,{value: depositAmount});

    // addr2 deposits 10000 fake usd
    await fusd.connect(addr2).approve(settlerContract.address, 10000);
    await settlerContract.connect(addr2).deposit(fusd.address, 10000);

    return { ethOrderBuyer, ethOrderSeller, settler, settlerContract, favax, fusd, owner, addr1, addr2, order1, order2, order3, order4, fillOrderVRS };
  }

  describe("Util tokens deployment", function() {
    it("Should assign the total supplys of tokens to the owner", async function () {
      const { favax, fusd, owner } = await loadFixture(deployTokenFixture);
      const transferredBefore = 10000;

      const favaxOwnerBalance = await favax.balanceOf(owner.address);
      expect(await favax.totalSupply()).to.equal(favaxOwnerBalance.add(transferredBefore));

      const fusdOwnerBalance = await fusd.balanceOf(owner.address)
      expect(await fusd.totalSupply()).to.equal(fusdOwnerBalance.add(transferredBefore));

    });
  });

  describe("Deposits and Withdrawls", function () {

    it("Should deposit and withdraw 1 ethereum correctly from a depositer", async function () {
        const { owner, settlerContract } = await loadFixture(deployTokenFixture);
        const depositAmount = ethers.utils.parseEther("1")
        await settlerContract.deposit(ethers.constants.AddressZero, depositAmount,{ value: depositAmount});
        expect(await settlerContract.balanceOf(owner.address, ethers.constants.AddressZero)).to.equal(depositAmount);
        await settlerContract.withdraw(ethers.constants.AddressZero, depositAmount);
        expect(await settlerContract.balanceOf(owner.address, ethers.constants.AddressZero)).to.equal(0);
    });

    it("Should deposit and withdraw 1 fake avax(erc20) correctly from a depositer", async function () {
      const { favax, owner, settlerContract } = await loadFixture(deployTokenFixture);
      await favax.approve(settlerContract.address, 1);
      await settlerContract.deposit(favax.address, 1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      await settlerContract.withdraw(favax.address, 1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(0);
    });

    it("Should deposit and withdraw 1 fake usd(erc20) correctly from a depositer", async function () {
      const { fusd, owner, settlerContract } = await loadFixture(deployTokenFixture);
      await fusd.approve(settlerContract.address, 1);
      await settlerContract.deposit(fusd.address, 1);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(1);
      await settlerContract.withdraw(fusd.address, 1);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(0);
    });
  });

  describe("Settle exchange of two orders", function () {

    it("Should swap 1 eth to 10 fake usd correctly from two orders", async function () {
      const {ethOrderBuyer, ethOrderSeller, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      await fillOrderVRS(ethOrderSeller, addr1)
      await fillOrderVRS(ethOrderBuyer, addr2)
    
      await settlerContract.connect(owner).settle(ethOrderSeller, ethOrderBuyer);

      expect(await settlerContract.balanceOf(addr2.address, ethers.constants.AddressZero)).to.equal(ethers.utils.parseEther("0.99"));
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(10);        
    });

    it("Should swap 100 fake avax to 1000 fake usd correctly from two orders", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

    
      await settlerContract.connect(owner).settle(order1, order2);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(99);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(990);        
    });

    it("Should swap 100 fake avax to 1000 fake usd correctly from two orders when there is positive price difference", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);


      order1.requestAmount = 800;
      order2.releaseAmount = 1000;

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      console.log(order1)
      console.log(order2)
    
      await settlerContract.connect(owner).settle(order1, order2);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(99);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);


      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(891);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 900)
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(9)


    });

    it("Should fail to settle due to order 1 expiration", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const date = new Date(Date.now() - (1000 * 60 * 60 * 24))
      order1.expirationTime = Math.floor(date.getTime() / 1000)

      order1.requestAmount = 1000;
      order2.releaseAmount = 1000;
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await expect(settlerContract.settle(order1,order2)).to.be.revertedWith("Order 1 expired");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to order 2 expiration", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);


      // weird behaviour where if only order2's expiration date is set to an old date
      // order1's also get set somehow?? im assuming this to be a js thing?
      const date1 = new Date(Date.now() + (1000 * 60 * 60 * 24));
      const date2 = new Date(Date.now() - (1000 * 60 * 60 * 24));

      order1.expirationTime = Math.floor(date1.getTime() / 1000);
      order2.expirationTime = Math.floor(date2.getTime() / 1000);

      await fillOrderVRS(order1, addr1);
      await fillOrderVRS(order2, addr2);
      
      await expect(settlerContract.settle(order1,order2)).to.be.revertedWith("Order 2 expired");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to order 1 force cancellation", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const date = new Date(Date.now() + (1000 * 60 * 60 * 24))
      order1.expirationTime = Math.floor(date.getTime() / 1000)
      order2.expirationTime = Math.floor(date.getTime() / 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await settlerContract.connect(addr1).forceCancelAll(Math.floor(Date.now()));

      await expect(settlerContract.settle(order1,order2)).to.be.revertedWith("Order1 creator called for a force cancel");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to order 2 force cancellation", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const date = new Date(Date.now() + (1000 * 60 * 60 * 24))
      order1.expirationTime = Math.floor(date.getTime() / 1000)
      order2.expirationTime = Math.floor(date.getTime() / 1000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await settlerContract.connect(addr2).forceCancelAll(Math.floor(Date.now()));

      await expect(settlerContract.settle(order1,order2)).to.be.revertedWith("Order2 creator called for a force cancel");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });


    it("Should fail to settle due to order 1 already settled", async function () {
      const {order1, order2, order4, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order4, addr2)

      await settlerContract.settle(order1, order2); 
      
      await expect(settlerContract.settle(order1, order4)).to.be.revertedWith("Order 1 was settled before");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(99);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(990);        
    });

    it("Should fail to settle due to order 2 already settled", async function () {
      const {order1, order2, order3, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      order3.randNonce = Math.floor(Math.random()* 1000)
      await fillOrderVRS(order3, addr1)

      await settlerContract.settle(order1, order2); 
      
      await expect(settlerContract.settle(order3, order2)).to.be.revertedWith("Order 2 was settled before");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(99);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(990);        
    });

    it("Should fail to settle due to Order 1 release amount does not match order2 request amount", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);
      
      order1.releaseAmount = 1
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      
      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 1 release amount does not match order2 request amount");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 2 release amount does not match order1 request amount", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      // same bug with the time example
      // both orders get adjusted for some reason
      // 100 below is the default value
      
      order1.releaseAmount = 100;

      const nonMatchingReleaseAmount = 1;
      order2.releaseAmount = nonMatchingReleaseAmount;
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      
      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 2 release amount does not match order1 request amount");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 1 does not have enough asset to release", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);


      // js why u do this :(
      order1.releaseAmount = 1001;
      order1.requestAmount = 1;
      order2.requestAmount = 1001;
      order2.releaseAmount = 1;
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      
      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 1 does not have enough asset to release");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 2 does not have enough asset to release", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);


      // js why u do this :(
      order1.releaseAmount = 1;
      order1.requestAmount = 10001;
      order2.requestAmount = 1;
      order2.releaseAmount = 10001;
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      
      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 2 does not have enough asset to release");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 1 could not be verified", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      // ahh i think previous calls are affecting this
      // maybe i misunderstood how loadfixture works?? will check later, but for balances it looked fine?
      order1.releaseAmount = 1;
      order1.requestAmount = 1;
      order2.requestAmount = 1;
      order2.releaseAmount = 1;
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      order1.v = 4;
      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 1 could not be verified");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 1 could not be verified", async function () {
      const {order1, order2, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      order1.releaseAmount = 1;
      order1.requestAmount = 1;
      order2.requestAmount = 1;
      order2.releaseAmount = 1;
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order1, addr1)
      order2.v = 4;

      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 2 could not be verified");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

  });

  
});


/*
SOME TODO

figure out the bug related to either orders getting affected from previous orders,
or change in order vars affecting another order
or maybe its both idk

refactor namings, magic values to named constants etc

should tests be more compact on related notes or keep it as seperated as possible?
*/
