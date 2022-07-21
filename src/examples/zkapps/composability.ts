/**
 * zkApps composability
 */
import {
  Experimental,
  Field,
  isReady,
  method,
  Mina,
  Party,
  Permissions,
  PrivateKey,
  SmartContract,
  state,
  State,
} from 'snarkyjs';

const doProofs = true;

await isReady;

// contract which can add two numbers and return the result
class CallableAdd extends SmartContract {
  @method add(x: Field, y: Field, _blindingValue: Field): Field {
    // compute result
    return x.add(y);
  }
}

let callableKey = PrivateKey.random();
let callableAddress = callableKey.toPublicKey();

class Caller extends SmartContract {
  @state(Field) sum = State<Field>();
  events = { sum: Field };

  @method callAddAndEmit(x: Field, y: Field) {
    let blindingValue = Experimental.memoizeWitness(Field, () =>
      Field.random()
    );
    let adder = new CallableAdd(callableAddress);
    let sum = adder.add(x, y, blindingValue);
    this.emitEvent('sum', sum);
    this.sum.set(sum);
  }
}

// script to deploy zkapps and do interactions

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let zkapp = new Caller(zkappAddress);
let callableZkapp = new CallableAdd(callableAddress);

if (doProofs) {
  console.log('compile (caller)');
  await CallableAdd.compile(callableAddress);
  console.log('compile (callee)');
  await Caller.compile(zkappAddress);
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer, { initialBalance: Mina.accountCreationFee() });
  zkapp.deploy({ zkappKey });
  zkapp.setPermissions({
    ...Permissions.default(),
    editState: Permissions.proofOrSignature(),
  });
  callableZkapp.deploy({ zkappKey: callableKey });
});
tx.send();

console.log('call interaction');
tx = await Mina.transaction(feePayer, () => {
  zkapp.callAddAndEmit(Field(5), Field(6));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) {
  console.log('proving (2 proofs: caller + callee)');
  await tx.prove();
}

console.dir(JSON.parse(tx.toJSON()), { depth: 5 });

tx.send();

console.log('state: ' + zkapp.sum.get());
