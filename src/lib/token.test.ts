import {
  Field,
  shutdown,
  isReady,
  State,
  state,
  UInt64,
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
} from '../index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
await isReady;

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
  }

  @method init() {
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

    this.experimental.token.mint({
      address: receiverAddress,
      amount,
    });

    this.totalAmountInCirculation.set(newTotalAmountInCirculation);
  }

  @method burn(receiverAddress: PublicKey, amount: UInt64) {
    this.experimental.token.burn({
      address: receiverAddress,
      amount,
    });
  }

  @method sendTokens(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    amount: UInt64
  ) {
    this.experimental.token.send({
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

// Call `setupLocal` before running each test to reset the ledger state.
async function setupLocal() {
  // Set up local blockchain, create zkapp keys, token account keys, deploy the contract
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

  (
    await Mina.transaction(feePayer, () => {
      Party.fundNewAccount(feePayer);
      zkapp.deploy({ zkappKey });
      zkapp.init();
    })
  ).send();
}

await setupLocal();

describe('Token', () => {
  describe('Create existing token', () => {
    it('should have a valid custom token id', async () => {
      const tokenId = zkapp.experimental.token.id;
      const expectedTokenId = new Token({ tokenOwner: zkappAddress }).id;
      expect(tokenId).toBeDefined();
      expect(tokenId).toEqual(expectedTokenId);
    });

    it('should have a valid token symbol', async () => {
      const symbol = Mina.getAccount(zkappAddress).tokenSymbol;
      expect(tokenSymbol).toBeDefined();
      expect(symbol).toEqual(tokenSymbol);
    });

    it('should create a valid token with a different parentTokenId', async () => {
      const newTokenId = Ledger.customTokenId(
        tokenAccount1,
        zkapp.experimental.token.id
      );
      expect(newTokenId).toBeDefined();
    });

    it('should error if passing in an invalid tokenSymbol', async () => {
      await setupLocal();
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
      await setupLocal();
      (
        await Mina.transaction(feePayer, () => {
          Party.fundNewAccount(feePayer);
          zkapp.mint(tokenAccount1, UInt64.from(100_000));
          zkapp.sign(zkappKey);
        })
      ).send();

      expect(
        Mina.getBalance(
          tokenAccount1,
          zkapp.experimental.token.id
        ).value.toBigInt()
      ).toEqual(100_000n);
    });

    it('should error if token owner mints more tokens than allowed', async () => {
      await setupLocal();
      await Mina.transaction(feePayer, () => {
        Party.fundNewAccount(feePayer);
        zkapp.mint(tokenAccount1, UInt64.from(100_000_000_000));
        zkapp.sign(zkappKey);
      }).catch((e) => {
        expect(e).toBeDefined();
      });
    });
  });

  describe('Burn token', () => {
    it('should change the balance of a token account after token owner burns', async () => {
      await setupLocal();
      (
        await Mina.transaction(feePayer, () => {
          Party.fundNewAccount(feePayer);
          zkapp.mint(tokenAccount1, UInt64.from(100_000));
          zkapp.sign(zkappKey);
        })
      ).send();
      (
        await Mina.transaction(feePayer, () => {
          zkapp.burn(tokenAccount1, UInt64.from(10_000));
          zkapp.sign(zkappKey);
        })
      )
        .sign([tokenAccount1Key])
        .send();

      expect(
        Mina.getBalance(
          tokenAccount1,
          zkapp.experimental.token.id
        ).value.toBigInt()
      ).toEqual(90_000n);
    });

    it('should error if token owner burns more tokens than token account has', async () => {
      await setupLocal();
      (
        await Mina.transaction(feePayer, () => {
          Party.fundNewAccount(feePayer);
          zkapp.mint(tokenAccount1, UInt64.from(1_000));
          zkapp.sign(zkappKey);
        })
      ).send();

      let tx = (
        await Mina.transaction(feePayer, () => {
          zkapp.burn(tokenAccount1, UInt64.from(10_000));
          zkapp.sign(zkappKey);
        })
      ).sign([tokenAccount1Key]);

      expect(() => {
        tx.send();
      }).toThrow();
    });
  });
  describe('Send token', () => {
    it('should change the balance of a token account after sending', async () => {
      await setupLocal();
      (
        await Mina.transaction(feePayer, () => {
          Party.fundNewAccount(feePayer);
          zkapp.mint(tokenAccount1, UInt64.from(100_000));
          zkapp.sign(zkappKey);
        })
      ).send();
      (
        await Mina.transaction(feePayer, () => {
          Party.fundNewAccount(feePayer);
          zkapp.sendTokens(tokenAccount1, tokenAccount2, UInt64.from(10_000));
          zkapp.sign(zkappKey);
        })
      )
        .sign([tokenAccount1Key])
        .send();

      expect(
        Mina.getBalance(
          tokenAccount1,
          zkapp.experimental.token.id
        ).value.toBigInt()
      ).toEqual(90_000n);
      expect(
        Mina.getBalance(
          tokenAccount2,
          zkapp.experimental.token.id
        ).value.toBigInt()
      ).toEqual(10_000n);
    });

    it('should error creating a token account if no account creation fee is specified', async () => {
      await setupLocal();
      (
        await Mina.transaction(feePayer, () => {
          Party.fundNewAccount(feePayer);
          zkapp.mint(tokenAccount1, UInt64.from(100_000));
          zkapp.sign(zkappKey);
        })
      ).send();

      let tx = (
        await Mina.transaction(feePayer, () => {
          zkapp.sendTokens(tokenAccount1, tokenAccount2, UInt64.from(10_000));
          zkapp.sign(zkappKey);
        })
      ).sign([tokenAccount1Key]);

      expect(() => {
        tx.send();
      }).toThrow();
    });

    it('should error if sender sends more tokens than they have', async () => {
      await setupLocal();
      (
        await Mina.transaction(feePayer, () => {
          Party.fundNewAccount(feePayer);
          zkapp.mint(tokenAccount1, UInt64.from(100_000));
          zkapp.sign(zkappKey);
        })
      ).send();

      let tx = (
        await Mina.transaction(feePayer, () => {
          zkapp.sendTokens(
            tokenAccount1,
            tokenAccount2,
            UInt64.from(100_000_000)
          );
          zkapp.sign(zkappKey);
        })
      ).sign([tokenAccount1Key]);

      expect(() => {
        tx.send();
      }).toThrow();
    });
  });
});

setImmediate(shutdown);
