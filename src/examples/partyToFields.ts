// TODO this should be a test

import {
  Ledger,
  Party,
  PrivateKey,
  toPartyUnsafe,
  Types,
  Circuit,
} from 'snarkyjs';
import * as assert from 'node:assert/strict';

let address = PrivateKey.random().toPublicKey();
let toJson = Types.Party.toJson;
let toFields = Types.Party.toFields;
let party = Party.defaultParty(address);

let json1 = JSON.stringify(toJson(toPartyUnsafe(party)).body);
let fields1 = Ledger.fieldsOfJson(json1);

let fields2 = toFields(toPartyUnsafe(party));

if (fields1.length !== fields2.length) {
  console.log(
    `unequal length. expected ${fields1.length}, actual: ${fields2.length}`
  );
}

for (let i = 0; i < fields1.length; i++) {
  if (fields1[i].toString() !== fields2[i].toString()) {
    console.log('unequal at', i);
    console.log(`expected: ${fields1[i]} actual: ${fields2[i]}`);
  }
}

assert.equal(fields1.length, fields2.length);
assert.deepEqual(fields1.map(String), fields2.map(String));

// hash a party

Circuit.runAndCheck(() => {
  let party = Party.defaultParty(address);
  console.log(`hash: ${party.hash()}`);
});
