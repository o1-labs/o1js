/**
 * zkApps composability
 */
import { Field, method, Mina, AccountUpdate, SmartContract, state, State } from 'o1js';
import { getProfiler } from '../utils/profiler.js';

const doProofs = true;

// contract which can add 1 to a number
class Incrementer extends SmartContract {
  @method.returns(Field)
  async increment(x: Field) {
    return x.add(1);
  }
}

// contract which can add two numbers, plus 1, and return the result
// incrementing by one is outsourced to another contract (it's cleaner that way, we want to stick to the single responsibility principle)
class Adder extends SmartContract {
  @method.returns(Field)
  async addPlus1(x: Field, y: Field) {
    // compute result
    let sum = x.add(y);
    // call the other contract to increment
    let incrementer = new Incrementer(incrementerAccount);
    return await incrementer.increment(sum);
  }
}

// contract which calls the Adder, stores the result on chain & emits an event
class Caller extends SmartContract {
  @state(Field) sum = State<Field>();
  events = { sum: Field };

  @method
  async callAddAndEmit(x: Field, y: Field) {
    let adder = new Adder(adderAccount);
    let sum = await adder.addPlus1(x, y);
    this.emitEvent('sum', sum);
    this.sum.set(sum);
  }
}

const ComposabilityProfiler = getProfiler('Composability zkApp');
ComposabilityProfiler.start('Composability test flow');
// script to deploy zkapps and do interactions

let Local = await Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);

const [feePayer] = Local.testAccounts;

let incrementerAccount = Mina.TestPublicKey.random();
let incrementer = new Incrementer(incrementerAccount);
let adderAccount = Mina.TestPublicKey.random();
let adder = new Adder(adderAccount);
let callerAccount = Mina.TestPublicKey.random();
let caller = new Caller(callerAccount);

if (doProofs) {
  console.log('compile (incrementer)');
  await Incrementer.compile();
  console.log('compile (adder)');
  await Adder.compile();
  console.log('compile (caller)');
  await Caller.compile();
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer, 3);
  await caller.deploy();
  await adder.deploy();
  await incrementer.deploy();
});
await tx.sign([feePayer.key, callerAccount.key, adderAccount.key, incrementerAccount.key]).send();

console.log('call interaction');
tx = await Mina.transaction(feePayer, async () => {
  // we just call one contract here, nothing special to do
  await caller.callAddAndEmit(Field(5), Field(6));
});
console.log('proving (3 proofs.. can take a bit!)');
await tx.prove();
console.log(tx.toPretty());
await tx.sign([feePayer.key]).send();

// should hopefully be 12 since we added 5 + 6 + 1
console.log('state: ' + caller.sum.get());
ComposabilityProfiler.stop().store();
