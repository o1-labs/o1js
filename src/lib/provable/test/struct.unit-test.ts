import { Struct } from '../types/struct.js';
import { provable } from '../types/provable-derivers.js';
import { Unconstrained } from '../types/unconstrained.js';
import { UInt32 } from '../int.js';
import { PrivateKey, PublicKey } from '../crypto/signature.js';
import { expect } from 'expect';
import { method, SmartContract } from '../../mina/v1/zkapp.js';
import { LocalBlockchain, setActiveInstance, transaction } from '../../mina/v1/mina.js';
import { State, state } from '../../mina/v1/state.js';
import { AccountUpdate } from '../../mina/v1/account-update.js';
import { Provable } from '../provable.js';
import { Field } from '../wrapped.js';
import { Bool } from '../bool.js';
import assert from 'assert/strict';
import { FieldType } from '../core/fieldvar.js';
import { From } from '../../../bindings/lib/provable-generic.js';
import { Group } from '../group.js';
import { modifiedField } from '../types/fields.js';
import { createForeignField } from '../foreign-field.js';
import { Field3 } from '../gadgets/foreign-field.js';

let type = provable({
  nested: { a: Number, b: Boolean },
  other: String,
  pk: { provable: PublicKey },
  bool: { provable: Bool },
  uint: [UInt32, UInt32],
});

let value = {
  nested: { a: 1, b: true },
  other: 'arbitrary data!!!',
  pk: PublicKey.empty(),
  bool: new Bool(true),
  uint: [UInt32.one, UInt32.from(2)],
};
let original = JSON.stringify(value);

// sizeInFields
expect(type.sizeInFields()).toEqual(5);

// toFields
// note that alphabetical order of keys determines ordering here and elsewhere
let fields = type.toFields(value);
expect(fields).toEqual([Field(0), Field(0), Field(1), Field(1), Field(2)]);

// toAuxiliary
let aux = type.toAuxiliary(value);
expect(aux).toEqual([[[1], [true]], ['arbitrary data!!!'], [], [], [[], []]]);

// toInput
let input = type.toInput(value);
expect(input).toEqual({
  fields: [Field(0)],
  packed: [
    [Field(0), 1],
    [Field(1), 1],
    [Field(1), 32],
    [Field(2), 32],
  ],
});

// toJSON
expect(type.toJSON(value)).toEqual({
  nested: { a: 1, b: true },
  other: 'arbitrary data!!!',
  pk: PublicKey.toBase58(PublicKey.empty()),
  bool: true,
  uint: ['1', '2'],
});

// fromFields
let restored = type.fromFields(fields, aux);
expect(JSON.stringify(restored)).toEqual(original);

// toValue, fromValue
let jsValue = type.toValue(value);
expect(jsValue).toEqual({
  nested: { a: 1, b: true },
  other: 'arbitrary data!!!',
  pk: { x: 0n, isOdd: false },
  bool: true,
  uint: [1n, 2n],
});

expect(type.fromValue(jsValue)).toEqual(value);

// empty
let empty = type.empty();
expect(empty).toEqual({
  nested: { a: 0, b: false },
  other: '',
  pk: PublicKey.empty(),
  bool: new Bool(false),
  uint: [UInt32.zero, UInt32.zero],
});

// empty with Group
expect(provable({ value: Group }).empty()).toEqual({ value: Group.zero });

// fails with a clear error on input without an empty method
const FieldWithoutEmpty = modifiedField({});
delete (FieldWithoutEmpty as any).empty;
expect(() => provable({ value: FieldWithoutEmpty }).empty()).toThrow(
  'Expected `empty()` method on anonymous type object'
);

// check
await Provable.runAndCheck(() => {
  type.check(value);
});

// should fail `check` if `check` of subfields doesn't pass

// manually construct an invalid uint32
let noUint32 = new UInt32(1);
noUint32.value = Field(-1);

await expect(() =>
  Provable.runAndCheck(() => {
    Provable.witness(type, () => ({
      ...value,
      uint: [UInt32.zero, noUint32],
    }));
  })
).rejects.toThrow('Constraint unsatisfied');

// toCanonical

const p = Field.ORDER;

class MyField extends createForeignField(p) {}
class Point extends Struct({ x: MyField.provable, y: MyField.provable }) {}

let x = new MyField(Field3.from(p + 1n));
let y = new MyField(Field3.from(p + 2n));
let nonCanonical = new Point({ x, y });
let canonical = Provable.toCanonical(Point, nonCanonical);

let expected = new Point({ x: new MyField(1n), y: new MyField(2n) });
expect(nonCanonical).not.toEqual(expected);
expect(canonical).toEqual(expected);

