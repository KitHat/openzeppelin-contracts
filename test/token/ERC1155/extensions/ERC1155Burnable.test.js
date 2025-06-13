const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { sleep } = require('../../ERC20/ERC20.behavior');

const ids = [42n, 1137n];
const values = [3000n, 9902n];

async function fixture() {
  const [holder] = await ethers.getSigners();
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  const [operator, other] = wallets;
  const token = await ethers.deployContract('$ERC1155Burnable', ['https://token-cdn-domain/{id}.json']);
  await token.$_mint(holder, ids[0], values[0], '0x');
  await token.$_mint(holder, ids[1], values[1], '0x');

  return { token, holder, operator, other };
}

describe('ERC1155Burnable', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  describe('burn', function () {
    it('holder can burn their tokens', async function () {
      await this.token.connect(this.holder).burn(this.holder, ids[0], values[0] - 1n);

      expect(await this.token.balanceOf(this.holder, ids[0])).to.equal(1n);
    });

    it("approved operators can burn the holder's tokens", async function () {
      await this.token.connect(this.holder).setApprovalForAll(this.operator, true);
      await sleep(3000);
      await this.token.connect(this.operator).burn(this.holder, ids[0], values[0] - 1n);
      await sleep(3000);

      expect(await this.token.balanceOf(this.holder, ids[0])).to.equal(1n);
    });

    it("unapproved accounts cannot burn the holder's tokens", async function () {
      await expect(this.token.connect(this.other).burn(this.holder, ids[0], values[0] - 1n))
        .to.be.revertedWithCustomError(this.token, 'ERC1155MissingApprovalForAll')
        .withArgs(this.other, this.holder);
    });
  });

  describe('burnBatch', function () {
    it('holder can burn their tokens', async function () {
      await this.token.connect(this.holder).burnBatch(this.holder, ids, [values[0] - 1n, values[1] - 2n]);
      await sleep(3000);

      expect(await this.token.balanceOf(this.holder, ids[0])).to.equal(1n);
      expect(await this.token.balanceOf(this.holder, ids[1])).to.equal(2n);
    });

    it("approved operators can burn the holder's tokens", async function () {
      await this.token.connect(this.holder).setApprovalForAll(this.operator, true);
      await sleep(3000);
      await this.token.connect(this.operator).burnBatch(this.holder, ids, [values[0] - 1n, values[1] - 2n]);
      await sleep(3000);

      expect(await this.token.balanceOf(this.holder, ids[0])).to.equal(1n);
      expect(await this.token.balanceOf(this.holder, ids[1])).to.equal(2n);
    });

    it("unapproved accounts cannot burn the holder's tokens", async function () {
      await expect(this.token.connect(this.other).burnBatch(this.holder, ids, [values[0] - 1n, values[1] - 2n]))
        .to.be.revertedWithCustomError(this.token, 'ERC1155MissingApprovalForAll')
        .withArgs(this.other, this.holder);
    });
  });
});
