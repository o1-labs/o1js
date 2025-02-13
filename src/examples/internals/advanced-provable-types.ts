/**
 * This example explains some inner workings of provable types at the hand of a particularly
 * complex type: `AccountUpdate`.
 */
import assert from 'assert/strict';
import { AccountUpdate, PrivateKey, Provable, Empty, ProvableExtended } from 'o1js';
import { expect } from 'expect';

/**
 * Example of a complex provable type: `AccountUpdate`
 */
AccountUpdate satisfies Provable<AccountUpdate>;
console.log(`an account update has ${AccountUpdate.sizeInFields()} fields`);

let address = PrivateKey.random().toPublicKey();
let accountUpdate = AccountUpdate.default(address);
accountUpdate.body.callDepth = 5;
accountUpdate.lazyAuthorization = { kind: 'lazy-signature' };

/**
 * Every provable type can be disassembled into its provable/in-circuit part (fields)
 * and a non-provable part (auxiliary).
 *
 * The parts can be assembled back together to create a new object which is deeply equal to the old one.
 */
let fields = AccountUpdate.toFields(accountUpdate);
let aux = AccountUpdate.toAuxiliary(accountUpdate);
let accountUpdateRecovered = AccountUpdate.fromFields(fields, aux);
expect(accountUpdateRecovered.body).toEqual(accountUpdate.body);
expect(accountUpdateRecovered.lazyAuthorization).toEqual(accountUpdate.lazyAuthorization);

/**
 * Provable types which implement `ProvableExtended` can also be serialized to/from JSON.
 *
 * However, `AccountUpdate` specifically is a wrapper around an actual, core provable extended type.
 * It has additional properties, like lazySignature, which are not part of the JSON representation
 * and therefore aren't recovered.
 */
AccountUpdate satisfies ProvableExtended<AccountUpdate>;
let json = AccountUpdate.toJSON(accountUpdate);
accountUpdateRecovered = AccountUpdate.fromJSON(json);
expect(accountUpdateRecovered.body).toEqual(accountUpdate.body);
expect(accountUpdateRecovered.lazyAuthorization).not.toEqual(accountUpdate.lazyAuthorization);

/**
 * Provable.runAndCheck() can be used to run a circuit in "prover mode".
 * That means
 * -) witness() and asProver() blocks are executed
 * -) constraints are checked; failing assertions throw an error
 */
await Provable.runAndCheck(() => {
  /**
   * Provable.witness() is used to introduce all values to the circuit which are not hard-coded constants.
   *
   * Under the hood, it disassembles and reassembles the provable type with toFields(), toAuxiliary() and fromFields().
   */
  let accountUpdateWitness = Provable.witness(AccountUpdate, () => accountUpdate);

  /**
   * The witness is "provably equal" to the original.
   * (this, under hood, calls assertEqual on all fields returned by .toFields()).
   */
  Provable.assertEqual(AccountUpdate, accountUpdateWitness, accountUpdate);

  /**
   * Auxiliary parts are also recovered in the witness.
   * Note, though, that this can't be enforced as part of a proof!
   */
  assert(
    accountUpdateWitness.body.callDepth === 5,
    'when witness block is executed, witness() recreates auxiliary parts of provable type'
  );
  Provable.assertEqual(
    PrivateKey,
    (accountUpdateWitness.lazyAuthorization as any).privateKey,
    (accountUpdate.lazyAuthorization as any).privateKey
  );
});

/**
 * Provable.constraintSystem() runs the circuit in "compile mode".
 * -) witness() and asProver() blocks are not executed
 * -) fields don't have actual values attached to them; they're purely abstract variables
 * -) constraints are not checked
 */
let result = await Provable.constraintSystem(() => {
  /**
   * In compile mode, witness() returns
   * - abstract variables without values for fields
   * - dummy data for auxiliary
   */
  let accountUpdateWitness = Provable.witness(AccountUpdate, (): AccountUpdate => {
    throw 'not executed anyway';
  });

  /**
   * Dummy data can take a different form depending on the provable type,
   * but in most cases it's "all-zeroes"
   */
  assert(
    accountUpdateWitness.body.callDepth === 0,
    'when witness block is not executed, witness() returns dummy data'
  );
  Provable.assertEqual(AccountUpdate, accountUpdateWitness, accountUpdate);
});

/**
 * Provable.constraintSystem() is a great way to investigate how many constraints operations take.
 *
 * Note that even just witnessing stuff takes constraints, for provable types which define a check() method.
 * Bools are proved to be 0 or 1, UInt64 is proved to be within [0, 2^64), etc.
 */
console.log(
  `witnessing an account update and comparing it to another one creates ${result.rows} rows`
);

/**
 * For account updates specifically, we typically don't want all the subfield checks. That's because
 * account updates are usually tied the _public input_. The public input is checked on the verifier side
 * already, including the well-formedness of its parts, so there's no need to include that in the proof.
 *
 * This is why we have this custom way of witnessing account updates, with the `skipCheck` option.
 */
result = await Provable.constraintSystem(async () => {
  let { accountUpdate: accountUpdateWitness } = await AccountUpdate.witness(
    Empty,
    async () => ({ accountUpdate, result: undefined }),
    { skipCheck: true }
  );
  Provable.assertEqual(AccountUpdate, accountUpdateWitness, accountUpdate);
});
console.log(
  `without all the checks on subfields, witnessing and comparing only creates ${result.rows} rows`
);

/**
 * To relate an account update to the hash which is the public input, we need to perform the hash in-circuit.
 * This is takes several 100 constraints, and is basically the minimal size of a zkApp method.
 */
result = await Provable.constraintSystem(async () => {
  let { accountUpdate: accountUpdateWitness } = await AccountUpdate.witness(
    Empty,
    async () => ({ accountUpdate, result: undefined }),
    { skipCheck: true }
  );
  accountUpdateWitness.hash();
});
console.log(`hashing a witnessed account update creates ${result.rows} rows`);
