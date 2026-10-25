import { expect } from 'expect';
import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  SmartContract,
  State,
  method,
  state,
} from '../../../index.js';

// Using a callee's `self` after a nested `@method` call must prove.
// Regression for https://github.com/o1-labs/o1js/issues/2920
{
  class Callee extends SmartContract {
    @state(Field) x = State<Field>();

    @method async set(value: Field) {
      this.x.set(value);
    }
  }

  class Caller extends SmartContract {
    @method async run(calleeAddress: PublicKey, value: Field) {
      let callee = new Callee(calleeAddress);
      await callee.set(value);
      callee.self.body.update.appState[0].value.assertEquals(value);
    }
  }

  let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);
  const [sender] = Local.testAccounts;
  const calleeKey = PrivateKey.random();
  const callerKey = PrivateKey.random();
  const callee = new Callee(calleeKey.toPublicKey());
  const caller = new Caller(callerKey.toPublicKey());

  await Callee.compile();
  await Caller.compile();

  let tx = await Mina.transaction(sender, async () => {
    AccountUpdate.fundNewAccount(sender, 2);
    await callee.deploy();
    await caller.deploy();
  });
  await tx.prove();
  await tx.sign([sender.key, calleeKey, callerKey]).send();

  tx = await Mina.transaction(sender, async () => {
    await caller.run(calleeKey.toPublicKey(), Field(42));
  });
  await tx.prove();
  await tx.sign([sender.key]).send();

  expect(callee.x.get()).toEqual(Field(42));
}
