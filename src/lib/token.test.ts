import {
  shutdown,
  isReady,
  State,
  state,
  Field,
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
  Token,
  Ledger,
  getDefaultTokenId,
} from '../../dist/server';

const tokenSymbol = 'MY_TOKEN';

class TokenContract extends SmartContract {
  @state(UInt64) totalAmountInCirculation = State<UInt64>();
  @state(UInt64) maxAmountInCirculation = State<UInt64>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.tokenSymbol.set(tokenSymbol);
    this.totalAmountInCirculation.set(UInt64.zero);
    this.maxAmountInCirculation.set(UInt64.from(100_000_000));
  }

  @method mint(receiverAddress: PublicKey, amount: UInt64) {
    let totalAmountInCirculation = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.assertEquals(totalAmountInCirculation);

    let maxAmountInCirculation = this.maxAmountInCirculation.get();
    this.maxAmountInCirculation.assertEquals(maxAmountInCirculation);

    let newTotalAmountInCirculation = totalAmountInCirculation.add(amount);

    newTotalAmountInCirculation.value
      .lte(maxAmountInCirculation.value)
      .assertTrue();

    this.token().mint({
      address: receiverAddress,
      amount,
    });

    this.totalAmountInCirculation.set(newTotalAmountInCirculation);
  }

  @method burn(receiverAddress: PublicKey, amount: UInt64) {
    this.token().burn({
      address: receiverAddress,
      amount,
    });
  }

  @method send(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    amount: UInt64
  ) {
    this.token().send({
      to: receiverAddress,
      from: senderAddress,
      amount,
    });
  }

  @method setInvalidTokenSymbol() {
    this.tokenSymbol.set(
      'this-token-symbol-is-too-long-and-will-cause-an-error'
    );
  }
}

let zkappKey: PrivateKey;
let zkappAddress: PublicKey;
let zkapp: TokenContract;
let feePayer: PrivateKey;

let tokenAccount1Key: PrivateKey;
let tokenAccount1: PublicKey;

let tokenAccount2Key: PrivateKey;
let tokenAccount2: PublicKey;

beforeAll(async () => {
  // set up local blockchain, create zkapp keys, deploy the contract
  await isReady;
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  feePayer = Local.testAccounts[0].privateKey;

  zkappKey = PrivateKey.random();
  zkappAddress = zkappKey.toPublicKey();
  zkapp = new TokenContract(zkappAddress);

  tokenAccount1Key = Local.testAccounts[1].privateKey;
  tokenAccount1 = tokenAccount1Key.toPublicKey();

  tokenAccount2Key = Local.testAccounts[2].privateKey;
  tokenAccount2 = tokenAccount2Key.toPublicKey();

  let tx = await Mina.transaction(feePayer, () => {
    Party.fundNewAccount(feePayer);
    zkapp.deploy({ zkappKey });
  });
  tx.send();
});

afterAll(() => setTimeout(shutdown, 0));

describe('Token', () => {
  describe('Create existing token', () => {
    it('should have a valid custom token id', async () => {
      const tokenId = zkapp.token().id;
      const expectedTokenId = new Token({ tokenOwner: zkappAddress }).id;
      expect(tokenId).toBeDefined();
      expect(tokenId).toEqual(expectedTokenId);
    });

    it('should have a valid token symbol', async () => {
      const symbol = Mina.getAccount({
        publicKey: zkappAddress,
      }).tokenSymbol;
      expect(tokenSymbol).toBeDefined();
      expect(symbol).toEqual(tokenSymbol);
    });

    it('should create a valid token with a different parentTokenId', async () => {
      const newTokenId = Ledger.customTokenID(
        tokenAccount1,
        Ledger.fieldOfBase58(zkapp.token().id)
      );
      expect(newTokenId).toBeDefined();
    });

    it('should error if passing in an invalid parentTokenId', async () => {
      expect(() => {
        new Token({
          tokenOwner: zkappAddress,
          parentTokenId: 'invalid',
        });
      }).toThrow();
    });

    it('should error if passing in an invalid tokenSymbol', async () => {
      await Mina.transaction(feePayer, () => {
        zkapp.setInvalidTokenSymbol();
        zkapp.sign(zkappKey);
      }).catch((e) => {
        expect(e).toBeDefined();
      });
    });
  });

  describe('Mint token', () => {
    it('should change the balance of a token account after token owner mints', async () => {
      let tx = await Mina.transaction(feePayer, () => {
        Party.fundNewAccount(feePayer);
        zkapp.mint(tokenAccount1, UInt64.from(100_000));
        zkapp.sign(zkappKey);
      });
      tx.send();
      const balance = Mina.getBalance({
        publicKey: tokenAccount1,
        tokenId: zkapp.token().id,
      }).value.toBigInt();
      expect(balance).toEqual(BigInt(100_000));
    });

    it('should error if token owner mints more tokens than allowed', async () => {
      await Mina.transaction(feePayer, () => {
        Party.fundNewAccount(feePayer);
        zkapp.mint(tokenAccount1, UInt64.from(100_000_000_000));
        zkapp.sign(zkappKey);
      }).catch((e) => {
        expect(e).toBeDefined();
      });
    });

    it('should error if token owner mints negative amount tokens', async () => {
      await Mina.transaction(feePayer, () => {
        Party.fundNewAccount(feePayer);
        zkapp.mint(tokenAccount1, UInt64.from(-100_000));
        zkapp.sign(zkappKey);
      }).catch((e) => {
        expect(e).toBeDefined();
      });
    });
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
