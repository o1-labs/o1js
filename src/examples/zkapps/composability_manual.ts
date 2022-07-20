/**
 * how to do composability "by hand"
 */
import {
  Circuit,
  Experimental,
  Field,
  isReady,
  method,
  Mina,
  Party,
  Permissions,
  Poseidon,
  PrivateKey,
  SmartContract,
  state,
  State,
} from 'snarkyjs';

const doProofs = true;

await isReady;

// contract which can add two numbers and return the result
class CallableAdd extends SmartContract {
  @method add(x: Field, y: Field, blindingValue: Field) {
    // compute result
    let result = x.add(y);

    // store inputs + result in callData
    // the blindingValue is necessary because otherwise, putting this on the transaction would leak information about the private inputs
    this.self.body.callData = Poseidon.hash([blindingValue, x, y, result]);
    return result;
  }
}

let callableKey = PrivateKey.random();
let callableAddress = callableKey.toPublicKey();
console.log('callable address', callableAddress.toBase58());
let callableTokenId = Field.one;

class Caller extends SmartContract {
  @state(Field) sum = State<Field>();
  events = { sum: Field };

  @method callAddAndEmit(x: Field, y: Field) {
    let input: [Field, Field] = [x, y];

    // we have to call this.self to create our party first!
    let thisParty = this.self;

    // witness the result of calling `add`
    let blindingValue = Circuit.witness(Field, () => Field.random());
    let { party, result } = Party.witness<Field>(Field, () => {
      // here we will call the other method
      // let adder = new CallableAdd(callableAddress);
      // let result = adder.add(...input, blindingValue);
      let party = Experimental.createChildParty(thisParty, callableAddress);
      let [x0, y0] = [x.toConstant(), y.toConstant()];
      let result = x0.add(y0);
      // store inputs + result in callData
      // the blindingValue is necessary because otherwise, putting this on the transaction would leak information about the private inputs
      party.body.callData = Poseidon.hash([blindingValue, x0, y0, result]);

      party.lazyAuthorization = {
        kind: 'lazy-proof',
        method: CallableAdd.prototype.add,
        args: [x0, y0],
        previousProofs: [],
        ZkappClass: CallableAdd,
      };

      console.log('address base58', party.body.publicKey.toBase58());
      console.log('address x', party.body.publicKey.g.x + '');

      return { party, result };
    });

    // assert that we really called the right zkapp
    party.body.publicKey.assertEquals(callableAddress);
    party.body.tokenId.assertEquals(callableTokenId);

    // assert that the inputs & outputs we have match what the callee put on its callData
    let callData = Poseidon.hash([blindingValue, ...input, result]);
    party.body.callData.assertEquals(callData);

    // finally, we proved that we called that other zkapp, with the inputs `x`, `y` and the output `result`
    // now we can do anything with the result
    this.emitEvent('sum', result);
    this.sum.set(result);
  }
}

function makeChildParty(parent: Party, child: Party) {
  let otherParties = Mina.currentTransaction()?.parties;
  if (otherParties?.includes(child)) {
    let i = otherParties.indexOf(child);
    otherParties.splice(i, 1);
  }
  child.body.callDepth = parent.body.callDepth + 1;
  child.parent = parent;
  parent.children.push(child);
  return child;
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
  console.log('compile');
  await CallableAdd.compile(callableAddress);
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
console.log('proving');
if (doProofs) await tx.prove();

console.log(tx.toJSON());

tx.send();

console.log('state: ' + zkapp.sum.get());
