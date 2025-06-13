const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { RevertType } = require('../../../helpers/enums');
const { PANIC_CODES } = require('@nomicfoundation/hardhat-chai-matchers/panic');

const tokenId = 1n;

const RECEIVER_MAGIC_VALUE = '0x150b7a02';

const deployReceiver = (revertType, returnValue = RECEIVER_MAGIC_VALUE) =>
  ethers.deployContract('$ERC721ReceiverMock', [returnValue, revertType]);

const fixture = async () => {
  const [eoa] = await ethers.getSigners();
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  let [operator, owner] = wallets;
  const utils = await ethers.deployContract('$ERC721Utils');

  const receivers = {
    correct: await deployReceiver(RevertType.None),
    invalid: await deployReceiver(RevertType.None, '0xdeadbeef'),
    message: await deployReceiver(RevertType.RevertWithMessage),
    empty: await deployReceiver(RevertType.RevertWithoutMessage),
    customError: await deployReceiver(RevertType.RevertWithCustomError),
    panic: await deployReceiver(RevertType.Panic),
    nonReceiver: await ethers.deployContract('CallReceiverMock'),
    eoa,
  };

  return { operator, owner, utils, receivers };
};

describe('ERC721Utils', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  describe('onERC721Received', function () {
    it('succeeds when called by an EOA', async function () {
      await expect(this.utils.$checkOnERC721Received(this.operator, this.owner, this.receivers.eoa, tokenId, '0x')).to
        .not.be.reverted;
    });

    it('succeeds when data is passed', async function () {
      const data = '0x12345678';
      await expect(this.utils.$checkOnERC721Received(this.operator, this.owner, this.receivers.correct, tokenId, data))
        .to.not.be.reverted;
    });

    it('succeeds when data is empty', async function () {
      await expect(this.utils.$checkOnERC721Received(this.operator, this.owner, this.receivers.correct, tokenId, '0x'))
        .to.not.be.reverted;
    });

    it('reverts when receiver returns invalid value', async function () {
      await expect(this.utils.$checkOnERC721Received(this.operator, this.owner, this.receivers.invalid, tokenId, '0x'))
        .to.be.revertedWithCustomError(this.utils, 'ERC721InvalidReceiver')
        .withArgs(this.receivers.invalid);
    });

    it('reverts when receiver reverts with message', async function () {
      await expect(
        this.utils.$checkOnERC721Received(this.operator, this.owner, this.receivers.message, tokenId, '0x'),
      ).to.be.revertedWith('ERC721ReceiverMock: reverting');
    });

    it('reverts when receiver reverts without message', async function () {
      await expect(this.utils.$checkOnERC721Received(this.operator, this.owner, this.receivers.empty, tokenId, '0x'))
        .to.be.revertedWithCustomError(this.utils, 'ERC721InvalidReceiver')
        .withArgs(this.receivers.empty);
    });

    it('reverts when receiver reverts with custom error', async function () {
      await expect(
        this.utils.$checkOnERC721Received(this.operator, this.owner, this.receivers.customError, tokenId, '0x'),
      )
        .to.be.revertedWithCustomError(this.receivers.customError, 'CustomError')
        .withArgs(RECEIVER_MAGIC_VALUE);
    });

    it('reverts when receiver panics', async function () {
      await expect(
        this.utils.$checkOnERC721Received(this.operator, this.owner, this.receivers.panic, tokenId, '0x'),
      ).to.be.revertedWithPanic(PANIC_CODES.DIVISION_BY_ZERO);
    });

    it('reverts when receiver does not implement onERC721Received', async function () {
      await expect(
        this.utils.$checkOnERC721Received(this.operator, this.owner, this.receivers.nonReceiver, tokenId, '0x'),
      )
        .to.be.revertedWithCustomError(this.utils, 'ERC721InvalidReceiver')
        .withArgs(this.receivers.nonReceiver);
    });
  });
});
