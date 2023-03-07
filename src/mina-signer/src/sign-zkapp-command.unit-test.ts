import { expect } from 'expect';
import {
  isReady,
  Ledger,
  Bool as BoolSnarky,
  Scalar as ScalarSnarky,
  shutdown,
} from '../../snarky.js';
import {
  PrivateKey as PrivateKeySnarky,
  PublicKey as PublicKeySnarky,
} from '../../lib/signature.js';
import {
  AccountUpdate as AccountUpdateSnarky,
  ZkappCommand as ZkappCommandSnarky,
} from '../../lib/account_update.js';
import { PrivateKey, PublicKey } from '../../provable/curve-bigint.js';
import {
  AccountUpdate,
  Field,
  Json,
  ZkappCommand,
} from '../../provable/gen/transaction-bigint.js';
import * as TypesSnarky from '../../provable/gen/transaction.js';
import {
  accountUpdateFromFeePayer,
  accountUpdateHash,
  accountUpdatesToCallForest,
  callForestHash,
  feePayerHash,
  isCallDepthValid,
  signZkappCommand,
  verifyZkappCommandSignature,
} from './sign-zkapp-command.js';
import {
  hashWithPrefix,
  packToFields,
  prefixes,
} from '../../provable/poseidon-bigint.js';
import { packToFields as packToFieldsSnarky } from '../../lib/hash.js';
import { Memo } from './memo.js';
import {
  NetworkId,
  Signature,
  signFieldElement,
  verifyFieldElement,
} from './signature.js';
import { Random, test, withHardCoded } from '../../lib/testing/property.js';
import { RandomTransaction } from './random-transaction.js';
import { Pickles } from '../../snarky.js';

// monkey-patch bigint to json
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
let { parse, stringify } = JSON;
const toJSON = (x: any) => parse(stringify(x));

await isReady;

// public key roundtrip & consistency w/ OCaml serialization
test(Random.json.publicKey, (publicKeyBase58) => {
  let pkSnarky = PublicKeySnarky.fromBase58(publicKeyBase58);
  let pk = PublicKey.fromJSON(publicKeyBase58);
  expect(pk.x).toEqual(pkSnarky.x.toBigInt());
  expect(pk.isOdd).toEqual(pkSnarky.isOdd.toField().toBigInt());
  expect(PublicKey.toJSON(pk)).toEqual(publicKeyBase58);
});

// empty account update
let dummy = AccountUpdate.emptyValue();
let dummySnarky = AccountUpdateSnarky.dummy();
expect(AccountUpdate.toJSON(dummy)).toEqual(
  AccountUpdateSnarky.toJSON(dummySnarky)
);

let dummyInput = AccountUpdate.toInput(dummy);
let dummyInputSnarky = inputFromOcaml(
  toJSON(
    Ledger.hashInputFromJson.body(
      JSON.stringify(AccountUpdateSnarky.toJSON(dummySnarky).body)
    )
  )
);
expect(stringify(dummyInput.fields)).toEqual(
  stringify(dummyInputSnarky.fields)
);
expect(stringify(dummyInput.packed)).toEqual(
  stringify(dummyInputSnarky.packed)
);

test(Random.accountUpdate, (accountUpdate) => {
  fixVerificationKey(accountUpdate);

  // example account update
  let accountUpdateJson: Json.AccountUpdate =
    AccountUpdate.toJSON(accountUpdate);

  // account update hash
  let accountUpdateSnarky = AccountUpdateSnarky.fromJSON(accountUpdateJson);
  let inputSnarky = TypesSnarky.AccountUpdate.toInput(accountUpdateSnarky);
  let input = AccountUpdate.toInput(accountUpdate);
  expect(toJSON(input.fields)).toEqual(toJSON(inputSnarky.fields));
  expect(toJSON(input.packed)).toEqual(toJSON(inputSnarky.packed));

  let packed = packToFields(input);
  let packedSnarky = packToFieldsSnarky(inputSnarky);
  expect(toJSON(packed)).toEqual(toJSON(packedSnarky));

  let hash = accountUpdateHash(accountUpdate);
  let hashSnarky = accountUpdateSnarky.hash();
  expect(hash).toEqual(hashSnarky.toBigInt());
});

