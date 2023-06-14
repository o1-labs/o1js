import { provable, Struct } from './circuit_value.js';
import { UInt32 } from './int.js';
import { PrivateKey, PublicKey } from './signature.js';
import { expect } from 'expect';
import { method, SmartContract } from './zkapp.js';
import { LocalBlockchain, setActiveInstance, transaction } from './mina.js';
import { State, state } from './state.js';
import { AccountUpdate } from './account_update.js';
import { Provable } from './provable.js';
import { Field } from './core.js';

let type = provable({
  nested: { a: Number, b: Boolean },
  other: String,
  pk: PublicKey,
  uint: [UInt32, UInt32],
});

let value = {
  nested: { a: 1, b: true },
  other: 'arbitrary data!!!',
  pk: PublicKey.empty(),
  uint: [UInt32.one, UInt32.from(2)],
};
let original = JSON.stringify(value);

// sizeInFields
expect(type.sizeInFields()).toEqual(4);

// toFields
// note that alphabetical order of keys determines ordering here and elsewhere
let fields = type.toFields(value);
expect(fields).toEqual([Field(0), Field(0), Field(1), Field(2)]);

// toAuxiliary
let aux = type.toAuxiliary(value);
expect(aux).toEqual([[[1], [true]], ['arbitrary data!!!'], [], [[], []]]);

// toInput
let input = type.toInput(value);
expect(input).toEqual({
  fields: [Field(0)],
  packed: [
    [Field(0), 1],
    [Field(1), 32],
    [Field(2), 32],
  ],
});

// toJSON
expect(type.toJSON(value)).toEqual({
  nested: { a: 1, b: true },
  other: 'arbitrary data!!!',
  pk: PublicKey.toBase58(PublicKey.empty()),
  uint: ['1', '2'],
});

// fromFields
let restored = type.fromFields(fields, aux);
expect(JSON.stringify(restored)).toEqual(original);

// check
Provable.runAndCheck(() => {
  type.check(value);
});

// should fail `check` if `check` of subfields doesn't pass
expect(() =>
  Provable.runAndCheck(() => {
    let x = Provable.witness(type, () => ({
      ...value,
      uint: [
        UInt32.zero,
        // invalid Uint32
        new UInt32(Field(-1)),
      ],
    }));
  })
).toThrow(`Constraint unsatisfied`);

// class version of `provable`
class MyStruct extends Struct({
  nested: { a: Number, b: Boolean },
  other: String,
  pk: PublicKey,
  uint: [UInt32, UInt32],
}) {}

class MyStructPure extends Struct({
  nested: { a: Field, b: UInt32 },
  other: Field,
  pk: PublicKey,
  uint: [UInt32, UInt32],
}) {}

class MyTuple extends Struct([PublicKey, String]) {}

let targetString = 'some particular string';
let gotTargetString = false;

// create a smart contract and pass auxiliary data to a method
class MyContract extends SmartContract {
  // this is correctly rejected by the compiler -- on-chain state can't have stuff like strings in it
  // @state(MyStruct) y = State<MyStruct>();

  // this works because MyStructPure only contains field elements
  @state(MyStructPure) x = State<MyStructPure>();

  @method myMethod(value: MyStruct, tuple: MyTuple, update: AccountUpdate) {
    // check if we can pass in string values
    if (value.other === targetString) gotTargetString = true;
    value.uint[0].assertEquals(UInt32.zero);

    Provable.asProver(() => {
      let err = 'wrong value in prover';
      if (tuple[1] !== targetString) throw Error(err);

      // check if we can pass in account updates
      if (update.lazyAuthorization?.kind !== 'lazy-signature') throw Error(err);
      if (update.lazyAuthorization.privateKey?.toBase58() !== key.toBase58())
        throw Error(err);
    });
  }
}

setActiveInstance(LocalBlockchain());

await MyContract.compile();
let key = PrivateKey.random();
let address = key.toPublicKey();
let contract = new MyContract(address);

let tx = await transaction(() => {
  let accountUpdate = AccountUpdate.createSigned(key);

  contract.myMethod(
    {
      nested: { a: 1, b: false },
      other: targetString,
      pk: PublicKey.empty(),
      uint: [UInt32.from(0), UInt32.from(10)],
    },
    [address, targetString],
    accountUpdate
  );
});

gotTargetString = false;

await tx.prove();

// assert that prover got the target string
expect(gotTargetString).toEqual(true);

console.log('provable types work as expected! 🎉');
