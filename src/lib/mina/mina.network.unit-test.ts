import {
  State,
  state,
  UInt64,
  Bool,
  SmartContract,
  Mina,
  AccountUpdate,
  method,
  PublicKey,
  Permissions,
  VerificationKey,
  Field,
  Int64,
  TokenId,
  TokenContract as TokenContractBase,
  AccountUpdateForest,
  PrivateKey,
} from 'o1js';
import { test, describe, it, before } from 'node:test';
import { expect } from 'expect';



const defaultNetwork = Mina.Network({
  networkId: "testnet",
  mina: "https://example.com/graphql",
  archive: "https://example.com//graphql"
});

const enforcedNetwork = Mina.Network({
  networkId: "testnet",
  mina: "https://example.com/graphql",
  archive: "https://example.com//graphql",
  bypassTransactionLimits: false
});

const unlimitedNetwork = Mina.Network({
  networkId: "testnet",
  mina: "https://unlimited.com/graphql",
  archive: "https://unlimited.com//graphql",
  bypassTransactionLimits: true
});

describe('Test default network', () => {
  let bobAccount: PublicKey,
    bobKey: PrivateKey;

  before(async () => {

    Mina.setActiveInstance(defaultNetwork);
    bobKey = PrivateKey.random();
    bobAccount = bobKey.toPublicKey();
  });


  it('Simple account update', async () => {

    let txn = await Mina.transaction(async () => {
      const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(1));
      accountUpdateBob.account.balance.requireEquals(UInt64.zero);
      accountUpdateBob.balance.addInPlace(UInt64.one);
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();

  });

  it('Multiple account update', async () => {

    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 2; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();

  });

  it('More than limit account update', async () => {

    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 12; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    // failure with default bypassTransactionLimits value
    await expect(txn.sign([bobKey]).safeSend()).rejects.toThrow();
  });
});

describe('Test enforced network', () => {
  let bobAccount: PublicKey,
    bobKey: PrivateKey;

  before(async () => {

    Mina.setActiveInstance(enforcedNetwork);
    bobKey = PrivateKey.random();
    bobAccount = bobKey.toPublicKey();
  });


  it('Simple account update', async () => {

    let txn = await Mina.transaction(async () => {
      const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(1));
      accountUpdateBob.account.balance.requireEquals(UInt64.zero);
      accountUpdateBob.balance.addInPlace(UInt64.one);
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();

  });

  it('Multiple account update', async () => {

    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 2; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();

  });

  it('More than limit account update', async () => {

    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 12; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    // failure with bypassTransactionLimits = false
    await expect(txn.sign([bobKey]).safeSend()).rejects.toThrow();
  });
});

describe('Test unlimited network', () => {
  let bobAccount: PublicKey,
    bobKey: PrivateKey;

  before(async () => {

    Mina.setActiveInstance(unlimitedNetwork);
    bobKey = PrivateKey.random();
    bobAccount = bobKey.toPublicKey();
  });


  it('Simple account update', async () => {

    let txn = await Mina.transaction(async () => {
      const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(1));
      accountUpdateBob.account.balance.requireEquals(UInt64.zero);
      accountUpdateBob.balance.addInPlace(UInt64.one);
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();

  });

  it('Multiple account update', async () => {

    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 2; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();

  });

  it('More than limit account update', async () => {

    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 12; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    // success with bypassTransactionLimits = true
    await txn.sign([bobKey]).safeSend();
  });
});