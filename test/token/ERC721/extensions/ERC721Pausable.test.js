const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const name = 'Non Fungible Token';
const symbol = 'NFT';
const tokenId = 1n;
const otherTokenId = 2n;
const data = ethers.Typed.bytes('0x42');

async function fixture() {
  const [owner] = await ethers.getSigners();
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  let receiver = wallets[0];
  let operator = wallets[1];
  const token = await ethers.deployContract('$ERC721Pausable', [name, symbol]);
  return { owner, receiver, operator, token };
}

describe('ERC721Pausable', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  describe('when token is paused', function () {
    beforeEach(async function () {
      await this.token.$_mint(this.owner, tokenId);
      await this.token.$_pause();
    });

    it('reverts when trying to transferFrom', async function () {
      await expect(
        this.token.connect(this.owner).transferFrom(this.owner, this.receiver, tokenId),
      ).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    it('reverts when trying to safeTransferFrom', async function () {
      await expect(
        this.token.connect(this.owner).safeTransferFrom(this.owner, this.receiver, tokenId),
      ).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    it('reverts when trying to safeTransferFrom with data', async function () {
      await expect(
        this.token.connect(this.owner).safeTransferFrom(this.owner, this.receiver, tokenId, data),
      ).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    it('reverts when trying to mint', async function () {
      await expect(this.token.$_mint(this.receiver, otherTokenId)).to.be.revertedWithCustomError(
        this.token,
        'EnforcedPause',
      );
    });

    it('reverts when trying to burn', async function () {
      await expect(this.token.$_burn(tokenId)).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    describe('getApproved', function () {
      it('returns approved address', async function () {
        expect(await this.token.getApproved(tokenId)).to.equal(ethers.ZeroAddress);
      });
    });

    describe('balanceOf', function () {
      it('returns the amount of tokens owned by the given address', async function () {
        expect(await this.token.balanceOf(this.owner)).to.equal(1n);
      });
    });

    describe('ownerOf', function () {
      it('returns the amount of tokens owned by the given address', async function () {
        expect(await this.token.ownerOf(tokenId)).to.equal(this.owner);
      });
    });

    describe('isApprovedForAll', function () {
      it('returns the approval of the operator', async function () {
        expect(await this.token.isApprovedForAll(this.owner, this.operator)).to.be.false;
      });
    });
  });
});
