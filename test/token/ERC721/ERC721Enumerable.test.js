const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const {
  shouldBehaveLikeERC721,
  shouldBehaveLikeERC721Metadata,
  shouldBehaveLikeERC721Enumerable,
} = require('./ERC721.behavior');

const name = 'Non Fungible Token';
const symbol = 'NFT';

async function fixture() {
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  let accounts = await ethers.getSigners();
  accounts[2] = wallets[0];
  accounts[3] = wallets[1];
  accounts[4] = wallets[2];
  return {
    accounts,
    token: await ethers.deployContract('$ERC721Enumerable', [name, symbol]),
  };
}

describe('ERC721', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  shouldBehaveLikeERC721();
  shouldBehaveLikeERC721Metadata(name, symbol);
  shouldBehaveLikeERC721Enumerable();
});
