const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { sleep } = require('../token/ERC20/ERC20.behavior');

async function fixture() {
  const [owner] = await ethers.getSigners(); let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  accountA = wallets[0];
  accountB = wallets[1];
  const ownable2Step = await ethers.deployContract('$Ownable2Step', [owner]);
  return {
    ownable2Step,
    owner,
    accountA,
    accountB,
  };
}

describe('Ownable2Step', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  describe('transfer ownership', function () {
    it('starting a transfer does not change owner', async function () {
      await expect(this.ownable2Step.connect(this.owner).transferOwnership(this.accountA))
        .to.emit(this.ownable2Step, 'OwnershipTransferStarted')
        .withArgs(this.owner, this.accountA);

      expect(await this.ownable2Step.owner()).to.equal(this.owner);
      expect(await this.ownable2Step.pendingOwner()).to.equal(this.accountA);
    });

    it('changes owner after transfer', async function () {
      await this.ownable2Step.connect(this.owner).transferOwnership(this.accountA);
      await sleep(3000);
      let tx = await this.ownable2Step.connect(this.accountA).acceptOwnership();
      await sleep(3000);

      expect(tx)
        .to.emit(this.ownable2Step, 'OwnershipTransferred')
        .withArgs(this.owner, this.accountA);

      expect(await this.ownable2Step.owner()).to.equal(this.accountA);
      expect(await this.ownable2Step.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it('guards transfer against invalid user', async function () {
      await this.ownable2Step.connect(this.owner).transferOwnership(this.accountA);

      await expect(this.ownable2Step.connect(this.accountB).acceptOwnership())
        .to.be.revertedWithCustomError(this.ownable2Step, 'OwnableUnauthorizedAccount')
        .withArgs(this.accountB);
    });
  });

  describe('renouncing ownership', function () {
    it('changes owner after renouncing ownership', async function () {
      await expect(this.ownable2Step.connect(this.owner).renounceOwnership())
        .to.emit(this.ownable2Step, 'OwnershipTransferred')
        .withArgs(this.owner, ethers.ZeroAddress);

      // If renounceOwnership is removed from parent an alternative is needed ...
      // without it is difficult to cleanly renounce with the two step process
      // see: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/3620#discussion_r957930388
      expect(await this.ownable2Step.owner()).to.equal(ethers.ZeroAddress);
    });

    it('pending owner resets after renouncing ownership', async function () {
      await this.ownable2Step.connect(this.owner).transferOwnership(this.accountA);
      expect(await this.ownable2Step.pendingOwner()).to.equal(this.accountA);

      await this.ownable2Step.connect(this.owner).renounceOwnership();
      expect(await this.ownable2Step.pendingOwner()).to.equal(ethers.ZeroAddress);

      await expect(this.ownable2Step.connect(this.accountA).acceptOwnership())
        .to.be.revertedWithCustomError(this.ownable2Step, 'OwnableUnauthorizedAccount')
        .withArgs(this.accountA);
    });

    it('allows to recover access using the internal _transferOwnership', async function () {
      await this.ownable2Step.connect(this.owner).renounceOwnership();

      await expect(this.ownable2Step.$_transferOwnership(this.accountA))
        .to.emit(this.ownable2Step, 'OwnershipTransferred')
        .withArgs(ethers.ZeroAddress, this.accountA);

      expect(await this.ownable2Step.owner()).to.equal(this.accountA);
    });

    it('allows the owner to cancel an initiated ownership transfer by setting newOwner to zero address', async function () {
      // initiate ownership transfer to accountA
      await this.ownable2Step.connect(this.owner).transferOwnership(this.accountA);
      expect(await this.ownable2Step.pendingOwner()).to.equal(this.accountA);

      // cancel the ownership transfer by setting newOwner to zero address
      await expect(this.ownable2Step.connect(this.owner).transferOwnership(ethers.ZeroAddress))
        .to.emit(this.ownable2Step, 'OwnershipTransferStarted')
        .withArgs(this.owner, ethers.ZeroAddress);
      expect(await this.ownable2Step.pendingOwner()).to.equal(ethers.ZeroAddress);

      // verify that accountA cannot accept ownership anymore
      await expect(this.ownable2Step.connect(this.accountA).acceptOwnership())
        .to.be.revertedWithCustomError(this.ownable2Step, 'OwnableUnauthorizedAccount')
        .withArgs(this.accountA);
    });
  });
});
