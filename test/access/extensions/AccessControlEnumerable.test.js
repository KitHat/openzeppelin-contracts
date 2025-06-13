const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const {
  DEFAULT_ADMIN_ROLE,
  shouldBehaveLikeAccessControl,
  shouldBehaveLikeAccessControlEnumerable,
} = require('../AccessControl.behavior');

async function fixture() {
  const [defaultAdmin, ...accounts] = await ethers.getSigners();
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  accounts[0] = wallets[0];
  accounts[1] = wallets[1];
  accounts[2] = wallets[2];
  accounts[3] = wallets[2];
  const mock = await ethers.deployContract('$AccessControlEnumerable');
  await mock.$_grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
  return { mock, defaultAdmin, accounts };
}

describe('AccessControlEnumerable', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  shouldBehaveLikeAccessControl();
  shouldBehaveLikeAccessControlEnumerable();
});
