import { SmartContract } from '../zkapp.js';
import * as Mina from '../mina.js';

export { testLocal };

async function testLocal<S extends SmartContract>(
  Contract: typeof SmartContract & (new (...args: any) => S),
  { proofsEnabled }: { proofsEnabled: boolean },
  callback: (input: {
    accounts: Record<string, Mina.TestPublicKey>;
    contract: S;
    Local: Awaited<ReturnType<typeof Mina.LocalBlockchain>>;
  }) => Promise<void>
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

  if (proofsEnabled) {
    console.time('compile contract');
    await Contract.compile();
    console.timeEnd('compile contract');
  }

  callback({ accounts, contract: contract as S, Local });
}
