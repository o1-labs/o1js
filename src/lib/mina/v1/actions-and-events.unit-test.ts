import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  AccountUpdate,
  Field,
  Mina,
  ProvablePure,
  Reducer,
  SmartContract,
  Struct,
  UInt32,
  method,
} from 'o1js';

type TestSpec = {
  nEvents: number;
  nEventFields: number;
  nActionDispatches: number;
  nUpdates: number;
};

function specToString(t: TestSpec) {
  return `(events: ${t.nEvents}, fields: ${t.nEventFields}, actions: ${t.nActionDispatches}, updates: ${t.nUpdates})`;
}

async function runTest(t: TestSpec, feePayer: Mina.TestPublicKey) {
  const event: ProvablePure<Field> = (() => {
    const entries = [];
    for (let idx = 0; idx < t.nEventFields; idx++) {
      entries.push([`field${idx}`, UInt32]);
    }

    return Object.fromEntries(entries);
  })();
  const constructEvent = () => {
    const entries = [];
    for (let idx = 0; idx < t.nEventFields; idx++) {
      entries.push([`field${idx}`, UInt32.from(idx)]);
    }
    return Object.fromEntries(entries);
  };

  class Event extends Struct(event) {}

  class Contract extends SmartContract {
    events = {
      event: Event,
    };
    reducer = Reducer({
      actionType: UInt32,
    });
    @method async emit() {
      for (let idx = 0; idx < t.nEvents; idx++) {
        this.emitEvent('event', constructEvent());
      }
      for (let idx = 0; idx < t.nActionDispatches; idx++) {
        this.reducer.dispatch(UInt32.from(idx));
      }
    }
  }

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
  {
    const tx = await Mina.transaction(feePayer, async () => {
      for (let idx = 0; idx < t.nUpdates; idx++) {
        await contract.emit();
      }
    });
    await tx.prove();
    await tx.sign([feePayer.key]).send();
  }

  return contract;
}

await describe('table-based testing of actions and events', async () => {
  let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);
  const [feePayer] = Local.testAccounts;

  const tests: TestSpec[] = [
    {
      nEvents: 1,
      nActionDispatches: 1,
      nEventFields: 1,
      nUpdates: 1,
    },
    {
      nEvents: 2,
      nActionDispatches: 0,
      nEventFields: 512,
      nUpdates: 1,
    },
    {
      nEvents: 1,
      nActionDispatches: 0,
      nEventFields: 512,
      nUpdates: 2,
    },
    {
      nActionDispatches: 512,
      nEventFields: 0,
      nEvents: 0,
      nUpdates: 2,
    },
    {
      nEvents: 1024,
      nActionDispatches: 0,
      nEventFields: 1,
      nUpdates: 1,
    },
  ];

  for (const test of tests) {
    await it(`works with spec ${specToString(test)}`, async () => {
      const contract = await runTest(test, feePayer);
      const events = await contract.fetchEvents();
      const actions = await contract.reducer.fetchActions();
      const observedActions = actions.reduce((acc, curr) => {
        return acc + curr.length;
      }, 0);

      const expectedEvents = test.nEvents * test.nUpdates;
      const expectedActions = test.nActionDispatches * test.nUpdates;

      assert(
        events.length == expectedEvents,
        `expected ${expectedEvents} events emitted, received ${events.length} events`
      );
      assert(
        observedActions == expectedActions,
        `expected ${expectedActions} actions dispatched, received ${observedActions} actions dispatched`
      );
    });
  }

  const rejects: TestSpec[] = [
    {
      nEvents: 1025,
      nEventFields: 1,
      nActionDispatches: 0,
      nUpdates: 1,
    },
    {
      nEvents: 0,
      nEventFields: 0,
      nActionDispatches: 1025,
      nUpdates: 1,
    },
    {
      nEvents: 513,
      nEventFields: 1,
      nActionDispatches: 0,
      nUpdates: 2,
    },
    {
      nEvents: 0,
      nEventFields: 0,
      nActionDispatches: 513,
      nUpdates: 2,
    },
    {
      nEvents: 1024,
      nEventFields: 1,
      nActionDispatches: 1,
      nUpdates: 1,
    },
  ];

  for (const test of rejects) {
    await it(`rejects with spec ${specToString(test)}`, async () => {
      await assert.rejects(
        runTest(test, feePayer),
        `spec ${specToString(test)} should violate protocol constraints`
      );
    });
  }
});
