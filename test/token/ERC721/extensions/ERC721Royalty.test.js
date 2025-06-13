const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { shouldBehaveLikeERC2981 } = require('../../common/ERC2981.behavior');

const name = 'Non Fungible Token';
const symbol = 'NFT';

const tokenId1 = 1n;
const tokenId2 = 2n;
const royalty = 200n;
const salePrice = 1000n;

async function fixture() {
  const [recipient] = await ethers.getSigners();

  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  const [account1, account2] = wallets;
  const token = await ethers.deployContract('$ERC721Royalty', [name, symbol]);
  await token.$_mint(account1, tokenId1);
  await token.$_mint(account1, tokenId2);

  return { account1, account2, recipient, token };
}

describe('ERC721Royalty', function () {
  beforeEach(async function () {
    Object.assign(
      this,
      await fixture(),
      { tokenId1, tokenId2, royalty, salePrice }, // set for behavior tests
    );
  });

  describe('token specific functions', function () {
    beforeEach(async function () {
      await this.token.$_setTokenRoyalty(tokenId1, this.recipient, royalty);
    });

    it('royalty information are kept during burn and re-mint', async function () {
      await this.token.$_burn(tokenId1);

      expect(await this.token.royaltyInfo(tokenId1, salePrice)).to.deep.equal([
        this.recipient.address,
        (salePrice * royalty) / 10000n,
      ]);

      await this.token.$_mint(this.account2, tokenId1);

      expect(await this.token.royaltyInfo(tokenId1, salePrice)).to.deep.equal([
        this.recipient.address,
        (salePrice * royalty) / 10000n,
      ]);
    });
  });

  shouldBehaveLikeERC2981();
});
