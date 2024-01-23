import {
  AccountUpdate,
  Field,
  Hashed,
  Poseidon,
  Provable,
  Struct,
  TokenId,
} from 'o1js';
import { MerkleList, ProvableHashable, WithStackHash } from './merkle-list.js';

export { CallForest, PartialCallForest };

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

class CallForest extends MerkleList.create(CallTree, merkleListHash) {
  static fromAccountUpdates(updates: AccountUpdate[]) {
    let forest = CallForest.empty();

    for (let update of [...updates].reverse()) {
      let accountUpdate = HashedAccountUpdate.hash(update);
      let calls = CallForest.fromAccountUpdates(update.children.accountUpdates);
      forest.push({ accountUpdate, calls });
    }

    return forest;
  }
}

class ForestMayUseToken extends Struct({
  forest: CallForest.provable,
  mayUseToken: AccountUpdate.MayUseToken.type,
}) {}
const PendingForests = MerkleList.create<ForestMayUseToken>(ForestMayUseToken);

type MayUseToken = AccountUpdate['body']['mayUseToken'];
const MayUseToken = AccountUpdate.MayUseToken;

class PartialCallForest {
  current: ForestMayUseToken;
  pending: MerkleList<ForestMayUseToken>;

  constructor(forest: CallForest, mayUseToken: MayUseToken) {
    this.current = { forest, mayUseToken };
    this.pending = PendingForests.empty();
  }

  popAccountUpdate(selfToken: Field) {
    // get next account update from the current forest (might be a dummy)
    let { accountUpdate, calls } = this.current.forest.pop();
    let forest = new CallForest(calls);
    let restOfForest = this.current.forest;

    this.pending.pushIf(restOfForest.notEmpty(), {
      forest: restOfForest,
      mayUseToken: this.current.mayUseToken,
    });

    // check if this account update / it's children can use the token
    let update = accountUpdate.unhash();

    let canAccessThisToken = Provable.equal(
      MayUseToken.type,
      update.body.mayUseToken,
      this.current.mayUseToken
    );
    let isSelf = TokenId.derive(update.publicKey, update.tokenId).equals(
      selfToken
    );

    let usesThisToken = update.tokenId
      .equals(selfToken)
      .and(canAccessThisToken);

    // if we don't have to check the children, replace forest with an empty one
    let checkSubtree = canAccessThisToken.and(isSelf.not());
    forest = Provable.if(
      checkSubtree,
      CallForest.provable,
      forest,
      CallForest.empty()
    );

    // if the current forest is empty, switch to the next pending forest
    let current = { forest, mayUseToken: MayUseToken.InheritFromParent };
    let currentIsEmpty = forest.isEmpty();

    let pendingForests = this.pending.clone();
    let next = this.pending.pop();
    let nextPendingForests = this.pending;

    this.current = Provable.if(
      currentIsEmpty,
      ForestMayUseToken,
      next,
      current
    );
    this.pending = Provable.if(
      currentIsEmpty,
      PendingForests.provable,
      nextPendingForests,
      pendingForests
    );

    return { update, usesThisToken };
  }
}

// how to hash a forest

function merkleListHash(forestHash: Field, tree: CallTree) {
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
