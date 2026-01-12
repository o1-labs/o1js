import { expect } from 'expect';
import { Test } from '../../../bindings.js';
import { mocks } from '../../../bindings/crypto/constants.js';
import {
  AccountUpdate,
  Bool,
  Field,
  Int64,
  Mina,
  PrivateKey,
  SmartContract,
  State,
  Types,
  method,
  state,
} from '../../../index.js';

let mlTest = await Test();

let address = PrivateKey.random().toPublicKey();

function createAccountUpdate() {
  let accountUpdate = AccountUpdate.default(address);
  accountUpdate.body.balanceChange = Int64.from(1e9).neg();
  return accountUpdate;
}

function createAccountUpdateWithMayUseToken(mayUseToken: AccountUpdate['body']['mayUseToken']) {
  let accountUpdate = AccountUpdate.default(address);
  accountUpdate.body.mayUseToken = mayUseToken;
  return accountUpdate;
}

// can convert account update to fields consistently
{
  let accountUpdate = createAccountUpdate();

  // convert accountUpdate to fields in OCaml, going via AccountUpdate.of_json
  let json = JSON.stringify(accountUpdate.toJSON().body);
  let [, ...fields1_] = mlTest.fieldsFromJson.accountUpdate(json);
  let fields1 = fields1_.map(Field);
  // convert accountUpdate to fields in pure JS, leveraging generated code
  let fields2 = Types.AccountUpdate.toFields(accountUpdate);

  // this is useful console output in the case the test should fail
  if (fields1.length !== fields2.length) {
    console.log(`unequal length. expected ${fields1.length}, actual: ${fields2.length}`);
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

  let hash = accountUpdate.hash();

  // if we clone the accountUpdate, hash should be the same
  let accountUpdate2 = AccountUpdate.clone(accountUpdate);
  expect(accountUpdate2.hash()).toEqual(hash);

  // if we change something on the cloned accountUpdate, the hash should become different
  AccountUpdate.setValue(accountUpdate2.update.appState[0], Field(1));
  expect(accountUpdate2.hash()).not.toEqual(hash);
}

// converts account update to a public input that's consistent with the ocaml implementation
{
  let otherAddress = PrivateKey.random().toPublicKey();

  let accountUpdate = AccountUpdate.create(address);
  let otherUpdate = AccountUpdate.create(otherAddress);
  accountUpdate.approve(otherUpdate);

  let publicInput = accountUpdate.toPublicInput({
    accountUpdates: [accountUpdate, otherUpdate],
  });

  // create transaction JSON with the same accountUpdate structure, for ocaml version
  let tx = await Mina.transaction(async () => {
    let accountUpdate = AccountUpdate.create(address);
    accountUpdate.approve(AccountUpdate.create(otherAddress));
  });
  let publicInputOcaml = mlTest.hashFromJson.zkappPublicInput(tx.toJSON(), 0);

  expect(publicInput).toEqual({
    accountUpdate: Field(publicInputOcaml.accountUpdate),
    calls: Field(publicInputOcaml.calls),
  });
}

// creates the right empty sequence state
{
  let accountUpdate = createAccountUpdate();
  expect(accountUpdate.body.preconditions.account.actionState.value.toString()).toEqual(
    '25079927036070901246064867767436987657692091363973573142121686150614948079097'
  );
}

// creates the right empty vk hash
{
  let accountUpdate = createAccountUpdate();
  expect(accountUpdate.body.authorizationKind.verificationKeyHash.toString()).toEqual(
    mocks.dummyVerificationKeyHash
  );
}

// does not throw an error if private key is missing unless if .send is executed
{
  let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);

  const [feePayer] = Local.testAccounts;

  let tx = await Mina.transaction(feePayer, async () => {
    AccountUpdate.fundNewAccount(feePayer);
  });
  tx.sign([]);
  await expect(tx.send()).rejects.toThrow(
    'Check signature: Invalid signature on fee payer for key'
  );
}

// correctly identifies when neither flag is set
{
  let accountUpdate = createAccountUpdateWithMayUseToken({
    parentsOwnToken: Bool(false),
    inheritFromParent: Bool(false),
  });
  expect(AccountUpdate.MayUseToken.isNo(accountUpdate).toBoolean()).toEqual(true);
}

// non-proof account update limits on actual transaction
{
  let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  const [feePayer] = Local.testAccounts;

  // 31 signed AUs + fee payer = 32 non-proof items = 16 pairs = 16 segments (max)
  let tx = await Mina.transaction(feePayer, async () => {
    for (let i = 0; i < 31; i++) AccountUpdate.createSigned(feePayer);
  });
  await tx.sign([feePayer.key]).send();

  // 32 signed AUs + fee payer = 33 non-proof items = 17 segments (exceeds limit)
  tx = await Mina.transaction(feePayer, async () => {
    for (let i = 0; i < 32; i++) AccountUpdate.createSigned(feePayer);
  });
  await expect(tx.sign([feePayer.key]).send()).rejects.toThrow(/too many segments/);
}

// proof account update limits
{
  class SimpleContract extends SmartContract {
    @state(Field) value = State<Field>();
    @method async setValue(v: Field) {
      this.value.set(v);
    }
  }

  let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);
  const [feePayer] = Local.testAccounts;

  await SimpleContract.compile();

  // deploy 16 contracts
  const contracts = Array.from({ length: 16 }, () => {
    const key = Mina.TestPublicKey.random();
    return { key, contract: new SimpleContract(key) };
  });

  // need to split into two batches because of transaction size limits
  for (let i = 0; i < 2; i++) {
    const batch = contracts.slice(i * 8, (i + 1) * 8);
    let tx = await Mina.transaction(feePayer, async () => {
      AccountUpdate.fundNewAccount(feePayer, 8);
      for (const { contract } of batch) await contract.deploy();
    });
    await tx.sign([feePayer.key, ...batch.map((c) => c.key.key)]).send();
  }

  // 15 proof AUs + fee payer (1 single) = 16 segments (max)
  let tx = await Mina.transaction(feePayer, async () => {
    for (let i = 0; i < 15; i++) await contracts[i].contract.setValue(Field(i));
  });
  // fee payer counts as a seperate account update, hence 16 account updates
  expect(tx.transaction.accountUpdates.length + 1 === 16);
  await tx.prove();
  await tx.sign([feePayer.key]).send();

  // 16 proof AUs + fee payer (1 single) = 17 segments (exceeds limit)
  tx = await Mina.transaction(feePayer, async () => {
    for (let i = 0; i < 16; i++) await contracts[i].contract.setValue(Field(i));
  });
  // fee payer counts as a seperate account update, hence 17 account updates
  expect(tx.transaction.accountUpdates.length + 1 === 17);
  await tx.prove();
  await expect(tx.sign([feePayer.key]).send()).rejects.toThrow(/too many segments/);
}
