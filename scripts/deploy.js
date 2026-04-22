const hre = require("hardhat");

async function main() {
  const SekolahHybrid = await hre.ethers.getContractFactory("SekolahHybrid");
  const contract = await SekolahHybrid.deploy();
  await contract.deployed();
  console.log(`✅ Kontrak di-deploy ke: ${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});