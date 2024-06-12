import { SmartContract } from '../zkapp.js';
import * as Mina from '../mina.js';
import { OffchainState } from '../actions/offchain-state.js';

export { testLocal, transaction };

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

  for (let action of testActions) {
    if (typeof action === 'function') {
      await action();
    } else if (action.type === 'transaction') {
      console.time(action.label);
      await Mina.transaction(sender, action.callback)
        .sign([sender.key])
        .prove()
        .send();
      console.timeEnd(action.label);
    }
  }
}

// types and helper structures

type TestAction =
  | ((...args: any) => any)
  | { type: 'transaction'; label: string; callback: () => Promise<void> };

function transaction(label: string, callback: () => Promise<void>): TestAction {
  return { type: 'transaction', label, callback };
}
