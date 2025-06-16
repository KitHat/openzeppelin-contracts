/// ENVVAR
// - COMPILER:      compiler version (default: 0.8.24)
// - SRC:           contracts folder to compile (default: contracts)
// - RUNS:          number of optimization runs (default: 200)
// - IR:            enable IR compilation (default: false)
// - COVERAGE:      enable coverage report (default: false)
// - GAS:           enable gas report (default: false)
// - COINMARKETCAP: coinmarketcap api key for USD value in gas report
// - CI:            output gas report to file instead of stdout

const fs = require('fs');
const path = require('path');

const { argv } = require('yargs/yargs')()
  .env('')
  .options({
    // Compilation settings
    compiler: {
      alias: 'compileVersion',
      type: 'string',
      default: '0.8.24',
    },
    src: {
      alias: 'source',
      type: 'string',
      default: 'contracts',
    },
    runs: {
      alias: 'optimizationRuns',
      type: 'number',
      default: 200,
    },
    ir: {
      alias: 'enableIR',
      type: 'boolean',
      default: false,
    },
    evm: {
      alias: 'evmVersion',
      type: 'string',
      default: 'cancun',
    },
    // Extra modules
    coverage: {
      type: 'boolean',
      default: false,
    },
    gas: {
      alias: 'enableGasReport',
      type: 'boolean',
      default: false,
    },
    coinmarketcap: {
      alias: 'coinmarketcapApiKey',
      type: 'string',
    },
  });
require('@parity/hardhat-polkadot');
require('@parity/hardhat-polkadot-node');
require('@parity/hardhat-polkadot-resolc');
require('@nomicfoundation/hardhat-chai-matchers');
require('@nomicfoundation/hardhat-ethers');
require('hardhat-exposed');
require('hardhat-gas-reporter');
// require('hardhat-ignore-warnings');
require('solidity-coverage');
require('solidity-docgen');

for (const f of fs.readdirSync(path.join(__dirname, 'hardhat'))) {
  require(path.join(__dirname, 'hardhat', f));
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey: "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133",
          balance: "100000000000000",
        },
        {
          privateKey: "0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b",
          balance: "100000000000000",
        }
      ],
      polkavm: true,
      allowUnlimitedContractSize: true,
      nodeConfig: {
        nodeBinaryPath: '/Users/nikitakhateev/revive-dev-node',
        rpcPort: 8000,
        dev: true,
      },
      adapterConfig: {
        adapterBinaryPath: '/Users/nikitakhateev/eth-rpc',
        dev: true,
      }
    },
  },
  resolc: {
    compilerSource: 'binary',
    settings: {
      optimizer: {
        enabled: true,
        runs: 400,
      },
      evmVersion: "cancun",
      compilerPath: "/Users/nikitakhateev/.cargo/bin/resolc",
      standardJson: true,
    },
  },
  warnings: {
    'contracts-exposed/**/*': {
      'code-size': 'off',
      'initcode-size': 'off',
    },
    '*': {
      'unused-param': !argv.coverage, // coverage causes unused-param warnings
      'transient-storage': false,
      default: 'error',
    },
  },
  exposed: {
    imports: true,
    initializers: true,
    exclude: ['vendor/**/*', '**/*WithInit.sol'],
  },
  gasReporter: {
    enabled: argv.gas,
    showMethodSig: true,
    includeBytecodeInJSON: true,
    currency: 'USD',
    coinmarketcap: argv.coinmarketcap,
  },
  paths: {
    sources: argv.src,
    artifacts: './artifacts-pvm',
    cache: './cache-pvm'
  },
  docgen: require('./docs/config'),
  // abiExporter: {
  //   path: './abi',
  //   clear: true,
  //   flat: true,
  //   pretty: true,
  //   spacing: 2
  // }
};
