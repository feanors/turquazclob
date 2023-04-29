
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

    const Signer = await ethers.getContractFactory("SignerContract");
    const signerContract = await Signer.deploy(settlerContract.address);
    await signerContract.deployed();

    const createOrder = (creator, settler, orderType, basePair, requestedToken, releasedToken, requestAmount, releaseAmount) => {
      const date = new Date(Date.now() + (1000 * 60 * 60 * 24))
      return {
        creator: creator,
        settler: settler,
        orderType: orderType,
        basePair: basePair,
        requestedToken: requestedToken,
        releasedToken: releasedToken,
        requestAmount: requestAmount,
        releaseAmount: releaseAmount,
        creationTime: Date.now(),
        expirationTime: Math.floor(date.getTime() / 1000),
        randNonce: Math.floor(Math.random() * 100000),
      }
    }

    const fillOrderVRS = async (order, signer) => {
      const domain = {
        name: "Turquaz",
        version: "0.1",
        chainId: 43114,
        verifyingContract: settlerContract.address,
      }
      
      const types = {
          Order: [
          { name: "creator", type: "address"},
          { name: "settler", type: "address"},
          { name: "orderType", type: "uint8"},
          { name: "basePair", type: "address"},
          { name: "requestedToken", type: "address"},
          { name: "releasedToken", type: "address"},
          { name: "requestAmount", type: "uint256"},
          { name: "releaseAmount", type: "uint256"},
          { name: "creationTime", type: "uint256"},
          { name: "expirationTime", type: "uint256"},
          { name: "randNonce", type: "uint256"},
        ],
      }
      const signature = await signer._signTypedData(domain, types, order);

      const {v, r, s} = ethers.utils.splitSignature(signature);

      order.v = v;
      order.r = r;
      order.s = s;
    }


    const date = new Date(Date.now() + (1000 * 60 * 60 * 24))
    const order1 = {
        creator: addr1.address,
        settler: owner.address,
        orderType: 1,
        basePair: fusd.address,
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
        orderType: 1,
        basePair: fusd.address,
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
        orderType: 0,
        basePair: fusd.address,
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
        orderType: 0,
        basePair: fusd.address,
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
      orderType: 1,
      basePair: fusd.address,
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
      orderType: 0,
      basePair: fusd.address,
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
    await favax.transfer(signerContract.address, 10000);
    await fusd.transfer(signerContract.address, 10000);


    // signer contracts deposits 100 fake avax
    await signerContract.depositToSettler(settlerContract.address, favax.address, 1000);

    // addr1 deposits 1000 fake avax
    await favax.connect(addr1).approve(settlerContract.address, 1000);
    await settlerContract.connect(addr1).deposit(favax.address, 1000);

    // addr1 deposits 1 eth
    const depositAmount = ethers.utils.parseEther("1")
    await settlerContract.connect(addr1).deposit(ethers.constants.AddressZero, depositAmount,{value: depositAmount});

    // addr2 deposits 10000 fake usd
    await fusd.connect(addr2).approve(settlerContract.address, 10000);
    await settlerContract.connect(addr2).deposit(fusd.address, 10000);

    return { createOrder, signerContract, settler, settlerContract, favax, fusd, owner, addr1, addr2, fillOrderVRS };
  }

  describe("Util tokens deployment", function() {
    it("Should assign the total supplys of tokens to the owner", async function () {
      const { favax, fusd, owner } = await loadFixture(deployTokenFixture);
      const transferredBefore = 20000;

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
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, ethers.constants.AddressZero, 10, ethers.utils.parseEther("1"));
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, ethers.constants.AddressZero, fusd.address, ethers.utils.parseEther("1"), 10);

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order1, order2);

      expect(await settlerContract.balanceOf(addr2.address, ethers.constants.AddressZero)).to.equal(ethers.utils.parseEther("0.99"));
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(10);        
    });

    it("Should swap 100 fake avax to 1000 fake usd correctly from two orders", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await settlerContract.connect(owner).settle(order1, order2);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(99);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(990);        
    });

    it("Should partially settle an order to sell 200 fake avax to 2000 fake usd correctly against an order to buy 100 fake avax for 1000 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order1, order2);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to sell 200 fake avax to 2000 fake usd correctly against an order to buy 100 fake avax for 1200 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order1, order2);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to sell 100 fake avax to 1000 fake usd correctly against an order to buy 200 fake avax for 2000 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 200, 2000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order1, order2);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to sell 100 fake avax to 1000 fake usd correctly against an order to buy 200 fake avax for 2400 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 200, 2400)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order1, order2);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(10);        
    });


    it("Should partially settle an order to buy 200 fake avax to 2000 fake usd correctly against an order to sell 100 fake avax for 1000 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 200, 2000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to buy 200 fake avax to 2000 fake usd correctly against an order to sell 100 fake avax for 800 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 800, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 200, 2000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to buy 100 fake avax to 1000 fake usd correctly against an order to sell 200 fake avax for 1600 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1600, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to buy 100 fake avax to 1000 fake usd correctly against an order to sell 200 fake avax for 2000 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should sell 200 fake avax to 2000 fake usd correctly from two buy orders of 100 fake avax for 1000 fake usd orders", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      const order3 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)


      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order3, addr2)


      await settlerContract.connect(owner).settle(order1, order2);
      await settlerContract.connect(owner).settle(order1, order3);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(198);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1980);        
    });

    it("Should sell 200 fake avax to 2000 fake usd correctly from two buy orders of 100 fake avax for 1200 fake usd orders", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)
      const order3 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)


      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order3, addr2)


      await settlerContract.connect(owner).settle(order2, order1);
      await settlerContract.connect(owner).settle(order3, order1);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(198);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(2376);        
    });

    it("Should swap 100 fake avax to 1000 fake usd correctly from two orders, where one is signed by a smartcontract", async function () {
      const {signerContract, createOrder, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order2, addr2)
      await signerContract.signOrder(fusd.address, favax.address, owner.address);
      const contractSignedOrderRes = await signerContract.getOrder();
      
      const contractSignedOrder = {
        creator: contractSignedOrderRes.creator,
        settler: contractSignedOrderRes.settler,
        orderType: contractSignedOrderRes.orderType,
        basePair: contractSignedOrderRes.basePair,
        requestedToken: contractSignedOrderRes.requestedToken,
        releasedToken: contractSignedOrderRes.releasedToken,
        requestAmount: contractSignedOrderRes.requestAmount,
        releaseAmount: contractSignedOrderRes.releaseAmount,
        creationTime: contractSignedOrderRes.creationTime,
        expirationTime: contractSignedOrderRes.expirationTime,
        randNonce: contractSignedOrderRes.randNonce,
        v: contractSignedOrderRes.v,
        r: contractSignedOrderRes.r,
        s: contractSignedOrderRes.s
      }
      
      await settlerContract.connect(owner).settle(contractSignedOrder, order2);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(99);
      expect(await settlerContract.balanceOf(signerContract.address, fusd.address)).to.equal(990);        
    });

    it("Should swap 100 fake avax to 1000 fake usd correctly from two orders when there is positive price difference, taker is the buyer", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 800, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order1, order2);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);


      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(800-8);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 800);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(8);
    });

    it("Should swap 100 fake avax to 1000 fake usd correctly from two orders when there is positive price difference, taker is the seller", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 800, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1);

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(100-1);
      expect(await settlerContract.balanceOf(owner.address, favax.address)).to.equal(1);
      expect(await settlerContract.balanceOf(addr1.address, favax.address)).to.equal(1000 - 100);


      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await settlerContract.balanceOf(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await settlerContract.balanceOf(owner.address, fusd.address)).to.equal(10);
    });

    it("Should fail to settle a buy order of 10 fake avax for 20 fake usd agains a sell order of 9 fake avax for 21 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 21, 9)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 10, 20)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await expect(settlerContract.settle(order2,order1)).to.be.revertedWith("Maker price is worse than taker price");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);         
    });

    it("Should fail to settle a sell order of 10 fake avax for 20 fake usd agains a buy order of 11 fake avax for 17 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 20, 10)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 11, 17)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await expect(settlerContract.settle(order2,order1)).to.be.revertedWith("Maker price is worse than taker price");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);         
    });

    it("Should fail sell 200 fake avax to 2000 fake usd correctly from three buy orders of 100 fake avax for 1200 fake usd orders for the third try", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)
      const order3 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)
      const order4 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order3, addr2)
      await fillOrderVRS(order4, addr2)

      await settlerContract.connect(owner).settle(order2, order1);
      await settlerContract.connect(owner).settle(order3, order1);
      await expect(settlerContract.settle(order4,order1)).to.be.revertedWith("Order 2 was settled before");

      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(198);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(2376);        
    });

    it("Should fail to settle due to order 1 expiration", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      order1.expirationTime = Math.floor(new Date(Date.now() - (1000 * 60 * 60 * 24)).getTime() / 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await expect(settlerContract.settle(order1,order2)).to.be.revertedWith("Order 1 expired");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to order 2 expiration", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      order2.expirationTime = Math.floor(new Date(Date.now() - (1000 * 60 * 60 * 24)).getTime() / 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await expect(settlerContract.settle(order1,order2)).to.be.revertedWith("Order 2 expired");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to order 1 force cancellation", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await settlerContract.connect(addr1).forceCancelAll(Math.floor(Date.now()));

      await expect(settlerContract.settle(order1,order2)).to.be.revertedWith("Order1 creator called for a force cancel");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to order 2 force cancellation", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await settlerContract.connect(addr2).forceCancelAll(Math.floor(Date.now()));

      await expect(settlerContract.settle(order1,order2)).to.be.revertedWith("Order2 creator called for a force cancel");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);           
    });


    it("Should fail to settle due to order 1 already settled", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      const order4 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order4, addr2)

      await settlerContract.settle(order1, order2); 
      
      await expect(settlerContract.settle(order1, order4)).to.be.revertedWith("Order 1 was settled before");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(99);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(990);        
    });

    it("Should fail to settle due to order 2 already settled", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      const order3 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order3, addr1)

      await settlerContract.settle(order1, order2); 
      
      await expect(settlerContract.settle(order3, order2)).to.be.revertedWith("Order 2 was settled before");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(99);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(990);        
    });

    it("Should fail to settle due to Order 1 does not have enough asset to release", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 9999)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      
      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 1 does not have enough asset to release");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 2 does not have enough asset to release", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 10001)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      
      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 2 does not have enough asset to release");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);         
    });

    it("Should fail to settle due to Order 1 could not be verified", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      order1.v = 4;
      
      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 1 could not be verified");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 2 could not be verified", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      order2.v = 4;
      
      await expect(settlerContract.settle(order1, order2)).to.be.revertedWith("Order 2 could not be verified");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 1 could not be verified where order 1 is contract signed", async function () {
      const {createOrder, signerContract, addr2, fillOrderVRS, owner, settlerContract, favax, fusd } = await loadFixture(deployTokenFixture);

      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      await fillOrderVRS(order2, addr2)

      await signerContract.signOrder(fusd.address, favax.address, owner.address);
      const contractSignedOrderRes = await signerContract.getOrder();
      const contractSignedOrder = {
        creator: contractSignedOrderRes.creator,
        settler: contractSignedOrderRes.settler,
        orderType: contractSignedOrderRes.orderType,
        basePair: contractSignedOrderRes.basePair,
        requestedToken: contractSignedOrderRes.requestedToken,
        releasedToken: contractSignedOrderRes.releasedToken,
        requestAmount: contractSignedOrderRes.requestAmount,
        releaseAmount: contractSignedOrderRes.releaseAmount,
        creationTime: contractSignedOrderRes.creationTime,
        expirationTime: contractSignedOrderRes.expirationTime,
        randNonce: 1,
        v: contractSignedOrderRes.v,
        r: contractSignedOrderRes.r,
        s: contractSignedOrderRes.s
      }

      await expect(settlerContract.settle(contractSignedOrder, order2)).to.be.revertedWith("Order 1 could not be verified");
      expect(await settlerContract.balanceOf(addr2.address, favax.address)).to.equal(0);
      expect(await settlerContract.balanceOf(signerContract.address, fusd.address)).to.equal(0);        
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
