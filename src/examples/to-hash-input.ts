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
type Update = Types.Party['body']['update'];
type Timing = Update['timing']['value'];

// timing
let Timing = asFieldsAndAux<Timing, any>(
  jsLayout.Party.entries.body.entries.update.entries.timing.inner
);
let timing = party.body.update.timing.value;
timing.initialMinimumBalance = UInt64.one;
timing.vestingPeriod = UInt32.one;
timing.vestingIncrement = UInt64.from(2);
testInput(Timing, Ledger.hashInputFromJson.timing, timing);

// update
let Update = asFieldsAndAux<Update, any>(
  jsLayout.Party.entries.body.entries.update
);
let update = party.body.update;
update.timing.isSome = Bool(true);
update.appState[0].isSome = Bool(true);
update.appState[0].value = Field.one;
update.delegate.isSome = Bool(true);
update.delegate.value = PrivateKey.random().toPublicKey();
update.permissions.isSome = Bool(true);
update.permissions.value = {
  ...Permissions.default(),
  setVerificationKey: Permissions.none(),
  setPermissions: Permissions.none(),
  receive: Permissions.proof(),
};
testInput(Update, Ledger.hashInputFromJson.update, update);

function testInput<T>(
  Module: Experimental.AsFieldsAndAux<T, any>,
  toInputOcaml: (json: string) => InputOcaml,
  value: T
) {
  let json = Module.toJson(value);
  let input1 = inputFromOcaml(toInputOcaml(JSON.stringify(json)));
  let input2 = Module.toInput(value);

  console.log('snarkyjs', JSON.stringify(input2));
  console.log();
  console.log('protocol', JSON.stringify(input1));
  console.log('ok?', JSON.stringify(input2) === JSON.stringify(input1));
  console.log();

  let fields1 = Ledger.hashInputFromJson.packInput(inputToOcaml(input1));
  let fields2 = packToFields(input2);
  // console.log(JSON.stringify(fields1));
  // console.log(JSON.stringify(fields2));
  console.log(
    'packed ok?',
    JSON.stringify(fields1) === JSON.stringify(fields2)
  );
  console.log();
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
