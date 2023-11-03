import assert from 'assert/strict';
import { AccountUpdate, PrivateKey, Provable, Empty } from 'o1js';

let address = PrivateKey.random().toPublicKey();

let accountUpdate = AccountUpdate.defaultAccountUpdate(address);
accountUpdate.body.callDepth = 5;
accountUpdate.lazyAuthorization = {
  kind: 'lazy-signature',
  privateKey: PrivateKey.random(),
};

let fields = AccountUpdate.toFields(accountUpdate);
let aux = AccountUpdate.toAuxiliary(accountUpdate);

let accountUpdateRaw = AccountUpdate.fromFields(fields, aux);
let json = AccountUpdate.toJSON(accountUpdateRaw);

assert.equal(
  address.toBase58(),
  json.body.publicKey,
  'recover json public key'
);

Provable.runAndCheck(() => {
  let accountUpdateWitness = Provable.witness(
    AccountUpdate,
    () => accountUpdate
  );
  assert(
    accountUpdateWitness.body.callDepth === 5,
    'when witness block is executed, witness() recreates auxiliary parts of provable type'
  );
  Provable.assertEqual(AccountUpdate, accountUpdateWitness, accountUpdate);
  Provable.assertEqual(
    PrivateKey,
    (accountUpdateWitness.lazyAuthorization as any).privateKey,
    (accountUpdate.lazyAuthorization as any).privateKey
  );
});

let result = Provable.constraintSystem(() => {
  let accountUpdateWitness = Provable.witness(
    AccountUpdate,
    () => accountUpdate
  );
  assert(
    accountUpdateWitness.body.callDepth === 0,
    'when witness block is not executed, witness() returns dummy data'
  );
  Provable.assertEqual(AccountUpdate, accountUpdateWitness, accountUpdate);
});

console.log(`an account update has ${AccountUpdate.sizeInFields()} fields`);
console.log(
  `witnessing an account update and comparing it to another one creates ${result.rows} rows`
);

result = Provable.constraintSystem(() => {
  let { accountUpdate: accountUpdateWitness } = AccountUpdate.witness(
    Empty,
    () => ({ accountUpdate, result: undefined }),
    { skipCheck: true }
  );
  Provable.assertEqual(AccountUpdate, accountUpdateWitness, accountUpdate);
});

console.log(
  `without all the checks on subfields, witnessing and comparing only creates ${result.rows} rows`
);

result = Provable.constraintSystem(() => {
  let { accountUpdate: accountUpdateWitness } = AccountUpdate.witness(
    Empty,
    () => ({ accountUpdate, result: undefined }),
    { skipCheck: true }
  );
  accountUpdateWitness.hash();
});

console.log(`hashing a witnessed account update creates ${result.rows} rows`);
