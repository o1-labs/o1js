import {
  isReady,
  Ledger,
  Circuit,
  AccountUpdate,
  PrivateKey,
  shutdown,
  Field,
  PublicKey,
  Mina,
  Experimental,
  Int64,
  Encoding,
} from 'snarkyjs';

let address: PublicKey;
let accountUpdate: AccountUpdate;

describe('accountUpdate', () => {
  beforeAll(async () => {
    await isReady;
    address = PrivateKey.random().toPublicKey();
    accountUpdate = AccountUpdate.defaultAccountUpdate(address);
    accountUpdate.body.balanceChange = Int64.from(1e9).neg();
  });
  afterAll(() => setTimeout(shutdown, 0));

  it('can convert accountUpdate to fields consistently', () => {
    // convert accountUpdate to fields in OCaml, going via AccountUpdate.of_json
    let json = JSON.stringify(accountUpdate.toJSON().body);
    let fields1 = Ledger.fieldsOfJson(json);
    // convert accountUpdate to fields in pure JS, leveraging generated code
    let fields2 = accountUpdate.toFields();

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

  it('can hash a accountUpdate', () => {
    // TODO remove restriction "This function can't be run outside of a checked computation."
    Circuit.runAndCheck(() => {
      let hash = accountUpdate.hash();
      expect(isField(hash)).toBeTruthy();

      // if we clone the accountUpdate, hash should be the same
      let accountUpdate2 = AccountUpdate.clone(accountUpdate);
      expect(accountUpdate2.hash()).toEqual(hash);

      // if we change something on the cloned accountUpdate, the hash should become different
      AccountUpdate.setValue(accountUpdate2.update.appState[0], Field.one);
      expect(accountUpdate2.hash()).not.toEqual(hash);
    });
  });

  it("converts accountUpdate to a public input that's consistent with the ocaml implementation", async () => {
    let otherAddress = PrivateKey.random().toPublicKey();

    let accountUpdate = AccountUpdate.create(address);
    Experimental.createChildAccountUpdate(accountUpdate, otherAddress);
    let publicInput = accountUpdate.toPublicInput();

    // create transaction JSON with the same accountUpdate structure, for ocaml version
    let tx = await Mina.transaction(() => {
      let accountUpdate = AccountUpdate.create(address);
      Experimental.createChildAccountUpdate(accountUpdate, otherAddress);
    });
    let publicInputOcaml = Ledger.zkappPublicInput(tx.toJSON(), 0);

    expect(publicInputOcaml).toEqual(publicInput);
  });

  it('creates the right empty sequence state', () => {
    expect(
      accountUpdate.body.preconditions.account.sequenceState.value.toString()
    ).toEqual(
      '12935064460869035604753254773225484359407575580289870070671311469994328713165'
    );
  });

  it('encodes token ids correctly', () => {
    let x = Field.random();
    let defaultTokenId = 'wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf';
    expect(Encoding.TokenId.toBase58(x)).toEqual(Ledger.fieldToBase58(x));
    expect(Encoding.TokenId.fromBase58(defaultTokenId).toString()).toEqual('1');
  });
});

// to check that we got something that looks like a Field
// note: `instanceof Field` doesn't work
function isField(x: any) {
  return x?.constructor === Field.one.constructor;
}
