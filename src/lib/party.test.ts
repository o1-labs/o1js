import {
  isReady,
  Ledger,
  Circuit,
  Party,
  PrivateKey,
  shutdown,
  Field,
  PublicKey,
  Mina,
  Experimental,
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
    let json = JSON.stringify(party.toJSON().body);
    let fields1 = Ledger.fieldsOfJson(json);
    // convert party to fields in pure JS, leveraging generated code
    let fields2 = party.toFields();

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
      expect(isField(hash)).toBeTruthy();

      // if we clone the party, hash should be the same
      let party2 = Party.clone(party);
      expect(party2.hash()).toEqual(hash);

      // if we change something on the cloned party, the hash should become different
      Party.setValue(party2.update.appState[0], Field.one);
      expect(party2.hash()).not.toEqual(hash);
    });
  });

  it("converts party to a public input that's consistent with the ocaml implementation", async () => {
    let otherAddress = PrivateKey.random().toPublicKey();

    let party = Party.createUnsigned(address);
    Experimental.createChildParty(party, otherAddress);
    let publicInput = party.toPublicInput();

    // create transaction JSON with the same party structure, for ocaml version
    let tx = await Mina.transaction(() => {
      let party = Party.createUnsigned(address);
      Experimental.createChildParty(party, otherAddress);
    });
    let publicInputOcaml = Ledger.zkappPublicInput(tx.toJSON(), 0);

    expect(publicInputOcaml).toEqual(publicInput);
  });

  it('creates the right empty events', () => {
    expect(party.body.events.hash.toString()).toEqual(
      '23641812384071365026036270005604392899711718400522999453895455265440046333209'
    );
  });
  it('creates the right empty sequence state', () => {
    expect(party.body.preconditions.account.sequenceState.toString()).toEqual(
      '19777675955122618431670853529822242067051263606115426372178827525373304476695'
    );
  });
});

// to check that we got something that looks like a Field
// note: `instanceof Field` doesn't work
function isField(x: any): x is Field {
  return x?.constructor === Field.one.constructor;
}
