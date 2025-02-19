/**
 * Framework for testing Mina smart contracts against a local Mina instance.
 */
import { SmartContract } from '../zkapp.js';
import * as Mina from '../mina.js';
import { OffchainField, OffchainMap, OffchainState } from '../actions/offchain-state.js';
import assert from 'assert';
import { Option } from '../../../provable/option.js';
import { BatchReducer } from '../actions/batch-reducer.js';
import { PrivateKey, PublicKey } from '../../../provable/crypto/signature.js';

export { testLocal, transaction, deploy, expectState, expectBalance, TestInstruction };

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
    newAccounts: Record<string, Mina.TestPublicKey>;
    contract: S;
    Local: LocalBlockchain;
  }) => TestInstruction[]
): Promise<LocalBlockchain> {
  // instance-independent setup: compile programs

  batchReducer?.setContractClass(Contract as any);

  if (proofsEnabled) {
    if (offchainState !== undefined) {
      console.time('compile offchain state program');
      await offchainState.compile();
      console.timeEnd('compile offchain state program');
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
    let i = 2;
    let accounts: Record<string, Mina.TestPublicKey> = new Proxy(originalAccounts, {
      get(accounts, name: string) {
        if (name in accounts) return accounts[name];
        let account = Local.testAccounts[i++];
        assert(account !== undefined, 'ran out of test accounts');
        accounts[name] = account;
        return account;
      },
    });

    let newAccounts: Record<string, Mina.TestPublicKey> = new Proxy(
      {},
      {
        get(accounts, name: string) {
          if (name in accounts) return newAccounts[name];
          let account = Mina.TestPublicKey.random();
          newAccounts[name] = account;
          return account;
        },
      }
    );

    let contract = new Contract(contractAccount);
    if (offchainState) {
      (contract as any).offchainState.setContractInstance(contract);
    }
    batchReducer?.setContractInstance(contract as any);

    // run test setup to return instructions
    let instructions = callback({
      accounts,
      newAccounts,
      contract: contract as S,
      Local,
    });

    // deploy is the implicit first instruction (can be disabled with autoDeploy = false)
    // TODO: figure out if the contract is already deployed on Mina instance,
    // and only deploy if it's not
    if (autoDeploy) instructions.unshift(deploy());

    // run instructions
    let spec = { localInstance: Local, contractClass: Contract };

    for (let instruction of instructions) {
      await runInstruction(spec, instruction);
    }
  }

  // create local instance and execute test
  // if proofsEnabled is 'both', run the test with AND without proofs

  console.log();
  let Local = await Mina.LocalBlockchain({ proofsEnabled: false });

  if (proofsEnabled === 'both' || proofsEnabled === false) {
    if (proofsEnabled === 'both') console.log('(without proofs)');
    await execute(Local);
  }

  if (proofsEnabled === 'both' || proofsEnabled === true) {
    if (proofsEnabled === 'both') console.log('\n(with proofs)');
    Local = await Mina.LocalBlockchain({ proofsEnabled: true });
    await execute(Local);
  }

  return Local;
}

async function runInstruction(
  spec: {
    localInstance: LocalBlockchain;
    contractClass: typeof SmartContract;
  },
  instruction: TestInstruction
): Promise<void> {
  let { localInstance, contractClass: Contract } = spec;
  let [sender, contractAccount] = localInstance.testAccounts;

  if (typeof instruction === 'function') {
    let maybe = await instruction();
    if (maybe !== undefined) {
      if (!Array.isArray(maybe)) maybe = [maybe];
      for (let instruction of maybe) await runInstruction(spec, instruction);
    }
  } else if (instruction.type === 'transaction') {
    console.time(instruction.label);
    let feepayer = instruction.sender ?? sender;
    let signers = [feepayer.key, ...(instruction.signers ?? [])];
    let tx = await Mina.transaction(feepayer, instruction.callback);
    await assertionWithTracePreferInner(instruction.trace, async () => {
      // console.log(instruction.label, tx.toPretty());
      await tx.sign(signers).prove();
      await tx.send();
    });
    console.timeEnd(instruction.label);
  } else if (instruction.type === 'deploy') {
    let { options, trace } = instruction;
    let account = options?.account ?? contractAccount;
    let contract = options?.contract ?? Contract;
    let instance = contract instanceof SmartContract ? contract : new contract(account);

    await runInstruction(spec, {
      type: 'transaction',
      label: 'deploy',
      callback: () => instance.deploy(),
      trace,
      sender,
      signers: [account.key],
    });
  } else if (instruction.type === 'expect-state') {
    let { state, expected, trace, label } = instruction;
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
  } else if (instruction.type === 'expect-balance') {
    let { address, expected, label, trace } = instruction;
    await assertionWithTrace(trace, () => {
      let actual = Mina.getBalance(address).toBigInt();
      assert.deepStrictEqual(actual, expected, label);
    });
  } else {
    throw new Error('Unknown test instruction type');
  }
}

// types and helper structures

type MaybePromise<T> = T | Promise<T>;

type BaseInstruction = { type: string; trace?: string; label?: string };

type TestInstruction =
  | ((...args: any) => MaybePromise<TestInstruction | TestInstruction[] | void>)
  | (BaseInstruction &
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

function transaction(label: string, callback: () => Promise<void>): TestInstruction {
  let trace = Error().stack?.slice(5);
  return { type: 'transaction', label, callback, trace };
}
transaction.from =
  (sender: Mina.TestPublicKey) =>
  (label: string, callback: () => Promise<void>): TestInstruction => {
    let trace = Error().stack?.slice(5);
    return { type: 'transaction', label, callback, sender, trace };
  };

function deploy(options?: {
  contract?: SmartContract;
  account?: Mina.TestPublicKey;
}): TestInstruction {
  let trace = Error().stack?.slice(5);
  return { type: 'deploy', options, trace };
}

// assertion-like instructions

function expectState<S extends State>(
  state: S,
  expected: Expected<S>,
  message?: string
): TestInstruction {
  let trace = Error().stack?.slice(5);
  return { type: 'expect-state', state, expected, trace, label: message };
}

function expectBalance(
  address: PublicKey | string,
  expected: bigint,
  message?: string
): TestInstruction {
  let trace = Error().stack?.slice(5);
  return {
    type: 'expect-balance',
    address: typeof address === 'string' ? PublicKey.fromBase58(address) : address,
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
    if (trace === undefined) throw err;

    let message = err.message;
    throw Error(`${message}\n\nAssertion was created here:${trace}\n\nError was thrown from here:`);
  }
}

async function assertionWithTracePreferInner(trace: string | undefined, fn: () => any) {
  try {
    await fn();
  } catch (err: any) {
    if (trace === undefined) throw err;

    // note: overwriting the message doesn't work with all errors and I don't know why.
    // we call this function, rather than `assertionWithInner()`, when we're ok with not having the added message,
    // and prefer preserving the original stack trace at all costs
    err.message = `${err.message}\n\nError was thrown from here:${trace}\n\nAssertion was created here:`;
    throw err;
  }
}
