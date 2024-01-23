import { AccountUpdate, Field, Hashed, Poseidon, Provable, Struct } from 'o1js';
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

class CallForest extends MerkleList.create(CallTree, nextHash) {
  static empty(): CallForest {
    return super.empty();
  }
  static from(value: WithStackHash<CallTree>): CallForest {
    return new this(value.hash, value.stack);
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

  pop() {
    let { accountUpdate, calls } = super.pop();
    return { accountUpdate, calls: CallForest.from(calls) };
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

  popAccountUpdate() {
    let { accountUpdate, calls: forest } = this.forest.pop();
    let restOfForest = this.forest;

    this.pendingForests.pushIf(restOfForest.isEmpty().not(), restOfForest);

    // TODO add a notion of 'current token' to partial call forest,
    // or as input to this method
    // TODO replace forest with empty forest if account update can't access current token
    let update = accountUpdate.unhash();

    let currentIsEmpty = forest.isEmpty();

    let pendingForests = this.pendingForests.clone();
    let nextForest = this.pendingForests.pop();
    let newPendingForests = this.pendingForests;

    this.forest = Provable.if(
      currentIsEmpty,
      CallForest.provable,
      nextForest,
      forest
    );
    this.pendingForests = Provable.if(
      currentIsEmpty,
      PendingForests.provable,
      newPendingForests,
      pendingForests
    );

    return update;
  }
}

// how to hash a forest

function nextHash(forestHash: Field, tree: CallTree) {
  return hashCons(forestHash, hashNode(tree));
}

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
