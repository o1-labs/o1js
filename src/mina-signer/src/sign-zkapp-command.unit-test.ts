import { expect } from 'expect';
import { mocks } from '../../bindings/crypto/constants.js';
import {
  AccountUpdate,
  Field,
  Json,
  ZkappCommand,
} from '../../bindings/mina-transaction/gen/transaction-bigint.js';
import * as TypesSnarky from '../../bindings/mina-transaction/gen/transaction.js';
import {
  AccountUpdate as AccountUpdateSnarky,
  ZkappCommand as ZkappCommandSnarky,
} from '../../lib/mina/account-update.js';
import { FieldConst } from '../../lib/provable/core/fieldvar.js';
import { packToFields as packToFieldsSnarky } from '../../lib/provable/crypto/poseidon.js';
import { Network, setActiveInstance } from '../../lib/mina/mina.js';
import { Ml, MlHashInput } from '../../lib/ml/conversion.js';
import {
  PrivateKey as PrivateKeySnarky,
  PublicKey as PublicKeySnarky,
} from '../../lib/provable/crypto/signature.js';
import { Random, test, withHardCoded } from '../../lib/testing/property.js';
import { PrivateKey, PublicKey } from './curve-bigint.js';
import { hashWithPrefix, packToFields, prefixes } from './poseidon-bigint.js';
import { Pickles, Test } from '../../snarky.js';
import { Memo } from './memo.js';
import { RandomTransaction } from './random-transaction.js';
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
  Signature,
  signFieldElement,
  verifyFieldElement,
} from './signature.js';
import { NetworkId } from './types.js';

let mlTest = await Test();

// monkey-patch bigint to json
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
let { parse, stringify } = JSON;
const toJSON = (x: any) => parse(stringify(x));

// public key roundtrip & consistency w/ OCaml serialization
test(Random.json.publicKey, (publicKeyBase58) => {
  let pkSnarky = PublicKeySnarky.fromBase58(publicKeyBase58);
  let pk = PublicKey.fromJSON(publicKeyBase58);
  expect(pk.x).toEqual(pkSnarky.x.toBigInt());
  expect(pk.isOdd).toEqual(pkSnarky.isOdd.toBoolean());
  expect(PublicKey.toJSON(pk)).toEqual(publicKeyBase58);
});

// empty account update
let dummy = AccountUpdate.empty();
let dummySnarky = AccountUpdateSnarky.dummy();
expect(AccountUpdate.toJSON(dummy)).toEqual(
  AccountUpdateSnarky.toJSON(dummySnarky)
);

let dummyInput = AccountUpdate.toInput(dummy);
let dummyInputSnarky = MlHashInput.from(
  mlTest.hashInputFromJson.body(
    JSON.stringify(AccountUpdateSnarky.toJSON(dummySnarky).body)
  )
);
expect(stringify(dummyInput.fields)).toEqual(
  stringify(dummyInputSnarky.fields)
);
expect(stringify(dummyInput.packed)).toEqual(
  stringify(dummyInputSnarky.packed)
);

test(
  Random.accountUpdate,
  RandomTransaction.networkId,
  (accountUpdate, networkId) => {
    const minaInstance = Network({
      networkId,
      mina: 'http://localhost:8080/graphql',
    });

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

    setActiveInstance(minaInstance);
    let hashSnarky = accountUpdateSnarky.hash();
    let hash = accountUpdateHash(accountUpdate, networkId);
    expect(hash).toEqual(hashSnarky.toBigInt());

    // check against different network hash
    expect(hash).not.toEqual(
      accountUpdateHash(
        accountUpdate,
        NetworkId.toString(networkId) === 'mainnet' ? 'testnet' : 'mainnet'
      )
    );
  }
);

// private key to/from base58
test(Random.json.privateKey, (feePayerKeyBase58) => {
  let feePayerKey = PrivateKey.fromBase58(feePayerKeyBase58);
  let feePayerKeySnarky = PrivateKeySnarky.fromBase58(feePayerKeyBase58);
  let feePayerCompressed = feePayerKeySnarky.s.toFieldsCompressed();
  expect(feePayerKey).toEqual(feePayerCompressed.field.toBigInt());
  expect(PrivateKey.toBase58(feePayerKey)).toEqual(feePayerKeyBase58);
});

// memo
let memoGenerator = withHardCoded(Random.json.memoString, 'hello world');
test(memoGenerator, (memoString) => {
  let memo = Memo.fromString(memoString);
  let memoBase58 = Memo.toBase58(memo);
  let memoBase581 = mlTest.encoding.memoToBase58(memoString);
  expect(memoBase58).toEqual(memoBase581);
  let memoRecovered = Memo.fromBase58(memoBase58);
  expect(memoRecovered).toEqual(memo);
});

