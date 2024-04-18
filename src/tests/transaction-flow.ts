import {
  AccountUpdate,
  Provable,
  Field,
  Lightnet,
  Mina,
  PrivateKey,
  Struct,
  PublicKey,
  SmartContract,
  State,
  state,
  method,
  Reducer,
  fetchAccount,
  TokenId,
} from 'o1js';
import assert from 'node:assert';

class Event extends Struct({ pub: PublicKey, value: Field }) {}

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();
  @state(Field) counter = State<Field>();
  @state(Field) actionState = State<Field>();

  reducer = Reducer({ actionType: Field });

  events = {
    complexEvent: Event,
    simpleEvent: Field,
  };

  init() {
    super.init();
    this.x.set(Field(2));
    this.counter.set(Field(0));
    this.actionState.set(Reducer.initialActionState);
  }

  @method async incrementCounter() {
    this.reducer.dispatch(Field(1));
  }

  @method async rollupIncrements() {
    const counter = this.counter.get();
    this.counter.requireEquals(counter);
    const actionState = this.actionState.get();
    this.actionState.requireEquals(actionState);

    // TODO: fix correct fetching of endActionState
    //const endActionState = this.account.actionState.getAndRequireEquals();

    const pendingActions = this.reducer.getActions({
      fromActionState: actionState,
      //endActionState,
    });

    const newCounter = this.reducer.reduce(
      pendingActions,
      Field,
      (state: Field, _action: Field) => {
        return state.add(1);
      },
      counter
    );

    // update on-chain state
    this.counter.set(newCounter);
    this.actionState.set(pendingActions.hash);
  }

  @method async update(y: Field, publicKey: PublicKey) {
    this.emitEvent('complexEvent', {
      pub: publicKey,
      value: y,
    });
    this.emitEvent('simpleEvent', y);
    const x = this.x.getAndRequireEquals();
    this.x.set(x.add(y));
  }
}

async function testLocalAndRemote(
  f: (...args: any[]) => Promise<any>,
  ...args: any[]
) {
  console.log('⌛ Performing local test');
  Mina.setActiveInstance(Local);
  const localResponse = await f(...args);

  console.log('⌛ Performing remote test');
  Mina.setActiveInstance(Remote);
  const networkResponse = await f(...args);

  if (localResponse !== undefined && networkResponse !== undefined) {
    assert.strictEqual(
      JSON.stringify(localResponse),
      JSON.stringify(networkResponse)
    );
  }
  console.log('✅ Test passed');
}

async function sendAndVerifyTransaction(
  transaction: Mina.Transaction<false, false>,
  throwOnFail = false
) {
  await transaction.prove();
  if (throwOnFail) {
    const pendingTransaction = await transaction.send();
    return await pendingTransaction.wait();
  } else {
    const pendingTransaction = await transaction.safeSend();
    if (pendingTransaction.status === 'pending') {
      return await pendingTransaction.safeWait();
    } else {
      return pendingTransaction;
    }
  }
}

const transactionFee = 100_000_000;

const Local = await Mina.LocalBlockchain();
const Remote = Mina.Network({
  mina: 'http://localhost:8080/graphql',
  archive: 'http://localhost:8282 ',
  lightnetAccountManager: 'http://localhost:8181',
});

// First set active instance to remote so we can sync up accounts between remote and local ledgers
Mina.setActiveInstance(Remote);

const senderKey = (await Lightnet.acquireKeyPair()).privateKey;
const sender = senderKey.toPublicKey();
const zkAppKey = (await Lightnet.acquireKeyPair()).privateKey;
const zkAppAddress = zkAppKey.toPublicKey();

// Same balance as remote ledger
const balance = (1550n * 10n ** 9n).toString();
Local.addAccount(sender, balance);
Local.addAccount(zkAppAddress, balance);

console.log('Compiling the smart contract.');
const { verificationKey } = await SimpleZkapp.compile();
const zkApp = new SimpleZkapp(zkAppAddress);
console.log('');

