import { SmartContract } from '../zkapp.js';
import * as Mina from '../mina.js';
import {
  OffchainField,
  OffchainMap,
  OffchainState,
} from '../actions/offchain-state.js';
import assert from 'assert';
import { Option } from '../../provable/option.js';
import { BatchReducer } from '../actions/batch-reducer.js';
import { PrivateKey, PublicKey } from '../../provable/crypto/signature.js';

export { testLocal, transaction, deploy, expectState, expectBalance };

type LocalBlockchain = Awaited<ReturnType<typeof Mina.LocalBlockchain>>;

async function testLocal<S extends SmartContract>(
  Contract: typeof SmartContract & (new (...args: any) => S),
  {
    proofsEnabled,
    offchainState,
    batchReducer,
    autoDeploy = true,
  }: {
    proofsEnabled: boolean | 'both';
    offchainState?: OffchainState<any>;
    batchReducer?: BatchReducer<any>;
    autoDeploy?: boolean;
  },
  callback: (input: {
    accounts: Record<string, Mina.TestPublicKey>;
    contract: S;
    Local: LocalBlockchain;
  }) => TestAction[]
) {
  // instance-independent setup: compile programs

  offchainState?.setContractClass(Contract as any);
  batchReducer?.setContractClass(Contract as any);

  if (proofsEnabled) {
    if (offchainState !== undefined) {
      console.time('compile program');
      await offchainState.compile();
      console.timeEnd('compile program');
    }
    if (batchReducer !== undefined) {
      console.time('compile reducer');
      await batchReducer.compile();
      console.timeEnd('compile reducer');
    }
    console.time('compile contract');
    await Contract.compile();
    console.timeEnd('compile contract');
  }

  // how to execute this test against a particular local Mina instance

  async function execute(Local: LocalBlockchain) {
    Mina.setActiveInstance(Local);

    // set up accounts and connect contract to offchain state, reducer

    let [sender, contractAccount] = Local.testAccounts;

    let originalAccounts: Record<string, Mina.TestPublicKey> = {
      sender,
      contractAccount,
    };
    let accounts: Record<string, Mina.TestPublicKey> = new Proxy(
      originalAccounts,
      {
        get(accounts, name: string) {
          if (name in accounts) return accounts[name];
          // TODO would be nicer to use accounts that already exist
          let account = Mina.TestPublicKey.random();
          accounts[name] = account;
          return account;
        },
      }
    );

    let contract = new Contract(contractAccount);
    offchainState?.setContractInstance(contract as any);
    batchReducer?.setContractInstance(contract as any);

    // run test spec to return actions

    let testActions = callback({
      accounts,
      contract: contract as S,
      Local,
    });

    // deploy is the implicit first action
    // TODO: figure out if the contract is already deployed on this instance,
    // and only deploy if it's not

    if (autoDeploy) {
      console.time('deploy');
      await Mina.transaction(sender, () => contract.deploy())
        .sign([sender.key, contractAccount.key])
        .prove()
        .send();
      console.timeEnd('deploy');
    }

    // run actions

    let spec = { localInstance: Local, contractClass: Contract };

    for (let action of testActions) {
      await runAction(spec, action);
    }
  }

  // create local instance and execute test
  // if proofsEnabled is 'both', run the test with AND without proofs

  console.log();
  if (proofsEnabled === 'both' || proofsEnabled === false) {
    if (proofsEnabled === 'both') console.log('(without proofs)');
    const LocalNoProofs = await Mina.LocalBlockchain({ proofsEnabled: false });
    await execute(LocalNoProofs);
  }

  if (proofsEnabled === 'both' || proofsEnabled === true) {
    if (proofsEnabled === 'both') console.log('\n(with proofs)');
    const LocalWithProofs = await Mina.LocalBlockchain({ proofsEnabled: true });
    await execute(LocalWithProofs);
  }
}

