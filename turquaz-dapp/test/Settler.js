
const { expect } = require("chai");

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");


describe("Settler contract", function () {

  async function deployTokenFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const FakeAvax = await ethers.getContractFactory("Token");
    const favax = await FakeAvax.deploy("fake avax", "favax", ethers.utils.parseEther("1000000"));
    await favax.deployed();

    const FakeUSD = await ethers.getContractFactory("Token");
    const fusd = await FakeUSD.deploy("fake usd", "fusd", ethers.utils.parseEther("1000000"));
    await fusd.deployed();

    const settler = await ethers.getContractFactory("Settler");
    const settlerContract = await settler.deploy();
    await settlerContract.deployed();

    const Signer = await ethers.getContractFactory("SignerContract");
    const signerContract = await Signer.deploy(settlerContract.address);
    await signerContract.deployed();

    async function balanceOfWrapper(walletaddress, tokenaddress) {
      const res = await settlerContract.balanceOf(walletaddress, tokenaddress)
      return res / Math.pow(10, 18)
    }    

    const createOrder = (creator, settler, orderType, basePair, requestedToken, releasedToken, requestAmount, releaseAmount) => {
      const date = new Date(Date.now() + (1000 * 60 * 60 * 24))
      const amount = orderType == 1 ? releaseAmount : requestAmount
      const price = orderType == 1 ? requestAmount / releaseAmount : releaseAmount / requestAmount
      const tradedPair = orderType == 1 ? releasedToken : requestedToken

      let order =  {
        creator: creator,
        settler: settler,
        orderType: orderType,
        basePair: fusd.address,
        tradedPair: tradedPair,
        minSettleAmount: 1,
        amount: ethers.utils.parseEther(amount.toString()),
        price: price * Math.pow(10, 8),
        creationTime: Date.now(),
        expirationTime: Math.floor(date.getTime() / 1000),
        randNonce: Math.floor(Math.random() * 100000),
      }
      return order
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
          { name: "tradedPair", type: "address"},
          { name: "minSettleAmount", type: "uint256"},
          { name: "amount", type: "uint256"},
          { name: "price", type: "uint256"},
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

    // Fill addresses from owner
    await favax.transfer(addr1.address, ethers.utils.parseEther("10000"));
    await fusd.transfer(addr2.address, ethers.utils.parseEther("10000"));
    await favax.transfer(signerContract.address, ethers.utils.parseEther("10000"));
    await fusd.transfer(signerContract.address, ethers.utils.parseEther("10000"));


    // signer contracts deposits 100 fake avax
    await signerContract.depositToSettler(settlerContract.address, favax.address, ethers.utils.parseEther("1000"));

    // addr1 deposits 1000 fake avax
    await favax.connect(addr1).approve(settlerContract.address, ethers.utils.parseEther("1000"));
    await settlerContract.connect(addr1).deposit(favax.address, ethers.utils.parseEther("1000"));

    // addr1 deposits 1 eth
    const depositAmount = ethers.utils.parseEther("1")
    await settlerContract.connect(addr1).deposit(ethers.constants.AddressZero, depositAmount,{value: depositAmount});

    // addr2 deposits 10000 fake usd
    await fusd.connect(addr2).approve(settlerContract.address, ethers.utils.parseEther("10000"));
    await settlerContract.connect(addr2).deposit(fusd.address, ethers.utils.parseEther("10000"));

    return { balanceOfWrapper, createOrder, signerContract, settler, settlerContract, favax, fusd, owner, addr1, addr2, fillOrderVRS };
  }

  describe("Util tokens deployment", function() {
    it("Should assign the total supplys of tokens to the owner", async function () {
      const { favax, fusd, owner , balanceOfWrapper} = await loadFixture(deployTokenFixture);
      const transferredBefore = ethers.utils.parseEther("20000");

      const favaxOwnerBalance = await favax.balanceOf(owner.address);
      expect(await favax.totalSupply()).to.equal(favaxOwnerBalance.add(transferredBefore));

      const fusdOwnerBalance = await fusd.balanceOf(owner.address)
      expect(await fusd.totalSupply()).to.equal(fusdOwnerBalance.add(transferredBefore));

    });
  });

  describe("Deposits and Withdrawls", function () {

    it("Should deposit and withdraw 1 ethereum correctly from a depositer", async function () {
        const { owner, settlerContract , balanceOfWrapper} = await loadFixture(deployTokenFixture);
        const depositAmount = ethers.utils.parseEther("1")
        await settlerContract.deposit(ethers.constants.AddressZero, depositAmount,{ value: depositAmount});
        expect(await balanceOfWrapper(owner.address, ethers.constants.AddressZero)).to.equal(1);
        await settlerContract.withdraw(ethers.constants.AddressZero, depositAmount);
        expect(await balanceOfWrapper(owner.address, ethers.constants.AddressZero)).to.equal(0);
    });

    it("Should deposit and withdraw 1 fake avax(erc20) correctly from a depositer", async function () {
      const { favax, owner, settlerContract , balanceOfWrapper} = await loadFixture(deployTokenFixture);
      await favax.approve(settlerContract.address, ethers.utils.parseEther("1"));
      await settlerContract.deposit(favax.address, ethers.utils.parseEther("1"));
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      await settlerContract.withdraw(favax.address, ethers.utils.parseEther("1"));
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(0);
    });

    it("Should deposit and withdraw 1 fake usd(erc20) correctly from a depositer", async function () {
      const { fusd, owner, settlerContract , balanceOfWrapper} = await loadFixture(deployTokenFixture);
      await fusd.approve(settlerContract.address, ethers.utils.parseEther("1"));
      await settlerContract.deposit(fusd.address, ethers.utils.parseEther("1"));
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(1);
      await settlerContract.withdraw(fusd.address, ethers.utils.parseEther("1"));
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(0);
    });
  });

  describe("Settle exchange of two orders", function () {

    it("Should swap 1 eth to 10 fake usd correctly from two orders", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, ethers.constants.AddressZero, 10, 1);
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, ethers.constants.AddressZero, fusd.address, 1, 10);

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, false);

      expect(await balanceOfWrapper(addr2.address, ethers.constants.AddressZero)).to.equal(0.99);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(9.9);        
    });

    it("Should swap 100 fake avax to 10 fake usd correctly from two orders", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 10, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 10)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await settlerContract.connect(owner).settle(order2, order1, false);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(99);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(9.9);        
    });

    it("Should partially settle an order to sell 200 fake avax to 2000 fake usd correctly against an order to buy 100 fake avax for 1000 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, false);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to sell 200 fake avax to 2000 fake usd correctly against an order to buy 100 fake avax for 1200 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, false);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to sell 100 fake avax to 1000 fake usd correctly against an order to buy 200 fake avax for 2000 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 200, 2000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, false);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to sell 100 fake avax to 1000 fake usd correctly against an order to buy 200 fake avax for 2400 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 200, 2400)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, false);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(10);        
    });


    it("Should partially settle an order to buy 200 fake avax to 2000 fake usd correctly against an order to sell 100 fake avax for 1000 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 200, 2000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, true);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to buy 200 fake avax to 2000 fake usd correctly against an order to sell 100 fake avax for 800 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 800, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 200, 2000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, true);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to buy 100 fake avax to 1000 fake usd correctly against an order to sell 200 fake avax for 1600 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1600, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, true);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should partially settle an order to buy 100 fake avax to 1000 fake usd correctly against an order to sell 200 fake avax for 2000 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, true);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);

      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(10);        
    });

    it("Should sell 200 fake avax to 2000 fake usd correctly from two buy orders of 100 fake avax for 1000 fake usd orders", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      const order3 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)


      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order3, addr2)


      await settlerContract.connect(owner).settle(order2, order1, false);
      await settlerContract.connect(owner).settle(order3, order1, false);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(198);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1980);        
    });

    it("Should sell 200 fake avax to 2000 fake usd correctly from two buy orders of 100 fake avax for 1200 fake usd orders", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)
      const order3 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)


      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order3, addr2)


      await settlerContract.connect(owner).settle(order2, order1, true);
      await settlerContract.connect(owner).settle(order3, order1, true);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(198);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(2376);        
    });

    it("Should swap 100 fake avax to 1000 fake usd correctly from two orders, where one is signed by a smartcontract", async function () {
      const {signerContract, createOrder, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order2, addr2)
      await signerContract.signOrder(fusd.address, favax.address, owner.address);
      const contractSignedOrderRes = await signerContract.getOrder();
      
      const contractSignedOrder = {
        creator: contractSignedOrderRes.creator,
        settler: contractSignedOrderRes.settler,
        orderType: contractSignedOrderRes.orderType,
        basePair: contractSignedOrderRes.basePair,
        tradedPair: contractSignedOrderRes.tradedPair,
        minSettleAmount: contractSignedOrderRes.minSettleAmount,
        amount: contractSignedOrderRes.amount,
        price: contractSignedOrderRes.price,
        creationTime: contractSignedOrderRes.creationTime,
        expirationTime: contractSignedOrderRes.expirationTime,
        randNonce: contractSignedOrderRes.randNonce,
        v: contractSignedOrderRes.v,
        r: contractSignedOrderRes.r,
        s: contractSignedOrderRes.s
      }
      
      await settlerContract.connect(owner).settle(order2, contractSignedOrder, false);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(99);
      expect(await balanceOfWrapper(signerContract.address, fusd.address)).to.equal(990);        
    });

    it("Should swap 100 fake avax to 1000 fake usd correctly from two orders when there is positive price difference, taker is the buyer", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 800, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, false);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);


      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(800-8);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 800);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(8);
    });

    it("Should swap 100 fake avax to 1000 fake usd correctly from two orders when there is positive price difference, taker is the seller", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 800, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
    
      await settlerContract.connect(owner).settle(order2, order1, true);

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(100-1);
      expect(await balanceOfWrapper(owner.address, favax.address)).to.equal(1);
      expect(await balanceOfWrapper(addr1.address, favax.address)).to.equal(1000 - 100);


      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(1000-10);
      expect(await balanceOfWrapper(addr2.address, fusd.address)).to.equal(10000 - 1000);
      expect(await balanceOfWrapper(owner.address, fusd.address)).to.equal(10);
    });

    it("Should fail to settle a buy order of 10 fake avax for 20 fake usd against a sell order of 9 fake avax for 27 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 27, 9)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 10, 20)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await expect(settlerContract.settle(order2,order1, true)).to.be.revertedWith("Buy price is less than sell price");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);         
    });

    it("Should fail to settle a sell order of 10 fake avax for 20 fake usd against a buy order of 11 fake avax for 11 fake usd", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 20, 10)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 11, 11)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await expect(settlerContract.settle(order2,order1, true)).to.be.revertedWith("Buy price is less than sell price");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);         
    });

    it("Should fail sell 200 fake avax to 2000 fake usd correctly from three buy orders of 100 fake avax for 1200 fake usd orders for the third try", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 2000, 200)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)
      const order3 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)
      const order4 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1200)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order3, addr2)
      await fillOrderVRS(order4, addr2)

      await settlerContract.connect(owner).settle(order2, order1, true);
      await settlerContract.connect(owner).settle(order3, order1, true);
      await expect(settlerContract.settle(order4,order1, true)).to.be.revertedWith("Sell order is filled");

      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(198);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(2376);        
    });

    it("Should fail to settle due to order 1 expiration", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      order1.expirationTime = Math.floor(new Date(Date.now() - (1000 * 60 * 60 * 24)).getTime() / 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      

      await expect(settlerContract.settle(order2,order1, false)).to.be.revertedWith("Sell order expired");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to order 2 expiration", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      order2.expirationTime = Math.floor(new Date(Date.now() - (1000 * 60 * 60 * 24)).getTime() / 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await expect(settlerContract.settle(order2,order1, false)).to.be.revertedWith("Buy order expired");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to order 1 force cancellation", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await settlerContract.connect(addr1).forceCancelAll(Math.floor(Date.now()));

      await expect(settlerContract.settle(order2,order1, false)).to.be.revertedWith("Seller called for a force cancel");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to order 2 force cancellation", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      await settlerContract.connect(addr2).forceCancelAll(Math.floor(Date.now()));

      await expect(settlerContract.settle(order2,order1, false)).to.be.revertedWith("Buyer called for a force cancel");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);           
    });


    it("Should fail to settle due to order 1 already settled", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      const order4 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order4, addr2)

      await settlerContract.settle(order2, order1, false); 
      
      await expect(settlerContract.settle(order4, order1, false)).to.be.revertedWith("Sell order is filled");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(99);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(990);        
    });

    it("Should fail to settle due to order 2 already settled", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      const order3 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      
      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      await fillOrderVRS(order3, addr1)

      await settlerContract.settle(order2, order1, false); 
      
      await expect(settlerContract.settle(order2, order3, false)).to.be.revertedWith("Buy order is filled");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(99);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(990);        
    });

    it("Should fail to settle due to Order 1 does not have enough asset to release", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1001, 1001)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 1001, 1001)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      
      await expect(settlerContract.settle(order2, order1, false)).to.be.revertedWith("Seller does not have enough assets to sell");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 2 does not have enough asset to release", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 10001, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 10001)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)
      
      await expect(settlerContract.settle(order2, order1, true)).to.be.revertedWith("Buyer does not have enough assets to buy");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);         
    });

    it("Should fail to settle due to Order 1 could not be verified", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      order1.v = 4;
      
      await expect(settlerContract.settle(order2, order1, false)).to.be.revertedWith("Sell order could not be verified");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 2 could not be verified", async function () {
      const {createOrder, addr1, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order1 = createOrder(addr1.address, owner.address, 1, fusd.address, fusd.address, favax.address, 1000, 100)
      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)

      await fillOrderVRS(order1, addr1)
      await fillOrderVRS(order2, addr2)

      order2.v = 4;
      
      await expect(settlerContract.settle(order2, order1, false)).to.be.revertedWith("Buy order could not be verified");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(addr1.address, fusd.address)).to.equal(0);        
    });

    it("Should fail to settle due to Order 1 could not be verified where order 1 is contract signed", async function () {
      const {createOrder, signerContract, addr2, fillOrderVRS, owner, settlerContract, favax, fusd , balanceOfWrapper} = await loadFixture(deployTokenFixture);

      const order2 = createOrder(addr2.address, owner.address, 0, fusd.address, favax.address, fusd.address, 100, 1000)
      await fillOrderVRS(order2, addr2)

      await signerContract.signOrder(fusd.address, favax.address, owner.address);
      const contractSignedOrderRes = await signerContract.getOrder();
      const contractSignedOrder = {
        creator: contractSignedOrderRes.creator,
        settler: contractSignedOrderRes.settler,
        orderType: contractSignedOrderRes.orderType,
        basePair: contractSignedOrderRes.basePair,
        tradedPair: contractSignedOrderRes.tradedPair,
        minSettleAmount: contractSignedOrderRes.minSettleAmount,
        amount: contractSignedOrderRes.amount,
        price: contractSignedOrderRes.price,
        creationTime: contractSignedOrderRes.creationTime,
        expirationTime: contractSignedOrderRes.expirationTime,
        randNonce: 1,
        v: contractSignedOrderRes.v,
        r: contractSignedOrderRes.r,
        s: contractSignedOrderRes.s
      }

      await expect(settlerContract.settle(order2, contractSignedOrder, false)).to.be.revertedWith("Sell order could not be verified");
      expect(await balanceOfWrapper(addr2.address, favax.address)).to.equal(0);
      expect(await balanceOfWrapper(signerContract.address, fusd.address)).to.equal(0);        
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
