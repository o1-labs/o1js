import { Types, Party, PrivateKey, Circuit, circuitValue } from 'snarkyjs';

let address = PrivateKey.random().toPublicKey();

let party = Party.defaultParty(address);
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
  let partyWitness = Party.witness(Null, () => ({ party, result: null })).party;
  console.assert(partyWitness.body.callDepth === 5);
  Circuit.assertEqual(Types.Party, partyWitness, party);
  Circuit.assertEqual(
    PrivateKey,
    (partyWitness.lazyAuthorization as any).privateKey,
    (party.lazyAuthorization as any).privateKey
  );
});

let result = Circuit.constraintSystem(() => {
  let partyWitness = Party.witness(Null, () => ({ party, result: null })).party;
  console.assert(partyWitness.body.callDepth === 0);
  Circuit.assertEqual(Types.Party, partyWitness, party);
});

console.log(`a party has ${Types.Party.sizeInFields()} fields`);
console.log(
  `witnessing a party and comparing it to another one creates ${result.rows} rows`
);
