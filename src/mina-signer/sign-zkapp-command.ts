import { Bool, Field, Sign, UInt32 } from '../provable/field-bigint.js';
import { PrivateKey } from '../provable/curve-bigint.js';
import {
  Json,
  AccountUpdate,
  ZkappCommand,
  AuthRequired,
} from '../provable/gen/transaction-bigint.js';
import { Signed } from './TSTypes.js';
import {
  hashWithPrefix,
  packToFields,
  prefixes,
} from '../provable/poseidon-bigint.js';
import { Memo } from './memo.js';

export {
  accountUpdatesToCallForest,
  callForestHash,
  accountUpdateHash,
  feePayerHash,
  createFeePayer,
  accountUpdateFromFeePayer,
};

function signZkappCommand(
  zkappCommand: Json.ZkappCommand,
  privateKey: PrivateKey
): Signed<ZkappCommand> {
  let zkAppCommmand_ = ZkappCommand.fromJSON(zkappCommand);
  let callForest = accountUpdatesToCallForest(zkAppCommmand_.accountUpdates);
  let commitment = callForestHash(callForest);
  let memoHash = Memo.hash(Memo.fromBase58(zkAppCommmand_.memo));
  let feePayerDigest = feePayerHash(zkAppCommmand_.feePayer);
  let fullCommitment = hashWithPrefix(prefixes.accountUpdateCons, [
    memoHash,
    feePayerDigest,
    commitment,
  ]);
  // TODO create signature with privatekey on fullCommitment
  // TODO serialize account updates back to JSON and return
  throw Error('signZkappCommand unimplemented');
}

type CallTree = {
  accountUpdate: AccountUpdate;
  children: CallForest;
};
type CallForest = CallTree[];

/**
 * Turn flat list into a hierarchical structure (forest) by letting the callDepth
 * determine parent-child relationships
 */
function accountUpdatesToCallForest(updates: AccountUpdate[], callDepth = 0) {
  let remainingUpdates = callDepth > 0 ? updates : [...updates];
  let forest: CallForest = [];
  while (remainingUpdates.length > 0) {
    let accountUpdate = remainingUpdates[0];
    if (accountUpdate.body.callDepth < callDepth) return forest;
    console.assert(accountUpdate.body.callDepth === callDepth, 'toCallForest');
    remainingUpdates.shift();
    let children = accountUpdatesToCallForest(remainingUpdates, callDepth + 1);
    forest.push({ accountUpdate, children });
  }
  return forest;
}

function accountUpdateHash(update: AccountUpdate) {
  let input = AccountUpdate.toInput(update);
  let fields = packToFields(input);
  return hashWithPrefix(prefixes.body, fields);
}

function callForestHash(forest: CallForest): Field {
  let stackHash = 0n;
  for (let callTree of [...forest].reverse()) {
    let calls = callForestHash(callTree.children);
    let treeHash = accountUpdateHash(callTree.accountUpdate);
    let nodeHash = hashWithPrefix(prefixes.accountUpdateNode, [
      treeHash,
      calls,
    ]);
    stackHash = hashWithPrefix(prefixes.accountUpdateCons, [
      nodeHash,
      stackHash,
    ]);
  }
  return stackHash;
}

type FeePayer = ZkappCommand['feePayer'];

function createFeePayer(feePayer: FeePayer['body']): FeePayer {
  return { authorization: '', body: feePayer };
}
function feePayerHash(feePayer: FeePayer) {
  let accountUpdate = accountUpdateFromFeePayer(feePayer);
  return accountUpdateHash(accountUpdate);
}

function accountUpdateFromFeePayer({
  body: { fee, nonce, publicKey, validUntil },
  authorization: signature,
}: FeePayer): AccountUpdate {
  let { body } = AccountUpdate.fromJSON(JSON.parse(emptyUpdate));
  body.publicKey = publicKey;
  body.balanceChange = {
    magnitude: fee,
    sgn: Sign(-1),
  };
  body.incrementNonce = Bool(true);
  body.preconditions.network.globalSlotSinceGenesis = {
    isSome: Bool(true),
    value: {
      lower: UInt32(0),
      upper: validUntil ?? UInt32.maxValue,
    },
  };
  body.preconditions.account.nonce = {
    isSome: Bool(true),
    value: { lower: nonce, upper: nonce },
  };
  body.useFullCommitment = Bool(true);
  body.authorizationKind = { isProved: Bool(false), isSigned: Bool(true) };
  return { body, authorization: { signature } };
}

// TODO generalize "emptyValue" to a layout fold method to create complex dummies
const emptyUpdate =
  '{"body":{"publicKey":"B62qiTKpEPjGTSHZrtM8uXiKgn8So916pLmNJKDhKeyBQL9TDb3nvBG","tokenId":"wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf","update":{"appState":[null,null,null,null,null,null,null,null],"delegate":null,"verificationKey":null,"permissions":null,"zkappUri":null,"tokenSymbol":null,"timing":null,"votingFor":null},"balanceChange":{"magnitude":"0","sgn":"Positive"},"incrementNonce":false,"events":[],"sequenceEvents":[],"callData":"0","callDepth":0,"preconditions":{"network":{"snarkedLedgerHash":null,"blockchainLength":null,"minWindowDensity":null,"totalCurrency":null,"globalSlotSinceGenesis":null,"stakingEpochData":{"ledger":{"hash":null,"totalCurrency":null},"seed":null,"startCheckpoint":null,"lockCheckpoint":null,"epochLength":null},"nextEpochData":{"ledger":{"hash":null,"totalCurrency":null},"seed":null,"startCheckpoint":null,"lockCheckpoint":null,"epochLength":null}},"account":{"balance":null,"nonce":null,"receiptChainHash":null,"delegate":null,"state":[null,null,null,null,null,null,null,null],"sequenceState":null,"provedState":null,"isNew":null}},"useFullCommitment":false,"caller":"wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf","authorizationKind":"None_given"},"authorization":{"proof":null,"signature":null}}';
