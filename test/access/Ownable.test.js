const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

async function fixture() {
  const [owner] = await ethers.getSigners();
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  const other = wallets[0];
  const ownable = await ethers.deployContract('$Ownable', [owner]);
  return { owner, other, ownable };
}

describe('Ownable', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  it('emits ownership transfer events during construction', async function () {
    await expect(this.ownable.deploymentTransaction())
      .to.emit(this.ownable, 'OwnershipTransferred')
      .withArgs(ethers.ZeroAddress, this.owner);
  });

  it('rejects zero address for initialOwner', async function () {
    await expect(ethers.deployContract('$Ownable', [ethers.ZeroAddress]))
      .to.be.revertedWithCustomError({ interface: this.ownable.interface }, 'OwnableInvalidOwner')
      .withArgs(ethers.ZeroAddress);
  });

  it('has an owner', async function () {
    expect(await this.ownable.owner()).to.equal(this.owner);
  });

  describe('transfer ownership', function () {
    it('changes owner after transfer', async function () {
      await expect(this.ownable.connect(this.owner).transferOwnership(this.other))
        .to.emit(this.ownable, 'OwnershipTransferred')
        .withArgs(this.owner, this.other);

      expect(await this.ownable.owner()).to.equal(this.other);
    });

    it('prevents non-owners from transferring', async function () {
      await expect(this.ownable.connect(this.other).transferOwnership(this.other))
        .to.be.revertedWithCustomError(this.ownable, 'OwnableUnauthorizedAccount')
        .withArgs(this.other);
    });

    it('guards ownership against stuck state', async function () {
      await expect(this.ownable.connect(this.owner).transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(this.ownable, 'OwnableInvalidOwner')
        .withArgs(ethers.ZeroAddress);
    });
  });

  describe('renounce ownership', function () {
    it('loses ownership after renouncement', async function () {
      await expect(this.ownable.connect(this.owner).renounceOwnership())
        .to.emit(this.ownable, 'OwnershipTransferred')
        .withArgs(this.owner, ethers.ZeroAddress);

      expect(await this.ownable.owner()).to.equal(ethers.ZeroAddress);
    });

    it('prevents non-owners from renouncement', async function () {
      await expect(this.ownable.connect(this.other).renounceOwnership())
        .to.be.revertedWithCustomError(this.ownable, 'OwnableUnauthorizedAccount')
        .withArgs(this.other);
    });

    it('allows to recover access using the internal _transferOwnership', async function () {
      await this.ownable.connect(this.owner).renounceOwnership();

      await expect(this.ownable.$_transferOwnership(this.other))
        .to.emit(this.ownable, 'OwnershipTransferred')
        .withArgs(ethers.ZeroAddress, this.other);

      expect(await this.ownable.owner()).to.equal(this.other);
    });
  });
});
