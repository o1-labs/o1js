import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AccountUpdate, Field, Mina, SmartContract, declareState, method } from 'o1js';

type TestSpec = {
  nAppStateFields: number;
};

function specToString(t: TestSpec) {
  return `(fields: ${t.nAppStateFields})`;
}

async function runTest(t: TestSpec, feePayer: Mina.TestPublicKey) {
  class Contract extends SmartContract {
    @method async noop() {}
  }

  const entries = [];
  for (let idx = 0; idx < t.nAppStateFields; idx++) {
    entries.push([`field${idx}`, Field]);
  }
  const fields = Object.fromEntries(entries);
  declareState(Contract, fields);

  const contractAccount = Mina.TestPublicKey.random();
  const contract = new Contract(contractAccount);
  await Contract.compile();
  {
    const tx = await Mina.transaction(feePayer, async () => {
      AccountUpdate.fundNewAccount(feePayer);
      await contract.deploy();
    });
    await tx.sign([feePayer.key, contractAccount.key]).send();
  }

  return contract;
}

await describe('app state updates', async () => {
  let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);
  const [feePayer] = Local.testAccounts;

  const tests: TestSpec[] = [
    {
      nAppStateFields: 1,
    },
    {
      nAppStateFields: 8,
    },
    {
      nAppStateFields: 32,
    },
  ];

  for (const test of tests) {
    await it(`should succeed with spec: ${specToString(test)}`, async () => {
      await assert.doesNotReject(async () => {
        await runTest(test, feePayer);
      }, 'the contract should deploy properly');
    });
  }

  const rejects: TestSpec[] = [
    {
      nAppStateFields: 33,
    },
  ];
  for (const test of rejects) {
    await it(`should reject with spec: ${specToString(test)}`, async () => {
      await assert.rejects(async () => {
        await runTest(test, feePayer);
      });
    });
  }
});
