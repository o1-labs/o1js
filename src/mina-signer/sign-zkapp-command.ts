import { Field } from '../provable/field-bigint.js';
import { PrivateKey } from '../provable/curve-bigint.js';
import {
  Json,
  AccountUpdate,
  ZkappCommand,
} from '../provable/gen/transaction-bigint.js';
import { Signed } from './TSTypes.js';
import {
  hashWithPrefix,
  packToFields,
  Poseidon,
  prefixes,
} from '../provable/poseidon-bigint.js';

function signZkappCommand(
  zkappCommand: Json.ZkappCommand,
  privateKey: PrivateKey
): Signed<ZkappCommand> {
  let zkAppCommmand_ = ZkappCommand.fromJSON(zkappCommand);
  let callForest = accountUpdatesToCallForest(zkAppCommmand_.accountUpdates);
  let commitment = callForestHash(callForest);
  // TODO memo hash
  let memoHash = 0n;
  // TODO turn feepayer into account update and hash
  let feePayerHash = 0n;
  let fullCommitment = hashWithPrefix(prefixes.accountUpdateCons, [
    memoHash,
    feePayerHash,
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
  let state = Poseidon.update(Poseidon.initialState(), fields);
  return state[0];
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
