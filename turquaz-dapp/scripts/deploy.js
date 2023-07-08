const hre = require("hardhat");

async function main() {
    const FakeAvax = await ethers.getContractFactory("Token");
    const favax = await FakeAvax.deploy("fake avax", "favax", 1000000);
    await favax.deployed();

    console.log("Fake avax deployed to: ", favax.address)

    const FakeUSD = await ethers.getContractFactory("Token");
    const fusd = await FakeUSD.deploy("fake usd", "fusd", 100000000);
    await fusd.deployed();

    console.log("Fake usd deployed to: ", fusd.address)


    const settler = await ethers.getContractFactory("Settler");
    const settlerContract = await settler.deploy();
    await settlerContract.deployed();

    console.log("Settler deployed to: ", settlerContract.address)


    const Signer = await ethers.getContractFactory("SignerContract");
    const signerContract = await Signer.deploy(settlerContract.address);
    await signerContract.deployed();

    console.log("Signer contract deployed to: ", signerContract.address)

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});