const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const name = 'Non Fungible Token';
const symbol = 'NFT';
const tokenId = 1n;
const otherTokenId = 2n;
const unknownTokenId = 3n;

async function fixture() {
  const [owner] = await ethers.getSigners();
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  let another = wallets[0];
  let approved = wallets[1];
  const token = await ethers.deployContract('$ERC721Burnable', [name, symbol]);
  return { owner, approved, another, token };
}

describe('ERC721Burnable', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  describe('like a burnable ERC721', function () {
    beforeEach(async function () {
      await this.token.$_mint(this.owner, tokenId);
      await this.token.$_mint(this.owner, otherTokenId);
    });

    describe('burn', function () {
      describe('when successful', function () {
        it('emits a burn event, burns the given token ID and adjusts the balance of the owner', async function () {
          const balanceBefore = await this.token.balanceOf(this.owner);

          await expect(this.token.connect(this.owner).burn(tokenId))
            .to.emit(this.token, 'Transfer')
            .withArgs(this.owner, ethers.ZeroAddress, tokenId);

          await expect(this.token.ownerOf(tokenId))
            .to.be.revertedWithCustomError(this.token, 'ERC721NonexistentToken')
            .withArgs(tokenId);

          expect(await this.token.balanceOf(this.owner)).to.equal(balanceBefore - 1n);
        });
      });

      describe('when there is a previous approval burned', function () {
        beforeEach(async function () {
          await this.token.connect(this.owner).approve(this.approved, tokenId);
          await this.token.connect(this.owner).burn(tokenId);
        });

        describe('getApproved', function () {
          it('reverts', async function () {
            await expect(this.token.getApproved(tokenId))
              .to.be.revertedWithCustomError(this.token, 'ERC721NonexistentToken')
              .withArgs(tokenId);
          });
        });
      });

      describe('when there is no previous approval burned', function () {
        it('reverts', async function () {
          await expect(this.token.connect(this.another).burn(tokenId))
            .to.be.revertedWithCustomError(this.token, 'ERC721InsufficientApproval')
            .withArgs(this.another, tokenId);
        });
      });

      describe('when the given token ID was not tracked by this contract', function () {
        it('reverts', async function () {
          await expect(this.token.connect(this.owner).burn(unknownTokenId))
            .to.be.revertedWithCustomError(this.token, 'ERC721NonexistentToken')
            .withArgs(unknownTokenId);
        });
      });
    });
  });
});
