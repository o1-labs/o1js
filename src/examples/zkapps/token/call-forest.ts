import { AccountUpdate, Field, Hashed, Poseidon, Unconstrained } from 'o1js';
import { MerkleList, WithStackHash, emptyHash } from './merkle-list.js';

export { CallForest };

class HashedAccountUpdate extends Hashed.create(AccountUpdate, (a) =>
  a.hash()
) {}

type CallTree = {
  accountUpdate: Hashed<AccountUpdate>;
  calls: CallForest;
};

type CallForest = WithStackHash<CallTree>;

const CallForest = {
  fromAccountUpdates(updates: AccountUpdate[]): CallForest {
    let forest = CallForest.empty();

    for (let update of [...updates].reverse()) {
      let accountUpdate = HashedAccountUpdate.hash(update);
      let calls = CallForest.fromAccountUpdates(update.children.accountUpdates);
      CallForest.cons(forest, { accountUpdate, calls });
    }
    return forest;
  },

  empty(): CallForest {
    return { hash: emptyHash, stack: Unconstrained.from([]) };
  },

  cons(forest: CallForest, tree: CallTree) {
    let node = { previousHash: forest.hash, element: tree };
    let nodeHash = CallForest.hashNode(tree);

    forest.stack.set([...forest.stack.get(), node]);
    forest.hash = CallForest.hashCons(forest, nodeHash);
  },

  hashNode(tree: CallTree) {
    return Poseidon.hashWithPrefix('MinaAcctUpdateNode**', [
      tree.accountUpdate.hash,
      tree.calls.hash,
    ]);
  },
  hashCons(forest: CallForest, nodeHash: Field) {
    return Poseidon.hashWithPrefix('MinaAcctUpdateCons**', [
      forest.hash,
      nodeHash,
    ]);
  },

  provable: WithStackHash<CallTree>(),
};

const CallForestHashed = Hashed.create(
  CallForest.provable,
  (forest) => forest.hash
);

class PartialCallForest {
  forest: Hashed<CallForest>;
  pendingForests: MerkleList<CallForest>;

  constructor(forest: CallForest) {
    this.forest = CallForestHashed.hash(forest);
    this.pendingForests = MerkleList.create(CallForest.provable, (hash, t) =>
      Poseidon.hash([hash, t.hash])
    );
  }
}
