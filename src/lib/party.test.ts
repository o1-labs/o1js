import {
  isReady,
  Ledger,
  Circuit,
  Party,
  PrivateKey,
  toPartyUnsafe,
  Types,
  shutdown,
  Field,
  PublicKey,
  CircuitValue,
} from '../../dist/server';

let address: PublicKey;
let party: Party;

describe('party', () => {
  beforeAll(async () => {
    await isReady;
    address = PrivateKey.random().toPublicKey();
    party = Party.defaultParty(address);
  });
  afterAll(() => setTimeout(shutdown, 0));

  it('can convert party to fields consistently', () => {
    // convert party to fields in OCaml, going via Party.of_json
    let json = JSON.stringify(Types.Party.toJson(toPartyUnsafe(party)).body);
    let fields1 = Ledger.fieldsOfJson(json);
    // convert party to fields in pure JS, leveraging generated code
    let fields2 = Types.Party.toFields(toPartyUnsafe(party));

    // this is useful console output in the case the test should fail
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

    expect(fields1.length).toEqual(fields2.length);
    expect(fields1.map(String)).toEqual(fields2.map(String));
    expect(fields1).toEqual(fields2);
  });

  it('can hash a party', () => {
    // TODO remove restriction "This function can't be run outside of a checked computation."
    Circuit.runAndCheck(() => {
      let hash = party.hash();
      expect(isLikeField(hash)).toBeTruthy();

      // if we clone the party, hash should be the same
      let party2 = Party.clone(party);
      expect(party2.hash()).toEqual(hash);

      // if we change something on the cloned party, the hash should become different
      Party.setValue(party2.update.appState[0], Field.one);
      expect(party2.hash()).not.toEqual(hash);
    });
  });
});

// to check that we got something that looks like a Field
// note: `instanceof Field` doesn't work
function isLikeField(x: any) {
  return (
    !(x instanceof CircuitValue) &&
    'equals' in x &&
    'toFields' in x &&
    'add' in x &&
    'mul' in x &&
    Array.isArray((x as any).value)
  );
}
