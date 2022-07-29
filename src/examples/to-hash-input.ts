import {
  isReady,
  Party,
  PrivateKey,
  Types,
  Poseidon,
  Field,
  Ledger,
  UInt64,
  UInt32,
  Experimental,
  Bool,
  Permissions,
} from 'snarkyjs';

await isReady;

let packToFields: (input: Types.Input) => Field[] = (Poseidon as any)
  .packToFields;
let { asFieldsAndAux, jsLayout } = Experimental;

let party = Party.defaultParty(PrivateKey.random().toPublicKey());

// types
type Body = Types.Party['body'];
type Update = Body['update'];
type Timing = Update['timing']['value'];
type AccountPrecondition = Body['preconditions']['account'];
type NetworkPrecondition = Body['preconditions']['network'];

// timing
let Timing = asFieldsAndAux<Timing, any>(
  jsLayout.Party.entries.body.entries.update.entries.timing.inner
);
let timing = party.body.update.timing.value;
timing.initialMinimumBalance = UInt64.one;
timing.vestingPeriod = UInt32.one;
timing.vestingIncrement = UInt64.from(2);
testInput(Timing, Ledger.hashInputFromJson.timing, timing);

// permissions
let Permissions_ = asFieldsAndAux<Permissions, any>(
  jsLayout.Party.entries.body.entries.update.entries.permissions.inner
);
let permissions = party.body.update.permissions;
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
let Update = asFieldsAndAux<Update, any>(
  jsLayout.Party.entries.body.entries.update
);
let update = party.body.update;

update.timing.isSome = Bool(true);
update.appState[0].isSome = Bool(true);
update.appState[0].value = Field(9);
update.delegate.isSome = Bool(true);
let delegate = PrivateKey.random().toPublicKey();
update.delegate.value = delegate;

party.tokenSymbol.set('BLABLA');
testInput(Update, Ledger.hashInputFromJson.update, update);

// account precondition
let AccountPrecondition = asFieldsAndAux<AccountPrecondition, any>(
  jsLayout.Party.entries.body.entries.preconditions.entries.account
);
let account = party.body.preconditions.account;
party.account.balance.assertEquals(UInt64.from(1e9));
party.account.isNew.assertEquals(Bool(true));
party.account.delegate.assertEquals(delegate);
account.state[0].isSome = Bool(true);
account.state[0].value = Field(9);
testInput(
  AccountPrecondition,
  Ledger.hashInputFromJson.accountPrecondition,
  account
);

// network precondition
let NetworkPrecondition = asFieldsAndAux<NetworkPrecondition, any>(
  jsLayout.Party.entries.body.entries.preconditions.entries.network
);
let network = party.body.preconditions.network;
party.network.stakingEpochData.ledger.hash.assertEquals(Field.random());
party.network.nextEpochData.lockCheckpoint.assertEquals(Field.random());

testInput(
  NetworkPrecondition,
  Ledger.hashInputFromJson.networkPrecondition,
  network
);

// body
let Body = asFieldsAndAux<Body, any>(jsLayout.Party.entries.body);
testInput(Body, Ledger.hashInputFromJson.body, party.body);

// party (should be same as body)
testInput(
  Types.Party,
  (partyJson) =>
    Ledger.hashInputFromJson.body(JSON.stringify(JSON.parse(partyJson).body)),
  party
);

console.log('all hash inputs are consistent! 🎉');

function testInput<T>(
  Module: Experimental.AsFieldsAndAux<T, any>,
  toInputOcaml: (json: string) => InputOcaml,
  value: T
) {
  let json = Module.toJson(value);
  // console.log(json);
  let input1 = inputFromOcaml(toInputOcaml(JSON.stringify(json)));
  let input2 = Module.toInput(value);
  // console.log('snarkyjs', JSON.stringify(input2));
  // console.log();
  // console.log('protocol', JSON.stringify(input1));
  let ok1 = JSON.stringify(input2) === JSON.stringify(input1);
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
