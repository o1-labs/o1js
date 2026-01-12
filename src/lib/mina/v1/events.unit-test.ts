import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AccountUpdate, Mina, SmartContract, Struct, UInt32, method } from 'o1js';

class Event extends Struct({
  field: UInt32,
}) {}

async function emitNEvents(n: number, feePayer: Mina.TestPublicKey) {
  class Contract extends SmartContract {
    events = {
      event: Event,
    };

    @method async emitEvents() {
      for (let idx = 0; idx < n; idx++) {
        this.emitEvent('event', {
          field: UInt32.from(1),
        });
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
      await contract.emitEvents();
    });
    await tx.prove();
    await tx.sign([feePayer.key]).send();
  }

  const events = await contract.fetchEvents();
  assert(events.length == n, 'the events emitted should match the number of events requested');
}

await describe('emitting n events', async () => {
  let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);
  const [feePayer] = Local.testAccounts;

  await it('should emit 1 event', async () => {
    await emitNEvents(1, feePayer);
  });

  await it('should emit 255 events', async () => {
    await emitNEvents(255, feePayer);
  });

  await it('should emit 1024 events', async () => {
    await emitNEvents(1024, feePayer);
  });

  await it('should fail to emit 1025 events', async () => {
    assert.rejects(async () => {
      await emitNEvents(1025, feePayer);
    }, 'events should be limited');
  });
});

