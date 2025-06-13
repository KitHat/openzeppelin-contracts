const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

async function fixture() {
  const [holder] = await ethers.getSigners();
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  const [operator, receiver, other] = wallets;
  const token = await ethers.deployContract('$ERC1155Pausable', ['https://token-cdn-domain/{id}.json']);
  return { token, holder, operator, receiver, other };
}

describe('ERC1155Pausable', function () {
  const firstTokenId = 37n;
  const firstTokenValue = 42n;
  const secondTokenId = 19842n;
  const secondTokenValue = 23n;

  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  describe('when token is paused', function () {
    beforeEach(async function () {
      await this.token.connect(this.holder).setApprovalForAll(this.operator, true);
      await this.token.$_mint(this.holder, firstTokenId, firstTokenValue, '0x');
      await this.token.$_pause();
    });

    it('reverts when trying to safeTransferFrom from holder', async function () {
      await expect(
        this.token
          .connect(this.holder)
          .safeTransferFrom(this.holder, this.receiver, firstTokenId, firstTokenValue, '0x'),
      ).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    it('reverts when trying to safeTransferFrom from operator', async function () {
      await expect(
        this.token
          .connect(this.operator)
          .safeTransferFrom(this.holder, this.receiver, firstTokenId, firstTokenValue, '0x'),
      ).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    it('reverts when trying to safeBatchTransferFrom from holder', async function () {
      await expect(
        this.token
          .connect(this.holder)
          .safeBatchTransferFrom(this.holder, this.receiver, [firstTokenId], [firstTokenValue], '0x'),
      ).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    it('reverts when trying to safeBatchTransferFrom from operator', async function () {
      await expect(
        this.token
          .connect(this.operator)
          .safeBatchTransferFrom(this.holder, this.receiver, [firstTokenId], [firstTokenValue], '0x'),
      ).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    it('reverts when trying to mint', async function () {
      await expect(this.token.$_mint(this.holder, secondTokenId, secondTokenValue, '0x')).to.be.revertedWithCustomError(
        this.token,
        'EnforcedPause',
      );
    });

    it('reverts when trying to mintBatch', async function () {
      await expect(
        this.token.$_mintBatch(this.holder, [secondTokenId], [secondTokenValue], '0x'),
      ).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    it('reverts when trying to burn', async function () {
      await expect(this.token.$_burn(this.holder, firstTokenId, firstTokenValue)).to.be.revertedWithCustomError(
        this.token,
        'EnforcedPause',
      );
    });

    it('reverts when trying to burnBatch', async function () {
      await expect(
        this.token.$_burnBatch(this.holder, [firstTokenId], [firstTokenValue]),
      ).to.be.revertedWithCustomError(this.token, 'EnforcedPause');
    });

    describe('setApprovalForAll', function () {
      it('approves an operator', async function () {
        await this.token.connect(this.holder).setApprovalForAll(this.other, true);
        expect(await this.token.isApprovedForAll(this.holder, this.other)).to.be.true;
      });
    });

    describe('balanceOf', function () {
      it('returns the token value owned by the given address', async function () {
        expect(await this.token.balanceOf(this.holder, firstTokenId)).to.equal(firstTokenValue);
      });
    });

    describe('isApprovedForAll', function () {
      it('returns the approval of the operator', async function () {
        expect(await this.token.isApprovedForAll(this.holder, this.operator)).to.be.true;
      });
    });
  });
});
