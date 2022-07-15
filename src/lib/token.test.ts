import {
  shutdown,
  isReady,
  UInt64,
  UInt32,
  SmartContract,
  Mina,
  PrivateKey,
  Party,
  method,
  PublicKey,
  DeployArgs,
  Permissions,
} from '../../dist/server';
import { deploy } from './zkapp';

class TokenContract extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.tokenSymbol.set('MY_TOKEN');
  }

  @method mint(receiverAddress: PublicKey, amount: number) {
    this.token().mint({
      address: receiverAddress,
      amount,
    });
  }

  @method burn(receiverAddress: PublicKey, amount: number) {
    this.token().burn({
      address: receiverAddress,
      amount,
    });
  }

  @method send(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    amount: number
  ) {
    this.token().send({
      to: receiverAddress,
      from: senderAddress,
      amount,
    });
  }
}

let zkappKey: PrivateKey;
let zkappAddress: PublicKey;
let zkapp: TokenContract;
let feePayer: PrivateKey;

beforeAll(async () => {
  // set up local blockchain, create zkapp keys, deploy the contract
  await isReady;
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  feePayer = Local.testAccounts[0].privateKey;

  zkappKey = PrivateKey.random();
  zkappAddress = zkappKey.toPublicKey();
  zkapp = new TokenContract(zkappAddress);

  let tokenAccount1Key = Local.testAccounts[1].privateKey;
  let tokenAccount1 = tokenAccount1Key.toPublicKey();

  let tokenAccount2Key = Local.testAccounts[2].privateKey;
  let tokenAccount2 = tokenAccount2Key.toPublicKey();

  let tx = await Mina.transaction(feePayer, () => {
    Party.fundNewAccount(feePayer);
    zkapp.deploy({ zkappKey });
  });
  tx.send();
});

afterAll(() => setTimeout(shutdown, 0));

describe('Token', () => {
  describe('Create existing token', () => {
    it('should have a valid custom token id', async () => {});
    it('should have a valid token symbol', async () => {});
    it('should create a valid token with a parentTokenId', async () => {});
    it('should error if passing in an invalid parentTokenId', async () => {});
    it('should error if passing in an invalid tokenSymbol', async () => {});
  });

  describe('Mint token', () => {
    it('should change the balance of a token account after token owner mints', async () => {});
    it('should error if token owner mints more tokens than allowed', async () => {});
    it('should error if token owner mints negative amount tokens', async () => {});
  });

  describe('Burn token', () => {
    it('should change the balance of a token account after token owner burns', async () => {});
    it('should error if token owner burns more tokens than token account has', async () => {});
    it('should error if token owner burns negative amount tokens', async () => {});
  });
  describe('Send token', () => {
    it('should change the balance of a token account after sending', async () => {});
    it('should error creating a token account if no account creation fee is specified', async () => {});
    it('should error if sender sends more tokens than they have', async () => {});
    it('should error if sender sends negative amount of tokens', async () => {});
  });
});
