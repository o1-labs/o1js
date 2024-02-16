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

/**
 * currentSlot:
 *  - Remote: not implemented, throws
 *  - Local: implemented
 */

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

  @method incrementCounter() {
    this.reducer.dispatch(Field(1));
  }

  @method rollupIncrements() {
    const counter = this.counter.get();
    this.counter.requireEquals(counter);
    const actionState = this.actionState.get();
    this.actionState.requireEquals(actionState);

    const endActionState = this.account.actionState.getAndRequireEquals();

    const pendingActions = this.reducer.getActions({
      fromActionState: actionState,
      endActionState,
    });

    const { state: newCounter, actionState: newActionState } =
      this.reducer.reduce(
        pendingActions,
        Field,
        (state: Field, _action: Field) => {
          return state.add(1);
        },
        { state: counter, actionState }
      );

    // update on-chain state
    this.counter.set(newCounter);
    this.actionState.set(newActionState);
  }

  @method update(y: Field, publicKey: PublicKey) {
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

async function sendAndVerifyTransaction(transaction: Mina.Transaction) {
  await transaction.prove();
  const pendingTransaction = await transaction.send();
  assert(pendingTransaction.hash() !== undefined);
  const includedTransaction = await pendingTransaction.wait();
  assert(includedTransaction.status === 'included');
}

const transactionFee = 100_000_000;

const Local = Mina.LocalBlockchain();
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
  try {
    await Mina.transaction({ sender, fee: transactionFee }, () => {
      Mina.getNetworkConstants();
      Mina.getNetworkState();
      Mina.getNetworkId();
      Mina.getProofsEnabled();
    });
  } catch (error) {
    assert.ifError(error);
  }
});
console.log('');

console.log(
  `Test 'fetchAccount', 'getAccount', and 'hasAccount' match behavior using publicKey: ${zkAppAddress.toBase58()}`
);
await testLocalAndRemote(async () => {
  try {
    await fetchAccount({ publicKey: zkAppAddress }); // Must call fetchAccount to populate internal account cache
    const account = Mina.getAccount(zkAppAddress);
    return {
      publicKey: account.publicKey,
      nonce: account.nonce,
      hasAccount: Mina.hasAccount(zkAppAddress),
    };
  } catch (error) {
    assert.ifError(error);
  }
});
console.log('');

console.log('Test deploying zkApp for public key ' + zkAppAddress.toBase58());
await testLocalAndRemote(async () => {
  try {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      () => {
        zkApp.deploy({ verificationKey });
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);
  } catch (error) {
    assert.ifError(error);
  }
});
console.log('');

console.log("Test calling 'update' method on zkApp does not throw");
await testLocalAndRemote(async () => {
  try {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      () => {
        zkApp.update(Field(1), PrivateKey.random().toPublicKey());
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);
    await Mina.fetchEvents(zkAppAddress, TokenId.default);
  } catch (error) {
    assert.ifError(error);
  }
});
console.log('');

console.log("Test specifying 'invalid_fee_access' throws");
await testLocalAndRemote(async () => {
  let errorWasThrown = false;
  try {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      () => {
        AccountUpdate.fundNewAccount(zkAppAddress);
        zkApp.update(Field(1), PrivateKey.random().toPublicKey());
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);
  } catch (error) {
    errorWasThrown = true;
  }
  assert(errorWasThrown);
});
console.log('');

console.log('Test emitting and fetching actions do not throw');
await testLocalAndRemote(async () => {
  try {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      () => {
        zkApp.incrementCounter();
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);
  } catch (error) {
    assert.ifError(error);
  }

  try {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      () => {
        zkApp.rollupIncrements();
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);
  } catch (error) {
    assert.ifError(error);
  }

  try {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      () => {
        zkApp.incrementCounter();
        zkApp.incrementCounter();
        zkApp.incrementCounter();
        zkApp.incrementCounter();
        zkApp.incrementCounter();
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);
  } catch (error) {
    assert.ifError(error);
  }

  try {
    const transaction = await Mina.transaction(
      { sender, fee: transactionFee },
      () => {
        zkApp.rollupIncrements();
      }
    );
    transaction.sign([senderKey, zkAppKey]);
    await sendAndVerifyTransaction(transaction);
  } catch (error) {
    assert.ifError(error);
  }
});
