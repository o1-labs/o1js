import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  AccountUpdate,
  Field,
  Mina,
  PublicKey,
  SmartContract,
  State,
  declareState,
  method,
} from 'o1js';

type TestSpec = {
  nAppStateFields: number;
  expectsToReject?: boolean;
};

function specToString(t: TestSpec) {
  return `(fields: ${t.nAppStateFields})`;
}

async function runTest(t: TestSpec, feePayer: Mina.TestPublicKey) {
  const nFields = t.nAppStateFields;

  class Contract extends SmartContract {
    constructor(address: PublicKey) {
      super(address);
      // init State() for each field in constructor
      for (let idx = 0; idx < nFields; idx++) {
        (this as any)[`field${idx}`] = State<Field>();
      }
    }

    @method async updateAllFields() {
      for (let idx = 0; idx < nFields; idx++) {
        const state = (this as any)[`field${idx}`] as State<Field>;
        // set each field to idx + 1 (non-zero values)
        state.set(Field(idx + 1));
      }
    }
  }

  // dynamically declare state fields
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

  // update all state fields with non-zero values
  {
    const tx = await Mina.transaction(feePayer, async () => {
      await contract.updateAllFields();
    });
    await tx.prove();
    await tx.sign([feePayer.key]).send();
  }

  // verify all state fields have the expected values
  const account = Mina.getAccount(contractAccount);
  for (let idx = 0; idx < t.nAppStateFields; idx++) {
    const expectedValue = Field(idx + 1);
    const actualValue = account.zkapp!.appState[idx];
    assert.deepStrictEqual(
      actualValue.toBigInt(),
      expectedValue.toBigInt(),
      `field${idx} should be ${idx + 1}`
    );
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
    {
      nAppStateFields: 33,
      expectsToReject: true,
    },
    {
      nAppStateFields: 64,
      expectsToReject: true,
    },
  ];

  for (const test of tests) {
    await it(`should succeed with spec: ${specToString(test)}`, async () => {
      if (test.expectsToReject) {
        await assert.rejects(async () => {
          await runTest(test, feePayer);
        }, 'the contract should not deploy properly');
      } else {
        await assert.doesNotReject(async () => {
          await runTest(test, feePayer);
        }, 'the contract should deploy properly');
      }
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
