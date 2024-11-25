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



const defaultNetwork = Mina.Network({
  networkId: "testnet",
  mina: "https://example.com/graphql",
  archive: "https://example.com//graphql"
});

const enforcedNetwork = Mina.Network({
  networkId: "testnet",
  mina: "https://example.com/graphql",
  archive: "https://example.com//graphql",
  enforceTransactionLimits: true
});

const unlimitedNetwork = Mina.Network({
  networkId: "testnet",
  mina: "https://unlimited.com/graphql",
  archive: "https://unlimited.com//graphql",
  enforceTransactionLimits: false
});

describe('Test default network', () => {
  let bobAccount: PublicKey,
    bobKey: PrivateKey;

  beforeAll(async () => {

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
    console.log("Simple account update", txn.toPretty());
    console.log("Simple account update", txn.transaction.accountUpdates.length);
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
    console.log("Multiple account update", txn.toPretty());
    console.log("Multiple account update", txn.transaction.accountUpdates.length);
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
    console.log("More than limit account update", txn.toPretty());
    console.log("More than limit account update", txn.transaction.accountUpdates.length);
    await txn.prove();
    await expect(txn.sign([bobKey]).safeSend()).rejects.toThrow();
  });
});

describe('Test enforced network', () => {
  let bobAccount: PublicKey,
    bobKey: PrivateKey;

  beforeAll(async () => {

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
    console.log("Simple account update", txn.toPretty());
    console.log("Simple account update", txn.transaction.accountUpdates.length);
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
    console.log("Multiple account update", txn.toPretty());
    console.log("Multiple account update", txn.transaction.accountUpdates.length);
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
    console.log("More than limit account update", txn.toPretty());
    console.log("More than limit account update", txn.transaction.accountUpdates.length);
    await txn.prove();
    await expect(txn.sign([bobKey]).safeSend()).rejects.toThrow();
  });
});

describe('Test unlimited network', () => {
  let bobAccount: PublicKey,
    bobKey: PrivateKey;

  beforeAll(async () => {

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
    console.log("Simple account update", txn.toPretty());
    console.log("Simple account update", txn.transaction.accountUpdates.length);
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
    console.log("Multiple account update", txn.toPretty());
    console.log("Multiple account update", txn.transaction.accountUpdates.length);
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
    console.log("More than limit account update", txn.toPretty());
    console.log("More than limit account update", txn.transaction.accountUpdates.length);
    await txn.prove();
    await txn.sign([bobKey]).safeSend();
  });
});