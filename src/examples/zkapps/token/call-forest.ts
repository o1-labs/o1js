import { AccountUpdate, Field, Hashed, Poseidon, Struct } from 'o1js';
import { MerkleList, ProvableHashable, WithStackHash } from './merkle-list.js';

export { CallForest };

class HashedAccountUpdate extends Hashed.create(AccountUpdate, (a) =>
  a.hash()
) {}

type CallTree = {
  accountUpdate: Hashed<AccountUpdate>;
  calls: WithStackHash<CallTree>;
};
const CallTree: ProvableHashable<CallTree> = Struct({
  accountUpdate: HashedAccountUpdate.provable,
  calls: WithStackHash<CallTree>(),
});

class CallForest extends MerkleList.create(CallTree, function (hash, tree) {
  return hashCons(hash, hashNode(tree));
}) {
  static empty(): CallForest {
    return super.empty();
  }

  static fromAccountUpdates(updates: AccountUpdate[]): CallForest {
    let forest = CallForest.empty();

    for (let update of [...updates].reverse()) {
      let accountUpdate = HashedAccountUpdate.hash(update);
      let calls = CallForest.fromAccountUpdates(update.children.accountUpdates);
      forest.push({ accountUpdate, calls });
    }

    return forest;
  }
}

const PendingForests = MerkleList.create(CallForest.provable, (hash, t) =>
  Poseidon.hash([hash, t.hash])
);

class PartialCallForest {
  forest: CallForest;
  pendingForests: MerkleList<CallForest>;

  constructor(forest: CallForest) {
    this.forest = forest;
    this.pendingForests = PendingForests.empty();
  }
}

// how to hash a forest

function hashNode(tree: CallTree) {
  return Poseidon.hashWithPrefix('MinaAcctUpdateNode**', [
    tree.accountUpdate.hash,
    tree.calls.hash,
  ]);
}
function hashCons(forestHash: Field, nodeHash: Field) {
  return Poseidon.hashWithPrefix('MinaAcctUpdateCons**', [
    forestHash,
    nodeHash,
  ]);
}
