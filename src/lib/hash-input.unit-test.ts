import {
  isReady,
  AccountUpdate,
  Types,
  Field,
  Ledger,
  Permissions,
  shutdown,
  ProvableExtended,
} from '../index.js';
import { expect } from 'expect';
import { jsLayout } from '../bindings/mina-transaction/gen/js-layout.js';
import {
  Json,
  provableFromLayout,
} from '../bindings/mina-transaction/gen/transaction.js';
import { packToFields } from './hash.js';
import { Random, test } from './testing/property.js';
import { OcamlInput } from '../snarky.js';
import { MlArray } from './ml/base.js';
import { MlFieldConstArray } from './field.js';
import { Ml } from './ml/conversion.js';

await isReady;

// types
type Body = Types.AccountUpdate['body'];
type Update = Body['update'];
type Timing = Update['timing']['value'];
type AccountPrecondition = Body['preconditions']['account'];
type NetworkPrecondition = Body['preconditions']['network'];

// provables
let bodyLayout = jsLayout.AccountUpdate.entries.body;
let Timing = provableFromLayout<Timing, any>(
  bodyLayout.entries.update.entries.timing.inner as any
);
let Permissions_ = provableFromLayout<Permissions, any>(
  bodyLayout.entries.update.entries.permissions.inner as any
);
let Update = provableFromLayout<Update, any>(bodyLayout.entries.update as any);
let AccountPrecondition = provableFromLayout<AccountPrecondition, any>(
  bodyLayout.entries.preconditions.entries.account as any
);
let NetworkPrecondition = provableFromLayout<NetworkPrecondition, any>(
  bodyLayout.entries.preconditions.entries.network as any
);
let Body = provableFromLayout<Body, any>(bodyLayout as any);

// test with random account udpates
test(Random.json.accountUpdate, (accountUpdateJson) => {
  fixVerificationKey(accountUpdateJson);
  let accountUpdate = AccountUpdate.fromJSON(accountUpdateJson);

  // timing
  let timing = accountUpdate.body.update.timing.value;
  testInput(Timing, Ledger.hashInputFromJson.timing, timing);

  // permissions
  let permissions = accountUpdate.body.update.permissions.value;
  testInput(Permissions_, Ledger.hashInputFromJson.permissions, permissions);

  // update
  // TODO non ascii strings in zkapp uri and token symbol fail
  let update = accountUpdate.body.update;
  testInput(Update, Ledger.hashInputFromJson.update, update);

  // account precondition
  let account = accountUpdate.body.preconditions.account;
  testInput(
    AccountPrecondition,
    Ledger.hashInputFromJson.accountPrecondition,
    account
  );

  // network precondition
  let network = accountUpdate.body.preconditions.network;
  testInput(
    NetworkPrecondition,
    Ledger.hashInputFromJson.networkPrecondition,
    network
  );

  // body
  let body = accountUpdate.body;
  testInput(Body, Ledger.hashInputFromJson.body, body);

  // accountUpdate (should be same as body)
  testInput(
    Types.AccountUpdate,
    (accountUpdateJson) =>
      Ledger.hashInputFromJson.body(
        JSON.stringify(JSON.parse(accountUpdateJson).body)
      ),
    accountUpdate
  );
});

console.log('all hash inputs are consistent! 🎉');
shutdown();

function testInput<T, TJson>(
  Module: ProvableExtended<T, TJson>,
  toInputOcaml: (json: string) => OcamlInput,
  value: T
) {
  let json = Module.toJSON(value);
  // console.log('json', json);
  let input1 = inputFromOcaml(toInputOcaml(JSON.stringify(json)));
  let input2 = Module.toInput(value);
  // console.log('snarkyjs', JSON.stringify(input2));
  // console.log();
  // console.log('protocol', JSON.stringify(input1));
  let ok1 = JSON.stringify(input2) === JSON.stringify(input1);
  expect(JSON.stringify(input2)).toEqual(JSON.stringify(input1));
  // console.log('ok?', ok1);
  let fields1 = MlFieldConstArray.from(
    Ledger.hashInputFromJson.packInput(inputToOcaml(input1))
  );
  let fields2 = packToFields(input2);
  let ok2 = JSON.stringify(fields1) === JSON.stringify(fields2);
  // console.log('packed ok?', ok2);
  // console.log();
  if (!ok1 || !ok2) {
    throw Error('inconsistent toInput');
  }
}

function inputFromOcaml([, fields, packed]: OcamlInput) {
  return {
    fields: MlFieldConstArray.from(fields),
    packed: MlArray.from(packed).map(
      ([, field, size]) => [Field(field), size] as [Field, number]
    ),
  };
}
function inputToOcaml({
  fields,
  packed,
}: {
  fields: Field[];
  packed: [field: Field, size: number][];
}): OcamlInput {
  return [
    0,
    MlFieldConstArray.to(fields),
    MlArray.to(
      packed.map(([field, size]) => [0, Ml.constFromField(field), size])
    ),
  ];
}

function fixVerificationKey(accountUpdate: Json.AccountUpdate) {
  // TODO we set vk to null since we can't generate a valid random one
  accountUpdate.body.update.verificationKey = null;
}
