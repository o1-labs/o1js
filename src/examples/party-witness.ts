import {
  AccountUpdate,
  PrivateKey,
  Circuit,
  provable,
  isReady,
  Provable,
} from 'o1js';

await isReady;

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

if (address.toBase58() !== json.body.publicKey) throw Error('fail');

let Null = provable(null);

Provable.runAndCheck(() => {
  let accountUpdateWitness = AccountUpdate.witness(Null, () => ({
    accountUpdate,
    result: null,
  })).accountUpdate;
  console.assert(accountUpdateWitness.body.callDepth === 5);
  Provable.assertEqual(AccountUpdate, accountUpdateWitness, accountUpdate);
  Provable.assertEqual(
    PrivateKey,
    (accountUpdateWitness.lazyAuthorization as any).privateKey,
    (accountUpdate.lazyAuthorization as any).privateKey
  );
});

let result = Provable.witness(() => {
  let accountUpdateWitness = AccountUpdate.witness(Null, () => ({
    accountUpdate,
    result: null,
  })).accountUpdate;
  console.assert(accountUpdateWitness.body.callDepth === 0);
  Provable.assertEqual(AccountUpdate, accountUpdateWitness, accountUpdate);
});

console.log(`an account update has ${AccountUpdate.sizeInFields()} fields`);
console.log(
  `witnessing an account update and comparing it to another one creates ${result.rows} rows`
);

result = Provable.witness(() => {
  let accountUpdateWitness = AccountUpdate.witness(
    Null,
    () => ({
      accountUpdate,
      result: null,
    }),
    { skipCheck: true }
  ).accountUpdate;
  console.assert(accountUpdateWitness.body.callDepth === 0);
  Provable.assertEqual(AccountUpdate, accountUpdateWitness, accountUpdate);
});

console.log(
  `without all the checks on subfields, witnessing and comparing only creates ${result.rows} rows`
);
