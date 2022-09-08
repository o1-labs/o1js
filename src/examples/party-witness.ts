import {
  Types,
  AccountUpdate,
  PrivateKey,
  Circuit,
  circuitValue,
} from 'snarkyjs';

let address = PrivateKey.random().toPublicKey();

let party = AccountUpdate.defaultParty(address);
party.body.callDepth = 5;
party.lazyAuthorization = {
  kind: 'lazy-signature',
  privateKey: PrivateKey.random(),
};

let fields = Types.Party.toFields(party);
let aux = Types.Party.toAuxiliary(party);

let partyRaw = Types.Party.fromFields(fields, aux);
let json = Types.Party.toJSON(partyRaw);

if (address.toBase58() !== json.body.publicKey) throw Error('fail');

let Null = circuitValue<null>(null);

Circuit.runAndCheck(() => {
  let partyWitness = AccountUpdate.witness(Null, () => ({
    party,
    result: null,
  })).party;
  console.assert(partyWitness.body.callDepth === 5);
  Circuit.assertEqual(Types.Party, partyWitness, party);
  Circuit.assertEqual(
    PrivateKey,
    (partyWitness.lazyAuthorization as any).privateKey,
    (party.lazyAuthorization as any).privateKey
  );
});

let result;
let hash = party.hash();

result = Circuit.constraintSystem(() => {
  let partyWitness = AccountUpdate.witness(
    Null,
    () => ({ party, result: null }),
    {
      skipCheck: true,
    }
  ).party;
  console.assert(partyWitness.body.callDepth === 0);
  Circuit.assertEqual(Types.Party, partyWitness, party);
  // let fieldsWitness = Types.Party.toFields(partyWitness);
  // let fieldsConstant = Types.Party.toFields(party);
  // for (let i = 0; i < 5; i++) {
  //   fieldsWitness[i].assertEquals(fieldsConstant[i]);
  // }
});

console.log(`a party has ${Types.Party.sizeInFields()} fields`);
console.log(
  `witnessing a party and comparing it to a constant one creates ${result.rows} rows`
);

result = Circuit.constraintSystem(() => {
  AccountUpdate.witness(Null, () => ({ party, result: null })).party;
});
console.log(`witnessing a party and running check creates ${result.rows} rows`);

result = Circuit.constraintSystem(() => {
  let partyWitness = AccountUpdate.witness(
    Null,
    () => ({ party, result: null }),
    {
      skipCheck: true,
    }
  ).party;
  partyWitness.hash().assertEquals(hash);
});
console.log(
  `witnessing a party, hashing it and comparing the hash creates ${result.rows} rows`
);

result = Circuit.constraintSystem(() => {
  party.hash().assertEquals(hash);
});
console.log(
  `hashing a constant party and comparing the hash creates ${result.rows} rows`
);