// zkapp transaction - basic properties & commitment
test(
  RandomTransaction.zkappCommand,
  RandomTransaction.networkId,
  (zkappCommand, networkId, assert) => {
    zkappCommand.accountUpdates.forEach(fixVerificationKey);

    assert(isCallDepthValid(zkappCommand));
    let zkappCommandJson = ZkappCommand.toJSON(zkappCommand);
    let ocamlCommitments = mlTest.hashFromJson.transactionCommitments(
      JSON.stringify(zkappCommandJson),
      NetworkId.toString(networkId)
    );
    let callForest = accountUpdatesToCallForest(zkappCommand.accountUpdates);
    let commitment = callForestHash(callForest, networkId);
    expect(commitment).toEqual(
      FieldConst.toBigint(ocamlCommitments.commitment)
    );
  }
);

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
  RandomTransaction.networkId,
  (zkappCommandAndFeePayerKey, networkId) => {
    const { feePayerKey, zkappCommand } = zkappCommandAndFeePayerKey;
    zkappCommand.accountUpdates.forEach(fixVerificationKey);

    let feePayerKeyBase58 = PrivateKey.toBase58(feePayerKey);
    let feePayerKeySnarky = PrivateKeySnarky.fromBase58(feePayerKeyBase58);
    let feePayerAddress = PrivateKey.toPublicKey(feePayerKey);

    let { feePayer, memo: memoBase58 } = zkappCommand;
    feePayer.authorization = Signature.toBase58(Signature.dummy());
    let zkappCommandJson = ZkappCommand.toJSON(zkappCommand);

    // o1js fromJSON -> toJSON roundtrip, + consistency with mina-signer
    let zkappCommandSnarky = ZkappCommandSnarky.fromJSON(zkappCommandJson);
    let zkappCommandJsonSnarky = ZkappCommandSnarky.toJSON(zkappCommandSnarky);
    expect(JSON.stringify(zkappCommandJson)).toEqual(
      JSON.stringify(zkappCommandJsonSnarky)
    );
    let recoveredZkappCommand = ZkappCommand.fromJSON(zkappCommandJson);
    expect(recoveredZkappCommand).toEqual(zkappCommand);

    // tx commitment
    let ocamlCommitments = mlTest.hashFromJson.transactionCommitments(
      JSON.stringify(zkappCommandJson),
      NetworkId.toString(networkId)
    );
    let callForest = accountUpdatesToCallForest(zkappCommand.accountUpdates);
    let commitment = callForestHash(callForest, networkId);
    expect(commitment).toEqual(
      FieldConst.toBigint(ocamlCommitments.commitment)
    );

    let memo = Memo.fromBase58(memoBase58);
    let memoHash = Memo.hash(memo);
    let memoHashSnarky = mlTest.encoding.memoHashBase58(memoBase58);
    expect(memoHash).toEqual(FieldConst.toBigint(memoHashSnarky));

    let feePayerAccountUpdate = accountUpdateFromFeePayer(feePayer);
    let feePayerJson = AccountUpdate.toJSON(feePayerAccountUpdate);

    let feePayerInput = AccountUpdate.toInput(feePayerAccountUpdate);
    let feePayerInput1 = MlHashInput.from(
      mlTest.hashInputFromJson.body(JSON.stringify(feePayerJson.body))
    );
    expect(stringify(feePayerInput.fields)).toEqual(
      stringify(feePayerInput1.fields)
    );
    expect(stringify(feePayerInput.packed)).toEqual(
      stringify(feePayerInput1.packed)
    );

    let feePayerDigest = feePayerHash(feePayer, networkId);
    expect(feePayerDigest).toEqual(
      FieldConst.toBigint(ocamlCommitments.feePayerHash)
    );

    let fullCommitment = hashWithPrefix(prefixes.accountUpdateCons, [
      memoHash,
      feePayerDigest,
      commitment,
    ]);
    expect(fullCommitment).toEqual(
      FieldConst.toBigint(ocamlCommitments.fullCommitment)
    );

    // signature
    let sigFieldElements = signFieldElement(
      fullCommitment,
      feePayerKey,
      networkId
    );
    let sigOCaml = mlTest.signature.signFieldElement(
      ocamlCommitments.fullCommitment,
      Ml.fromPrivateKey(feePayerKeySnarky),
      NetworkId.toString(networkId)
    );

    expect(Signature.toBase58(sigFieldElements)).toEqual(sigOCaml);

    let verify = (s: Signature, id: NetworkId) =>
      verifyFieldElement(s, fullCommitment, feePayerAddress, id);

    expect(verify(sigFieldElements, networkId)).toEqual(true);
    expect(
      verify(sigFieldElements, networkId === 'mainnet' ? 'testnet' : 'mainnet')
    ).toEqual(false);

    // full end-to-end test: sign a zkapp transaction
    let sig = signZkappCommand(zkappCommandJson, feePayerKeyBase58, networkId);
    expect(sig.feePayer.authorization).toEqual(sigOCaml);

    let feePayerAddressBase58 = PublicKey.toBase58(feePayerAddress);
    expect(
      verifyZkappCommandSignature(sig, feePayerAddressBase58, networkId)
    ).toEqual(true);
    expect(
      verifyZkappCommandSignature(
        sig,
        feePayerAddressBase58,
        networkId === 'mainnet' ? 'testnet' : 'mainnet'
      )
    ).toEqual(false);
  }
);

console.log('to/from json, hashes & signatures are consistent! 🎉');

function fixVerificationKey(a: AccountUpdate) {
  // ensure verification key is valid
  if (a.body.update.verificationKey.isSome) {
    let [, data, hash] = Pickles.dummyVerificationKey();
    a.body.update.verificationKey.value = {
      data,
      hash: FieldConst.toBigint(hash),
    };
  } else {
    a.body.update.verificationKey.value = {
      data: '',
      hash: Field(0),
    };
  }
  fixVerificationKeyHash(a);
}

function fixVerificationKeyHash(a: AccountUpdate) {
  a.body.authorizationKind.verificationKeyHash = Field(
    mocks.dummyVerificationKeyHash
  );
}
