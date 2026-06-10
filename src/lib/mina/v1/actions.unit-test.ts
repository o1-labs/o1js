import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AccountUpdate, Mina, Reducer, SmartContract, UInt32, method } from 'o1js';

async function emitNActions(n: number, feePayer: Mina.TestPublicKey) {
  class Contract extends SmartContract {
    reducer = Reducer({
      actionType: UInt32,
    });
    @method async emitActions() {
      for (let idx = 0; idx < n; idx++) {
        this.reducer.dispatch(UInt32.from(1));
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
      await contract.emitActions();
    });
    await tx.prove();
    await tx.sign([feePayer.key]).send();
  }

  const actions = await contract.reducer.fetchActions();
  const previousActions = actions[actions.length - 1];
  assert(
    previousActions.length == n,
    `expected ${n} actions, observed ${previousActions.length} actions`
  );
}

await describe('emitting n actions', async () => {
  let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);
  const [feePayer] = Local.testAccounts;

  await it('should emit 1 action', async () => {
    await emitNActions(1, feePayer);
  });

  await it('should emit 255 actions', async () => {
    await emitNActions(255, feePayer);
  });

  await it('should emit 1024 actions', async () => {
    await emitNActions(1024, feePayer);
  });

  await it('should fail to emit 1025 actions', async () => {
    assert.rejects(async () => {
      await emitNActions(1025, feePayer);
    }, 'actions should be limited');
  });
});
