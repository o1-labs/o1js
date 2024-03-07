/**
 * zkApps composability
 */
import {
  Field,
  isReady,
  method,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
  state,
  State,
} from 'o1js';
import { getProfiler } from '../utils/profiler.js';

const doProofs = true;

await isReady;

// contract which can add 1 to a number
class Incrementer extends SmartContract {
  @method increment(x: Field): Field {
    return x.add(1);
  }
}

// contract which can add two numbers, plus 1, and return the result
// incrementing by one is outsourced to another contract (it's cleaner that way, we want to stick to the single responsibility principle)
class Adder extends SmartContract {
  @method addPlus1(x: Field, y: Field): Field {
    // compute result
    let sum = x.add(y);
    // call the other contract to increment
    let incrementer = new Incrementer(incrementerAddress);
    return incrementer.increment(sum);
  }
}

// contract which calls the Adder, stores the result on chain & emits an event
class Caller extends SmartContract {
  @state(Field) sum = State<Field>();
  events = { sum: Field };

  @method callAddAndEmit(x: Field, y: Field) {
    let adder = new Adder(adderAddress);
    let sum = adder.addPlus1(x, y);
    this.emitEvent('sum', sum);
    this.sum.set(sum);
  }
}

const ComposabilityProfiler = getProfiler('Composability zkApp');
ComposabilityProfiler.start('Composability test flow');
// script to deploy zkapps and do interactions

let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayerKey = Local.testAccounts[0].privateKey;
let feePayer = Local.testAccounts[0].publicKey;

// the first contract's address
let incrementerKey = PrivateKey.random();
let incrementerAddress = incrementerKey.toPublicKey();
// the second contract's address
let adderKey = PrivateKey.random();
let adderAddress = adderKey.toPublicKey();
// the third contract's address
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let zkapp = new Caller(zkappAddress);
let adderZkapp = new Adder(adderAddress);
let incrementerZkapp = new Incrementer(incrementerAddress);

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
  // TODO: enable funding multiple accounts properly
  AccountUpdate.fundNewAccount(feePayer, 3);
  zkapp.deploy();
  adderZkapp.deploy();
  incrementerZkapp.deploy();
});
await tx.sign([feePayerKey, zkappKey, adderKey, incrementerKey]).send();

console.log('call interaction');
tx = await Mina.transaction(feePayer, async () => {
  // we just call one contract here, nothing special to do
  zkapp.callAddAndEmit(Field(5), Field(6));
});
console.log('proving (3 proofs.. can take a bit!)');
await tx.prove();
console.log(tx.toPretty());
await tx.sign([feePayerKey]).send();

// should hopefully be 12 since we added 5 + 6 + 1
console.log('state: ' + zkapp.sum.get());
ComposabilityProfiler.stop().store();