// private key to/from base58
test(Random.json.privateKey, (feePayerKeyBase58) => {
  let feePayerKey = PrivateKey.fromBase58(feePayerKeyBase58);
  let feePayerKeySnarky = PrivateKeySnarky.fromBase58(feePayerKeyBase58);
  let feePayerCompressed = ScalarSnarky.toFieldsCompressed(feePayerKeySnarky.s);
  expect(feePayerKey).toEqual(feePayerCompressed.field.toBigInt());
  expect(PrivateKey.toBase58(feePayerKey)).toEqual(feePayerKeyBase58);
});

// memo
let memoGenerator = withHardCoded(Random.json.memoString, 'hello world');
test(memoGenerator, (memoString) => {
  let memo = Memo.fromString(memoString);
  let memoBase58 = Memo.toBase58(memo);
  let memoBase581 = Ledger.memoToBase58(memoString);
  expect(memoBase58).toEqual(memoBase581);
  let memoRecovered = Memo.fromBase58(memoBase58);
  expect(memoRecovered).toEqual(memo);
});

// zkapp transaction - basic properties & commitment
test(RandomTransaction.zkappCommand, (zkappCommand, assert) => {
  zkappCommand.accountUpdates.forEach(fixVerificationKey);

  assert(isCallDepthValid(zkappCommand));
  let zkappCommandJson = ZkappCommand.toJSON(zkappCommand);
  let ocamlCommitments = Ledger.transactionCommitments(
    JSON.stringify(zkappCommandJson)
  );
  let callForest = accountUpdatesToCallForest(zkappCommand.accountUpdates);
  let commitment = callForestHash(callForest);
  expect(commitment).toEqual(ocamlCommitments.commitment.toBigInt());
});

// invalid zkapp transactions
test.negative(
  RandomTransaction.zkappCommandJson.invalid!,
  Random.json.privateKey,
  RandomTransaction.networkId,
  (zkappCommand, feePayerKey, networkId) => {
    signZkappCommand(zkappCommand, feePayerKey, networkId);
  }
);

