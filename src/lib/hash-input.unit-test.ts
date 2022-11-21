import {
  isReady,
  AccountUpdate,
  PrivateKey,
  Types,
  Field,
  Ledger,
  UInt64,
  UInt32,
  Bool,
  Permissions,
  Sign,
  Token,
  shutdown,
  ProvableExtended,
} from '../index.js';
import { Events, SequenceEvents } from './account_update.js';
import { expect } from 'expect';
import { jsLayout } from '../provable/gen/js-layout.js';
import { provableFromLayout } from '../provable/gen/transaction.js';
import { packToFields } from './hash.js';

await isReady;

let accountUpdate = AccountUpdate.defaultAccountUpdate(
  PrivateKey.random().toPublicKey()
);

// types
type Body = Types.AccountUpdate['body'];
type Update = Body['update'];
type Timing = Update['timing']['value'];
type AccountPrecondition = Body['preconditions']['account'];
type NetworkPrecondition = Body['preconditions']['network'];

// timing
let Timing = provableFromLayout<Timing, any>(
  jsLayout.AccountUpdate.entries.body.entries.update.entries.timing.inner as any
);
let timing = accountUpdate.body.update.timing.value;
timing.initialMinimumBalance = UInt64.one;
timing.vestingPeriod = UInt32.one;
timing.vestingIncrement = UInt64.from(2);
testInput(Timing, Ledger.hashInputFromJson.timing, timing);

// permissions
let Permissions_ = provableFromLayout<Permissions, any>(
  jsLayout.AccountUpdate.entries.body.entries.update.entries.permissions
    .inner as any
);
let permissions = accountUpdate.body.update.permissions;
permissions.isSome = Bool(true);
permissions.value = {
  ...Permissions.default(),
  setVerificationKey: Permissions.none(),
  setPermissions: Permissions.none(),
  receive: Permissions.proof(),
};
testInput(
  Permissions_,
  Ledger.hashInputFromJson.permissions,
  permissions.value
);

// update
let Update = provableFromLayout<Update, any>(
  jsLayout.AccountUpdate.entries.body.entries.update as any
);
let update = accountUpdate.body.update;

update.timing.isSome = Bool(true);
update.appState[0].isSome = Bool(true);
update.appState[0].value = Field(9);
update.delegate.isSome = Bool(true);
let delegate = PrivateKey.random().toPublicKey();
update.delegate.value = delegate;

accountUpdate.tokenSymbol.set('BLABLA');
testInput(Update, Ledger.hashInputFromJson.update, update);

// account precondition
let AccountPrecondition = provableFromLayout<AccountPrecondition, any>(
  jsLayout.AccountUpdate.entries.body.entries.preconditions.entries
    .account as any
);
let account = accountUpdate.body.preconditions.account;
accountUpdate.account.balance.assertEquals(UInt64.from(1e9));
accountUpdate.account.isNew.assertEquals(Bool(true));
accountUpdate.account.delegate.assertEquals(delegate);
account.state[0].isSome = Bool(true);
account.state[0].value = Field(9);
testInput(
  AccountPrecondition,
  Ledger.hashInputFromJson.accountPrecondition,
  account
);

// network precondition
let NetworkPrecondition = provableFromLayout<NetworkPrecondition, any>(
  jsLayout.AccountUpdate.entries.body.entries.preconditions.entries
    .network as any
);
let network = accountUpdate.body.preconditions.network;
accountUpdate.network.stakingEpochData.ledger.hash.assertEquals(Field.random());
accountUpdate.network.nextEpochData.lockCheckpoint.assertEquals(Field.random());

testInput(
  NetworkPrecondition,
  Ledger.hashInputFromJson.networkPrecondition,
  network
);

// body
let Body = provableFromLayout<Body, any>(
  jsLayout.AccountUpdate.entries.body as any
);
let body = accountUpdate.body;
body.balanceChange.magnitude = UInt64.from(14197832);
body.balanceChange.sgn = Sign.minusOne;
body.callData = Field.random();
body.callDepth = 1;
body.incrementNonce = Bool(true);
let tokenOwner = PrivateKey.random().toPublicKey();
body.tokenId = new Token({ tokenOwner }).id;
body.caller = body.tokenId;
let events = Events.empty();
events = Events.pushEvent(events, [Field(1)]);
events = Events.pushEvent(events, [Field(0)]);
body.events = events;
let sequenceEvents = SequenceEvents.empty();
sequenceEvents = SequenceEvents.pushEvent(sequenceEvents, [Field(1)]);
sequenceEvents = SequenceEvents.pushEvent(sequenceEvents, [Field(0)]);
body.sequenceEvents = sequenceEvents;

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

console.log('all hash inputs are consistent! 🎉');
shutdown();

function testInput<T, TJson>(
  Module: ProvableExtended<T, TJson>,
  toInputOcaml: (json: string) => InputOcaml,
  value: T
) {
  let json = Module.toJSON(value);
  // console.log(json);
  let input1 = inputFromOcaml(toInputOcaml(JSON.stringify(json)));
  let input2 = Module.toInput(value);
  // console.log('snarkyjs', JSON.stringify(input2));
  // console.log();
  // console.log('protocol', JSON.stringify(input1));
  let ok1 = JSON.stringify(input2) === JSON.stringify(input1);
  expect(JSON.stringify(input2)).toEqual(JSON.stringify(input1));
  // console.log('ok?', ok1);
  let fields1 = Ledger.hashInputFromJson.packInput(inputToOcaml(input1));
  let fields2 = packToFields(input2);
  let ok2 = JSON.stringify(fields1) === JSON.stringify(fields2);
  // console.log('packed ok?', ok2);
  // console.log();
  if (!ok1 || !ok2) {
    throw Error('inconsistent toInput');
  }
}

type InputOcaml = {
  fields: Field[];
  packed: { field: Field; size: number }[];
};

function inputFromOcaml({
  fields,
  packed,
}: {
  fields: Field[];
  packed: { field: Field; size: number }[];
}) {
  return {
    fields,
    packed: packed.map(({ field, size }) => [field, size] as [Field, number]),
  };
}
function inputToOcaml({
  fields,
  packed,
}: {
  fields: Field[];
  packed: [field: Field, size: number][];
}) {
  return {
    fields,
    packed: packed.map(([field, size]) => ({ field, size })),
  };
}
