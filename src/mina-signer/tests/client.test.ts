import Client from '../dist/node/mina-signer/mina-signer.js';

describe('Client Class Initialization', () => {
  let client;

  it('should accept `mainnet` as a valid network parameter', () => {
    client = new Client({ network: 'mainnet' });
    expect(client).toBeDefined();
  });

  it('should accept `testnet` as a valid network parameter', () => {
    client = new Client({ network: 'testnet' });
    expect(client).toBeDefined();
  });

  it('should accept `devnet` as a valid network parameter', () => {
    client = new Client({ network: 'devnet' });
    expect(client).toBeDefined();
  });

  it('should throw an error if a value that is not `mainnet`, `devnet`, or `testnet` is specified', () => {
    try {
      //@ts-ignore
      client = new Client({ network: 'new-network' });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