// zkapp transaction
test(
  RandomTransaction.zkappCommandAndFeePayerKey,
  ({ feePayerKey, zkappCommand }) => {
    zkappCommand.accountUpdates.forEach(fixVerificationKey);

    let feePayerKeyBase58 = PrivateKey.toBase58(feePayerKey);
    let feePayerKeySnarky = PrivateKeySnarky.fromBase58(feePayerKeyBase58);
    let feePayerAddress = PrivateKey.toPublicKey(feePayerKey);

    let { feePayer, memo: memoBase58 } = zkappCommand;
    feePayer.authorization = Ledger.dummySignature();
    let zkappCommandJson = ZkappCommand.toJSON(zkappCommand);

    // snarkyjs fromJSON -> toJSON roundtrip, + consistency with mina-signer
    let zkappCommandSnarky = ZkappCommandSnarky.fromJSON(zkappCommandJson);
    let zkappCommandJsonSnarky = ZkappCommandSnarky.toJSON(zkappCommandSnarky);
    expect(JSON.stringify(zkappCommandJson)).toEqual(
      JSON.stringify(zkappCommandJsonSnarky)
    );
    let recoveredZkappCommand = ZkappCommand.fromJSON(zkappCommandJson);
    expect(recoveredZkappCommand).toEqual(zkappCommand);

    // tx commitment
    let ocamlCommitments = Ledger.transactionCommitments(
      JSON.stringify(zkappCommandJson)
    );
    let callForest = accountUpdatesToCallForest(zkappCommand.accountUpdates);
    let commitment = callForestHash(callForest);
    expect(commitment).toEqual(ocamlCommitments.commitment.toBigInt());

    let memo = Memo.fromBase58(memoBase58);
    let memoHash = Memo.hash(memo);
    let memoHashSnarky = Ledger.memoHashBase58(memoBase58);
    expect(memoHash).toEqual(memoHashSnarky.toBigInt());

    let feePayerAccountUpdate = accountUpdateFromFeePayer(feePayer);
    let feePayerJson = AccountUpdate.toJSON(feePayerAccountUpdate);

    let feePayerInput = AccountUpdate.toInput(feePayerAccountUpdate);
    let feePayerInput1 = inputFromOcaml(
      toJSON(Ledger.hashInputFromJson.body(JSON.stringify(feePayerJson.body)))
    );
    expect(stringify(feePayerInput.fields)).toEqual(
      stringify(feePayerInput1.fields)
    );
    expect(stringify(feePayerInput.packed)).toEqual(
      stringify(feePayerInput1.packed)
    );

    let feePayerDigest = feePayerHash(feePayer);
    expect(feePayerDigest).toEqual(ocamlCommitments.feePayerHash.toBigInt());

    let fullCommitment = hashWithPrefix(prefixes.accountUpdateCons, [
      memoHash,
      feePayerDigest,
      commitment,
    ]);
    expect(fullCommitment).toEqual(ocamlCommitments.fullCommitment.toBigInt());

    // signature
    let sigTestnet = signFieldElement(fullCommitment, feePayerKey, 'testnet');
    let sigMainnet = signFieldElement(fullCommitment, feePayerKey, 'mainnet');
    let sigTestnetOcaml = Ledger.signFieldElement(
      ocamlCommitments.fullCommitment,
      feePayerKeySnarky,
      false
    );
    let sigMainnetOcaml = Ledger.signFieldElement(
      ocamlCommitments.fullCommitment,
      feePayerKeySnarky,
      true
    );
    expect(Signature.toBase58(sigTestnet)).toEqual(sigTestnetOcaml);
    expect(Signature.toBase58(sigMainnet)).toEqual(sigMainnetOcaml);

    let verify = (s: Signature, id: NetworkId) =>
      verifyFieldElement(s, fullCommitment, feePayerAddress, id);
    expect(verify(sigTestnet, 'testnet')).toEqual(true);
    expect(verify(sigTestnet, 'mainnet')).toEqual(false);
    expect(verify(sigMainnet, 'testnet')).toEqual(false);
    expect(verify(sigMainnet, 'mainnet')).toEqual(true);

    // full end-to-end test: sign a zkapp transaction
    let sTest = signZkappCommand(
      zkappCommandJson,
      feePayerKeyBase58,
      'testnet'
    );
    expect(sTest.feePayer.authorization).toEqual(sigTestnetOcaml);
    let sMain = signZkappCommand(
      zkappCommandJson,
      feePayerKeyBase58,
      'mainnet'
    );
    expect(sMain.feePayer.authorization).toEqual(sigMainnetOcaml);

    let feePayerAddressBase58 = PublicKey.toBase58(feePayerAddress);
    expect(
      verifyZkappCommandSignature(sTest, feePayerAddressBase58, 'testnet')
    ).toEqual(true);
    expect(
      verifyZkappCommandSignature(sTest, feePayerAddressBase58, 'mainnet')
    ).toEqual(false);
    expect(
      verifyZkappCommandSignature(sMain, feePayerAddressBase58, 'testnet')
    ).toEqual(false);
    expect(
      verifyZkappCommandSignature(sMain, feePayerAddressBase58, 'mainnet')
    ).toEqual(true);
  }
);

console.log('to/from json, hashes & signatures are consistent! 🎉');
shutdown();

function inputFromOcaml({
  fields,
  packed,
}: {
  fields: string[];
  packed: { field: string; size: number }[];
}) {
  return {
    fields,
    packed: packed.map(({ field, size }) => [field, size] as [string, number]),
  };
}

function fixVerificationKey(a: AccountUpdate) {
  // ensure verification key is valid
  if (a.body.update.verificationKey.isSome === 1n) {
    let { data, hash } = Pickles.dummyVerificationKey();
    a.body.update.verificationKey.value = { data, hash: Field(hash) };
  } else {
    a.body.update.verificationKey.value = { data: '', hash: Field(0) };
  }
}
