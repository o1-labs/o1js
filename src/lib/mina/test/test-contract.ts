import { SmartContract } from '../zkapp.js';
import * as Mina from '../mina.js';
import { OffchainField, OffchainState } from '../actions/offchain-state.js';
import assert from 'assert';
import { Option } from '../../provable/option.js';

export { testLocal, transaction, expectState };

async function testLocal<S extends SmartContract>(
  Contract: typeof SmartContract & (new (...args: any) => S),
  {
    proofsEnabled,
    offchainState,
  }: { proofsEnabled: boolean; offchainState?: OffchainState<any> },
  callback: (input: {
    accounts: Record<string, Mina.TestPublicKey>;
    contract: S;
    Local: Awaited<ReturnType<typeof Mina.LocalBlockchain>>;
  }) => TestAction[]
) {
  const Local = await Mina.LocalBlockchain({ proofsEnabled });
  Mina.setActiveInstance(Local);

  let [sender, contractAccount] = Local.testAccounts;

  let accounts: Record<string, Mina.TestPublicKey> = new Proxy(
    { sender, contractAccount },
    {
      get(accounts, name) {
        if (name in accounts) return (accounts as any)[name];
        let account = Mina.TestPublicKey.random();
        (accounts as any)[name] = account;
        return account;
      },
    }
  );

  let contract = new Contract(contractAccount);
  offchainState?.setContractInstance(contract as any);

  if (proofsEnabled) {
    if (offchainState !== undefined) {
      console.time('compile program');
      await offchainState.compile();
      console.timeEnd('compile program');
    }
    console.time('compile contract');
    await Contract.compile();
    console.timeEnd('compile contract');
  }

  // deploy

  console.time('deploy');
  await Mina.transaction(sender, async () => {
    await contract.deploy();
  })
    .sign([sender.key, contractAccount.key])
    .prove()
    .send();
  console.timeEnd('deploy');

  // run test spec to return actions

  let testActions = callback({
    accounts,
    contract: contract as S,
    Local,
  });

  // run actions

  async function runAction(action: TestAction): Promise<void> {
    if (typeof action === 'function') {
      let maybe = await action();
      if (maybe !== undefined) {
        await runAction(maybe);
      }
    } else if (action.type === 'transaction') {
      console.time(action.label);
      await Mina.transaction(sender, action.callback)
        .sign([sender.key])
        .prove()
        .send();
      console.timeEnd(action.label);
    } else if (action.type === 'expect-state') {
      let { state, expected, message } = action;
      let actual = Option(state._type).toValue(await state.get());
      assert.deepStrictEqual(actual, expected, message);
    } else {
      throw new Error('unknown action type');
    }
  }

  for (let action of testActions) {
    await runAction(action);
  }
}

// types and helper structures

type MaybePromise<T> = T | Promise<T>;

type TestAction =
  | ((...args: any) => MaybePromise<TestAction | void>)
  | { type: 'transaction'; label: string; callback: () => Promise<void> }
  | {
      type: 'expect-state';
      state: State;
      expected: Expected<State>;
      message?: string;
    };

function transaction(label: string, callback: () => Promise<void>): TestAction {
  return { type: 'transaction', label, callback };
}

function expectState<State extends OffchainField<any, any>>(
  state: State,
  expected: Expected<State>,
  message?: string
): TestAction {
  return { type: 'expect-state', state, expected, message };
}

type State = OffchainField<any, any>;

type Expected<S extends State> = S extends OffchainField<any, infer V>
  ? V | undefined
  : never;
