const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { impersonate } = require('../helpers/account');
const { getDomain, ForwardRequest } = require('../helpers/eip712');
const { MAX_UINT48 } = require('../helpers/constants');

const { shouldBehaveLikeRegularContext } = require('../utils/Context.behavior');

async function fixture() {
  const [Sender] = await ethers.getSigners();
  let walletPrivates = [
    "0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68",
    "0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b",
    "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b"
  ];
  let wallets = walletPrivates.map((private) => { return new ethers.Wallet(private, ethers.provider); });
  let other = wallets[0]

  const forwarder = await ethers.deployContract('ERC2771Forwarder', ['ERC2771Forwarder']);
  const forwarderAsSigner = await impersonate(forwarder.target);
  const context = await ethers.deployContract('ERC2771ContextMock', [forwarder]);
  const domain = await getDomain(forwarder);
  const types = { ForwardRequest };

  return { sender, other, forwarder, forwarderAsSigner, context, domain, types };
}

describe('ERC2771Context', function () {
  beforeEach(async function () {
    Object.assign(this, await fixture());
  });

  it('recognize trusted forwarder', async function () {
    expect(await this.context.isTrustedForwarder(this.forwarder)).to.be.true;
  });

  it('returns the trusted forwarder', async function () {
    expect(await this.context.trustedForwarder()).to.equal(this.forwarder);
  });

  describe('when called directly', function () {
    shouldBehaveLikeRegularContext();
  });

  describe('when receiving a relayed call', function () {
    describe('msgSender', function () {
      it('returns the relayed transaction original sender', async function () {
        const nonce = await this.forwarder.nonces(this.sender);
        const data = this.context.interface.encodeFunctionData('msgSender');

        const req = {
          from: await this.sender.getAddress(),
          to: await this.context.getAddress(),
          value: 0n,
          data,
          gas: 100000n,
          nonce,
          deadline: MAX_UINT48,
        };

        req.signature = await this.sender.signTypedData(this.domain, this.types, req);

        expect(await this.forwarder.verify(req)).to.be.true;

        await expect(this.forwarder.execute(req)).to.emit(this.context, 'Sender').withArgs(this.sender);
      });

      it('returns the original sender when calldata length is less than 20 bytes (address length)', async function () {
        // The forwarder doesn't produce calls with calldata length less than 20 bytes so `this.forwarderAsSigner` is used instead.
        await expect(this.context.connect(this.forwarderAsSigner).msgSender())
          .to.emit(this.context, 'Sender')
          .withArgs(this.forwarder);
      });
    });

    describe('msgData', function () {
      it('returns the relayed transaction original data', async function () {
        const args = [42n, 'OpenZeppelin'];

        const nonce = await this.forwarder.nonces(this.sender);
        const data = this.context.interface.encodeFunctionData('msgData', args);

        const req = {
          from: await this.sender.getAddress(),
          to: await this.context.getAddress(),
          value: 0n,
          data,
          gas: 100000n,
          nonce,
          deadline: MAX_UINT48,
        };

        req.signature = this.sender.signTypedData(this.domain, this.types, req);

        expect(await this.forwarder.verify(req)).to.be.true;

        await expect(this.forwarder.execute(req))
          .to.emit(this.context, 'Data')
          .withArgs(data, ...args);
      });
    });

    it('returns the full original data when calldata length is less than 20 bytes (address length)', async function () {
      const data = this.context.interface.encodeFunctionData('msgDataShort');

      // The forwarder doesn't produce calls with calldata length less than 20 bytes so `this.forwarderAsSigner` is used instead.
      await expect(await this.context.connect(this.forwarderAsSigner).msgDataShort())
        .to.emit(this.context, 'DataShort')
        .withArgs(data);
    });
  });

  it('multicall poison attack', async function () {
    const nonce = await this.forwarder.nonces(this.sender);
    const data = this.context.interface.encodeFunctionData('multicall', [
      [
        // poisoned call to 'msgSender()'
        ethers.concat([this.context.interface.encodeFunctionData('msgSender'), this.other.address]),
      ],
    ]);

    const req = {
      from: await this.sender.getAddress(),
      to: await this.context.getAddress(),
      value: 0n,
      data,
      gas: 100000n,
      nonce,
      deadline: MAX_UINT48,
    };

    req.signature = await this.sender.signTypedData(this.domain, this.types, req);

    expect(await this.forwarder.verify(req)).to.be.true;

    await expect(this.forwarder.execute(req)).to.emit(this.context, 'Sender').withArgs(this.sender);
  });
});