console.log('Testing network auxiliary functions do not throw');
await testLocalAndRemote(async () => {
  await assert.doesNotReject(async () => {
    await Mina.transaction({ sender, fee: transactionFee }, async () => {
      Mina.getNetworkConstants();
      Mina.getNetworkState();
      Mina.getNetworkId();
      Mina.getProofsEnabled();
    });
  });
});
console.log('');

console.log(
  `Test 'fetchAccount', 'getAccount', and 'hasAccount' match behavior using publicKey: ${zkAppAddress.toBase58()}`
);
await testLocalAndRemote(async () => {
  await assert.doesNotReject(async () => {
    await fetchAccount({ publicKey: zkAppAddress }); // Must call fetchAccount to populate internal account cache
    const account = Mina.getAccount(zkAppAddress);
    return {
      publicKey: account.publicKey,
      nonce: account.nonce,
      hasAccount: Mina.hasAccount(zkAppAddress),
    };
  });
});
console.log('');

console.log('Test deploying zkApp for public key ' + zkAppAddress.toBase58());
await testLocalAndRemote(async () => {
  await assert.doesNotReject(async () => {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      () => zkApp.deploy({ verificationKey })
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);
  });
});
console.log('');

console.log(
  "Test calling successful 'update' method does not throw with throwOnFail is true"
);
await testLocalAndRemote(async () => {
  await assert.doesNotReject(async () => {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      async () => {
        await zkApp.update(Field(1), PrivateKey.random().toPublicKey());
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    const includedTransaction = await sendAndVerifyTransaction(
      transaction,
      true
    );
    assert(includedTransaction.status === 'included');
    await Mina.fetchEvents(zkAppAddress, TokenId.default);
  });
});
console.log('');

console.log(
  "Test calling successful 'update' method does not throw with throwOnFail is false"
);
await testLocalAndRemote(async () => {
  await assert.doesNotReject(async () => {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      async () => {
        await zkApp.update(Field(1), PrivateKey.random().toPublicKey());
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    const includedTransaction = await sendAndVerifyTransaction(transaction);
    assert(includedTransaction.status === 'included');
    await Mina.fetchEvents(zkAppAddress, TokenId.default);
  });
});
console.log('');

console.log(
  "Test calling failing 'update' expecting 'invalid_fee_access' does not throw with throwOnFail is false"
);
await testLocalAndRemote(async () => {
  const transaction = await Mina.transaction(
    { sender, fee: transactionFee },
    async () => {
      AccountUpdate.fundNewAccount(zkAppAddress);
      await zkApp.update(Field(1), PrivateKey.random().toPublicKey());
    }
  );
  transaction.sign([senderKey, zkAppKey]);
  const rejectedTransaction = await sendAndVerifyTransaction(transaction);
  assert(rejectedTransaction.status === 'rejected');
});
console.log('');

console.log(
  "Test calling failing 'update' expecting 'invalid_fee_access' does throw with throwOnFail is true"
);
await testLocalAndRemote(async () => {
  await assert.rejects(async () => {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      async () => {
        AccountUpdate.fundNewAccount(zkAppAddress);
        await zkApp.update(Field(1), PrivateKey.random().toPublicKey());
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction, true);
  });
});
console.log('');

console.log('Test emitting and fetching actions do not throw');
await testLocalAndRemote(async () => {
  try {
    let transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      () => zkApp.incrementCounter()
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);

    transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      async () => zkApp.rollupIncrements()
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);

    transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      async () => {
        await zkApp.incrementCounter();
        await zkApp.incrementCounter();
        await zkApp.incrementCounter();
        await zkApp.incrementCounter();
        await zkApp.incrementCounter();
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);

    transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      async () => zkApp.rollupIncrements()
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);
  } catch (error) {
    assert.ifError(error);
  }
});
