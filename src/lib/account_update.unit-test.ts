import {
  Ledger,
  AccountUpdate,
  PrivateKey,
  Field,
  Mina,
  Int64,
  Types,
  Provable,
} from '../index.js';
import { Test } from '../snarky.js';
import { expect } from 'expect';

let address = PrivateKey.random().toPublicKey();

function createAccountUpdate() {
  let accountUpdate = AccountUpdate.defaultAccountUpdate(address);
  accountUpdate.body.balanceChange = Int64.from(1e9).neg();
  return accountUpdate;
}

// can convert account update to fields consistently
{
  let accountUpdate = createAccountUpdate();

  // convert accountUpdate to fields in OCaml, going via AccountUpdate.of_json
  let json = JSON.stringify(accountUpdate.toJSON().body);
  let [, ...fields1_] = Test.fieldsFromJson.accountUpdate(json);
  let fields1 = fields1_.map(Field);
  // convert accountUpdate to fields in pure JS, leveraging generated code
  let fields2 = Types.AccountUpdate.toFields(accountUpdate);

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
}

// can hash an account update
{
  let accountUpdate = createAccountUpdate();

  // TODO remove restriction "This function can't be run outside of a checked computation."
  Provable.runAndCheck(() => {
    let hash = accountUpdate.hash();

    // if we clone the accountUpdate, hash should be the same
    let accountUpdate2 = AccountUpdate.clone(accountUpdate);
    expect(accountUpdate2.hash()).toEqual(hash);

    // if we change something on the cloned accountUpdate, the hash should become different
    AccountUpdate.setValue(accountUpdate2.update.appState[0], Field(1));
    expect(accountUpdate2.hash()).not.toEqual(hash);
  });
}

// converts account update to a public input that's consistent with the ocaml implementation
{
  let otherAddress = PrivateKey.random().toPublicKey();

  let accountUpdate = AccountUpdate.create(address);
  accountUpdate.approve(AccountUpdate.create(otherAddress));

  let publicInput = accountUpdate.toPublicInput();

  // create transaction JSON with the same accountUpdate structure, for ocaml version
  let tx = await Mina.transaction(() => {
    let accountUpdate = AccountUpdate.create(address);
    accountUpdate.approve(AccountUpdate.create(otherAddress));
  });
  let publicInputOcaml = Test.hashFromJson.zkappPublicInput(tx.toJSON(), 0);

  expect(publicInput).toEqual({
    accountUpdate: Field(publicInputOcaml.accountUpdate),
    calls: Field(publicInputOcaml.calls),
  });
}

// creates the right empty sequence state
{
  let accountUpdate = createAccountUpdate();
  expect(
    accountUpdate.body.preconditions.account.actionState.value.toString()
  ).toEqual(
    '25079927036070901246064867767436987657692091363973573142121686150614948079097'
  );
}

// does not throw an error if private key is missing unless if .send is executed
{
  let Local = Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);

  const feePayer = Local.testAccounts[0].publicKey;

  let tx = await Mina.transaction(feePayer, () => {
    AccountUpdate.fundNewAccount(feePayer);
  });
  tx.sign();
  await expect(tx.send()).rejects.toThrow(
    'Check signature: Invalid signature on fee payer for key'
  );
}
