import {
  AccountUpdate,
  Types,
  Permissions,
  ProvableExtended,
} from '../../index.js';
import { expect } from 'expect';
import { jsLayout } from '../../bindings/mina-transaction/gen/js-layout.js';
import {
  Json,
  provableFromLayout,
} from '../../bindings/mina-transaction/gen/transaction.js';
import { packToFields } from '../provable/crypto/poseidon.js';
import { Random, test } from '../testing/property.js';
import { MlHashInput } from '../ml/conversion.js';
import { MlFieldConstArray } from '../ml/fields.js';
import { Test } from '../../snarky.js';

let { hashInputFromJson } = await Test();

// types
type Body = Types.AccountUpdate['body'];
type Update = Body['update'];
type Timing = Update['timing']['value'];
type AccountPrecondition = Body['preconditions']['account'];
type NetworkPrecondition = Body['preconditions']['network'];

// provables
let bodyLayout = jsLayout.AccountUpdate.entries.body;
let Timing = provableFromLayout<Timing, any, any>(
  bodyLayout.entries.update.entries.timing.inner as any
);
let Permissions_ = provableFromLayout<Permissions, any, any>(
  bodyLayout.entries.update.entries.permissions.inner as any
);
let Update = provableFromLayout<Update, any, any>(
  bodyLayout.entries.update as any
);
let AccountPrecondition = provableFromLayout<AccountPrecondition, any, any>(
  bodyLayout.entries.preconditions.entries.account as any
);
let NetworkPrecondition = provableFromLayout<NetworkPrecondition, any, any>(
  bodyLayout.entries.preconditions.entries.network as any
);
let Body = provableFromLayout<Body, any, any>(bodyLayout as any);

// test with random account updates
test(Random.json.accountUpdate, (accountUpdateJson) => {
  fixVerificationKey(accountUpdateJson);
  let accountUpdate = AccountUpdate.fromJSON(accountUpdateJson);

  // timing
  let timing = accountUpdate.body.update.timing.value;
  testInput(Timing, hashInputFromJson.timing, timing);

  // permissions
  let permissions = accountUpdate.body.update.permissions.value;
  testInput(Permissions_, hashInputFromJson.permissions, permissions);

  // update
  // TODO non ascii strings in zkapp uri and token symbol fail
  let update = accountUpdate.body.update;
  testInput(Update, hashInputFromJson.update, update);

  // account precondition
  let account = accountUpdate.body.preconditions.account;
  testInput(
    AccountPrecondition,
    hashInputFromJson.accountPrecondition,
    account
  );

  // network precondition
  let network = accountUpdate.body.preconditions.network;
  testInput(
    NetworkPrecondition,
    hashInputFromJson.networkPrecondition,
    network
  );

  // body
  let body = accountUpdate.body;
  testInput(Body, hashInputFromJson.body, body);

  // accountUpdate (should be same as body)
  testInput(
    Types.AccountUpdate,
    (accountUpdateJson) =>
      hashInputFromJson.body(
        JSON.stringify(JSON.parse(accountUpdateJson).body)
      ),
    accountUpdate
  );
});

console.log('all hash inputs are consistent! 🎉');

function testInput<T, TJson>(
  Module: ProvableExtended<T, TJson>,
  toInputOcaml: (json: string) => MlHashInput,
  value: T
) {
  let json = Module.toJSON(value);
  // console.log('json', json);
  let input1 = MlHashInput.from(toInputOcaml(JSON.stringify(json)));
  let input2 = Module.toInput(value);
  let input1Json = JSON.stringify(input1);
  let input2Json = JSON.stringify(input2);
  // console.log('o1js', input2Json);
  // console.log();
  // console.log('protocol', input1Json);
  let ok1 = input1Json === input2Json;
  expect(input2Json).toEqual(input1Json);
  // console.log('ok?', ok1);
  let fields1 = MlFieldConstArray.from(
    hashInputFromJson.packInput(MlHashInput.to(input1))
  );
  let fields2 = packToFields(input2);
  let ok2 = JSON.stringify(fields1) === JSON.stringify(fields2);
  // console.log('packed ok?', ok2);
  // console.log();
  if (!ok1 || !ok2) {
    throw Error('inconsistent toInput');
  }
}

function fixVerificationKey(accountUpdate: Json.AccountUpdate) {
  // TODO we set vk to null since we can't generate a valid random one
  accountUpdate.body.update.verificationKey = null;
}