async function runAction(
  spec: {
    localInstance: LocalBlockchain;
    contractClass: typeof SmartContract;
  },
  action: TestAction
): Promise<void> {
  let { localInstance, contractClass: Contract } = spec;
  let [sender, contractAccount] = localInstance.testAccounts;

  if (typeof action === 'function') {
    let maybe = await action();
    if (maybe !== undefined) {
      await runAction(spec, maybe);
    }
  } else if (action.type === 'transaction') {
    console.time(action.label);
    let feepayer = action.sender ?? sender;
    let signers = [feepayer.key, ...(action.signers ?? [])];
    let tx = await Mina.transaction(feepayer, action.callback);
    await assertionWithTrace(action.trace, async () => {
      // console.log(action.label, tx.toPretty());
      await tx.sign(signers).prove();
      await tx.send();
    });
    console.timeEnd(action.label);
  } else if (action.type === 'deploy') {
    let { options, trace } = action;
    let account = options?.account ?? contractAccount;
    let contract = options?.contract ?? Contract;
    let instance =
      contract instanceof SmartContract ? contract : new contract(account);

    await runAction(spec, {
      type: 'transaction',
      label: 'deploy',
      callback: () => instance.deploy(),
      trace,
      sender,
      signers: [account.key],
    });
  } else if (action.type === 'expect-state') {
    let { state, expected, trace, label } = action;
    if ('_type' in state) {
      let type = state._type;
      await assertionWithTrace(trace, async () => {
        let actual = Option(type).toValue(await state.get());
        assert.deepStrictEqual(actual, expected, label);
      });
    } else if ('_valueType' in state) {
      let [key, value] = expected;
      let type = state._valueType;
      await assertionWithTrace(trace, async () => {
        let actual = Option(type).toValue(await state.get(key));
        assert.deepStrictEqual(actual, value, label);
      });
    }
  } else if (action.type === 'expect-balance') {
    let { address, expected, label, trace } = action;
    await assertionWithTrace(trace, () => {
      let actual = Mina.getBalance(address).toBigInt();
      assert.deepStrictEqual(actual, expected, label);
    });
  } else {
    throw new Error('unknown action type');
  }
}

// types and helper structures

type MaybePromise<T> = T | Promise<T>;

type BaseTestAction = { type: string; trace?: string; label?: string };

type TestAction =
  | ((...args: any) => MaybePromise<TestAction | void>)
  | (BaseTestAction &
      (
        | {
            type: 'transaction';
            label: string;
            callback: () => Promise<void>;
            sender?: Mina.TestPublicKey;
            signers?: PrivateKey[];
          }
        | {
            type: 'deploy';
            options?: {
              contract?: typeof SmartContract | SmartContract;
              account?: Mina.TestPublicKey;
            };
          }
        | { type: 'expect-state'; state: State; expected: Expected<State> }
        | { type: 'expect-balance'; address: PublicKey; expected: bigint }
      ));

// transaction-like instructions

function transaction(label: string, callback: () => Promise<void>): TestAction {
  let trace = Error().stack?.slice(5);
  return { type: 'transaction', label, callback, trace };
}
transaction.from =
  (sender: Mina.TestPublicKey) =>
  (label: string, callback: () => Promise<void>): TestAction => {
    let trace = Error().stack?.slice(5);
    return { type: 'transaction', label, callback, sender, trace };
  };

function deploy(options?: {
  contract?: SmartContract;
  account?: Mina.TestPublicKey;
}): TestAction {
  let trace = Error().stack?.slice(5);
  return { type: 'deploy', options, trace };
}

// assertion-like instructions

function expectState<S extends State>(
  state: S,
  expected: Expected<S>,
  message?: string
): TestAction {
  let trace = Error().stack?.slice(5);
  return { type: 'expect-state', state, expected, trace, label: message };
}

function expectBalance(
  address: PublicKey | string,
  expected: bigint,
  message?: string
): TestAction {
  let trace = Error().stack?.slice(5);
  return {
    type: 'expect-balance',
    address:
      typeof address === 'string' ? PublicKey.fromBase58(address) : address,
    expected,
    trace,
    label: message,
  };
}

type State = OffchainField<any, any> | OffchainMap<any, any, any>;

type Expected<S extends State> = S extends OffchainField<any, infer V>
  ? V | undefined
  : S extends OffchainMap<infer K, any, infer V>
  ? [K, V | undefined]
  : never;

// error helper

async function assertionWithTrace(trace: string | undefined, fn: () => any) {
  try {
    await fn();
  } catch (err: any) {
    if (trace !== undefined) {
      err.message += `\n\nAssertion was created here:${trace}\n\nError was thrown from here:`;
    }
    throw Error(err.message);
  }
}