// class version of `provable`
class MyStruct extends Struct({
  nested: { a: Number, b: Boolean },
  other: String,
  pk: PublicKey,
  uint: [UInt32, { provable: UInt32 }],
}) {}

class MyStructPure extends Struct({
  nested: { a: Field, b: UInt32 },
  other: Field,
  pk: PublicKey,
  uint: [UInt32, { provable: UInt32 }],
}) {}

// Struct.fromValue() works on both js and provable inputs

let myStructInput = {
  nested: { a: Field(1), b: 2n },
  other: 3n,
  pk: { x: 4n, isOdd: true },
  uint: [100n, UInt32.zero],
};
let myStruct = MyStructPure.fromValue(myStructInput);

type FlexibleStruct = From<typeof MyStructPure>;
myStruct satisfies FlexibleStruct;
myStructInput satisfies FlexibleStruct;

expect(myStruct).toBeInstanceOf(MyStructPure);
expect(MyStructPure.toValue(myStruct)).toEqual({
  nested: { a: 1n, b: 2n },
  other: 3n,
  pk: { x: 4n, isOdd: true },
  uint: [100n, 0n],
});

let myStruct2 = MyStructPure.fromValue(myStruct);
expect(myStruct2).toBeInstanceOf(MyStructPure);
expect(myStruct2).toEqual(myStruct);

class MyTuple extends Struct([PublicKey, String]) {}

// create a smart contract and pass auxiliary data to a method

let targetString = 'some particular string';
let targetBigint = 99n;
let gotTargetString = false;

class MyContract extends SmartContract {
  // this is correctly rejected by the compiler -- on-chain state can't have stuff like strings in it
  // @state(MyStruct) y = State<MyStruct>();

  // this works because MyStructPure only contains field elements
  @state(MyStructPure) x = State<MyStructPure>();

  @method async myMethod(
    value: MyStruct,
    tuple: MyTuple,
    update: AccountUpdate,
    unconstrained: Unconstrained<bigint>
  ) {
    // check if we can pass in string values
    if (value.other === targetString) gotTargetString = true;
    value.uint[0].assertEquals(UInt32.zero);

    // cannot access unconstrained values in provable code
    if (Provable.inCheckedComputation())
      expect(() => unconstrained.get()).toThrow(
        'You cannot use Unconstrained.get() in provable code.'
      );

    Provable.asProver(() => {
      let err = 'wrong value in prover';
      assert.equal(tuple[1], targetString, err);

      // check if we can pass in account updates
      if (update.lazyAuthorization?.kind !== 'lazy-signature') throw Error(err);

      // check if we can pass in unconstrained values
      if (unconstrained.get() !== targetBigint) throw Error(err);
    });

    // mixed witness generation
    let pk = Provable.witness(PublicKey, () => ({ x: Field(5), isOdd: true }));
    let struct = Provable.witness(MyStructPure, () => ({
      nested: { a: Field(0), b: 1n },
      other: 0n,
      pk: PublicKey.empty(),
      uint: [UInt32.zero, 1n],
    }));

    if (Provable.inCheckedComputation()) {
      assert(pk.x.value[0] === FieldType.Var, 'pk is a variable');
      assert(pk.isOdd.value[0] === FieldType.Var, 'pk is a variable');
    }

    Provable.asProver(() => {
      assert.equal(pk.x.toBigInt(), 5n, 'pk.x');
      assert.equal(pk.isOdd.toBoolean(), true, 'pk.isOdd');

      assert.equal(struct.nested.a.toBigInt(), 0n, 'struct.nested.a');
      assert.equal(struct.uint[0].toBigint(), 0n, 'struct.uint');
      assert.equal(struct.uint[1].toBigint(), 1n, 'struct.uint');
    });
  }
}

setActiveInstance(await LocalBlockchain());

await MyContract.compile();
let key = PrivateKey.random();
let address = key.toPublicKey();
let contract = new MyContract(address);

let tx = await transaction(async () => {
  let accountUpdate = AccountUpdate.createSigned(address);

  await contract.myMethod(
    {
      nested: { a: 1, b: false },
      other: targetString,
      pk: PublicKey.empty(),
      uint: [UInt32.from(0), UInt32.from(10)],
    },
    [address, targetString],
    accountUpdate,
    Unconstrained.from(targetBigint)
  );
});

gotTargetString = false;

await tx.prove();

// assert that prover got the target string
expect(gotTargetString).toEqual(true);

// Having `Struct` as a property is not allowed
class InvalidStruct extends Struct({
  inner: Struct,
}) {}

expect(() => {
  let invalidStruct = new InvalidStruct({
    inner: MyStruct.empty(),
  });
  InvalidStruct.check(invalidStruct);
}).toThrow();

console.log('provable types work as expected! 🎉');
