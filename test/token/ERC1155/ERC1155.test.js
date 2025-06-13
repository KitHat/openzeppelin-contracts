const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { zip } = require('../../helpers/iterate');
const { shouldBehaveLikeERC1155 } = require('./ERC1155.behavior');

const initialURI = 'https://token-cdn-domain/{id}.json';

async function fixture() {
  const [operator, ...otherAccounts] = await ethers.getSigners();
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  otherAccounts[0] = wallets[0];
  otherAccounts[1] = wallets[1];
  const holder = wallets[2];
  const token = await ethers.deployContract('$ERC1155', [initialURI]);
  return { token, operator, holder, otherAccounts };
}

describe('ERC1155', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  shouldBehaveLikeERC1155();

  describe('internal functions', function () {
    const tokenId = 1990n;
    const mintValue = 9001n;
    const burnValue = 3000n;

    const tokenBatchIds = [2000n, 2010n, 2020n];
    const mintValues = [5000n, 10000n, 42195n];
    const burnValues = [5000n, 9001n, 195n];

    const data = '0x12345678';

    describe('_mint', function () {
      it('reverts with a zero destination address', async function () {
        await expect(this.token.$_mint(ethers.ZeroAddress, tokenId, mintValue, data))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidReceiver')
          .withArgs(ethers.ZeroAddress);
      });

      describe('with minted tokens', function () {
        beforeEach(async function () {
          this.tx = await this.token.connect(this.operator).$_mint(this.holder, tokenId, mintValue, data);
        });

        it('emits a TransferSingle event', async function () {
          await expect(this.tx)
            .to.emit(this.token, 'TransferSingle')
            .withArgs(this.operator, ethers.ZeroAddress, this.holder, tokenId, mintValue);
        });

        it('credits the minted token value', async function () {
          expect(await this.token.balanceOf(this.holder, tokenId)).to.equal(mintValue);
        });
      });
    });

    describe('_mintBatch', function () {
      it('reverts with a zero destination address', async function () {
        await expect(this.token.$_mintBatch(ethers.ZeroAddress, tokenBatchIds, mintValues, data))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidReceiver')
          .withArgs(ethers.ZeroAddress);
      });

      it('reverts if length of inputs do not match', async function () {
        await expect(this.token.$_mintBatch(this.holder, tokenBatchIds, mintValues.slice(1), data))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidArrayLength')
          .withArgs(tokenBatchIds.length, mintValues.length - 1);

        await expect(this.token.$_mintBatch(this.holder, tokenBatchIds.slice(1), mintValues, data))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidArrayLength')
          .withArgs(tokenBatchIds.length - 1, mintValues.length);
      });

      describe('with minted batch of tokens', function () {
        beforeEach(async function () {
          this.tx = await this.token.connect(this.operator).$_mintBatch(this.holder, tokenBatchIds, mintValues, data);
        });

        it('emits a TransferBatch event', async function () {
          await expect(this.tx)
            .to.emit(this.token, 'TransferBatch')
            .withArgs(this.operator, ethers.ZeroAddress, this.holder, tokenBatchIds, mintValues);
        });

        it('credits the minted batch of tokens', async function () {
          const holderBatchBalances = await this.token.balanceOfBatch(
            tokenBatchIds.map(() => this.holder),
            tokenBatchIds,
          );

          expect(holderBatchBalances).to.deep.equal(mintValues);
        });
      });
    });

    describe('_burn', function () {
      it("reverts when burning the zero account's tokens", async function () {
        await expect(this.token.$_burn(ethers.ZeroAddress, tokenId, mintValue))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidSender')
          .withArgs(ethers.ZeroAddress);
      });

      it('reverts when burning a non-existent token id', async function () {
        await expect(this.token.$_burn(this.holder, tokenId, mintValue))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InsufficientBalance')
          .withArgs(this.holder, 0, mintValue, tokenId);
      });

      it('reverts when burning more than available tokens', async function () {
        await this.token.connect(this.operator).$_mint(this.holder, tokenId, mintValue, data);

        await expect(this.token.$_burn(this.holder, tokenId, mintValue + 1n))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InsufficientBalance')
          .withArgs(this.holder, mintValue, mintValue + 1n, tokenId);
      });

      describe('with minted-then-burnt tokens', function () {
        beforeEach(async function () {
          await this.token.$_mint(this.holder, tokenId, mintValue, data);
          this.tx = await this.token.connect(this.operator).$_burn(this.holder, tokenId, burnValue);
        });

        it('emits a TransferSingle event', async function () {
          await expect(this.tx)
            .to.emit(this.token, 'TransferSingle')
            .withArgs(this.operator, this.holder, ethers.ZeroAddress, tokenId, burnValue);
        });

        it('accounts for both minting and burning', async function () {
          expect(await this.token.balanceOf(this.holder, tokenId)).to.equal(mintValue - burnValue);
        });
      });
    });

    describe('_burnBatch', function () {
      it("reverts when burning the zero account's tokens", async function () {
        await expect(this.token.$_burnBatch(ethers.ZeroAddress, tokenBatchIds, burnValues))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidSender')
          .withArgs(ethers.ZeroAddress);
      });

      it('reverts if length of inputs do not match', async function () {
        await expect(this.token.$_burnBatch(this.holder, tokenBatchIds, burnValues.slice(1)))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidArrayLength')
          .withArgs(tokenBatchIds.length, burnValues.length - 1);

        await expect(this.token.$_burnBatch(this.holder, tokenBatchIds.slice(1), burnValues))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidArrayLength')
          .withArgs(tokenBatchIds.length - 1, burnValues.length);
      });

      it('reverts when burning a non-existent token id', async function () {
        await expect(this.token.$_burnBatch(this.holder, tokenBatchIds, burnValues))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InsufficientBalance')
          .withArgs(this.holder, 0, burnValues[0], tokenBatchIds[0]);
      });

      describe('with minted-then-burnt tokens', function () {
        beforeEach(async function () {
          await this.token.$_mintBatch(this.holder, tokenBatchIds, mintValues, data);
          this.tx = await this.token.connect(this.operator).$_burnBatch(this.holder, tokenBatchIds, burnValues);
        });

        it('emits a TransferBatch event', async function () {
          await expect(this.tx)
            .to.emit(this.token, 'TransferBatch')
            .withArgs(this.operator, this.holder, ethers.ZeroAddress, tokenBatchIds, burnValues);
        });

        it('accounts for both minting and burning', async function () {
          const holderBatchBalances = await this.token.balanceOfBatch(
            tokenBatchIds.map(() => this.holder),
            tokenBatchIds,
          );

          expect(holderBatchBalances).to.deep.equal(
            zip(mintValues, burnValues).map(([mintValue, burnValue]) => mintValue - burnValue),
          );
        });
      });
    });
  });

  describe('ERC1155MetadataURI', function () {
    const firstTokenID = 42n;
    const secondTokenID = 1337n;

    it('emits no URI event in constructor', async function () {
      await expect(this.token.deploymentTransaction()).to.not.emit(this.token, 'URI');
    });

    it('sets the initial URI for all token types', async function () {
      expect(await this.token.uri(firstTokenID)).to.equal(initialURI);
      expect(await this.token.uri(secondTokenID)).to.equal(initialURI);
    });

    describe('_setURI', function () {
      const newURI = 'https://token-cdn-domain/{locale}/{id}.json';

      it('emits no URI event', async function () {
        await expect(this.token.$_setURI(newURI)).to.not.emit(this.token, 'URI');
      });

      it('sets the new URI for all token types', async function () {
        await this.token.$_setURI(newURI);

        expect(await this.token.uri(firstTokenID)).to.equal(newURI);
        expect(await this.token.uri(secondTokenID)).to.equal(newURI);
      });
    });
  });
});
