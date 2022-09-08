import { Types, AccountUpdate, PrivateKey, Circuit, circuitValue } from 'snarkyjs';

let address = PrivateKey.random().toPublicKey();

let accountUpdate = AccountUpdate.defaultAccountUpdate(address);
accountUpdate.body.callDepth = 5;
accountUpdate.lazyAuthorization = {
  kind: 'lazy-signature',
  privateKey: PrivateKey.random(),
};

let fields = Types.AccountUpdate.toFields(accountUpdate);
let aux = Types.AccountUpdate.toAuxiliary(accountUpdate);

let accountUpdateRaw = Types.AccountUpdate.fromFields(fields, aux);
let json = Types.AccountUpdate.toJSON(accountUpdateRaw);

if (address.toBase58() !== json.body.publicKey) throw Error('fail');

let Null = circuitValue<null>(null);

Circuit.runAndCheck(() => {
  let accountUpdateWitness = AccountUpdate.witness(Null, () => ({ accountUpdate, result: null })).accountUpdate;
  console.assert(accountUpdateWitness.body.callDepth === 5);
  Circuit.assertEqual(Types.AccountUpdate, accountUpdateWitness, accountUpdate);
  Circuit.assertEqual(
    PrivateKey,
    (accountUpdateWitness.lazyAuthorization as any).privateKey,
    (accountUpdate.lazyAuthorization as any).privateKey
  );
});

let result = Circuit.constraintSystem(() => {
  let accountUpdateWitness = AccountUpdate.witness(Null, () => ({ accountUpdate, result: null })).accountUpdate;
  console.assert(accountUpdateWitness.body.callDepth === 0);
  Circuit.assertEqual(Types.AccountUpdate, accountUpdateWitness, accountUpdate);
});

console.log(`a accountUpdate has ${Types.AccountUpdate.sizeInFields()} fields`);
console.log(
  `witnessing a accountUpdate and comparing it to another one creates ${result.rows} rows`
);
