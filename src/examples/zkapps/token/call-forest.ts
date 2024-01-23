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

class Layer extends Struct({
  forest: CallForest.provable,
  mayUseToken: AccountUpdate.MayUseToken.type,
}) {}
const ParentLayers = MerkleList.create<Layer>(Layer);

type MayUseToken = AccountUpdate['body']['mayUseToken'];
const MayUseToken = AccountUpdate.MayUseToken;

class PartialCallForest {
  currentLayer: Layer;
  nonEmptyParentLayers: MerkleList<Layer>;

  constructor(forest: CallForest, mayUseToken: MayUseToken) {
    this.currentLayer = { forest, mayUseToken };
    this.nonEmptyParentLayers = ParentLayers.empty();
  }

  popAccountUpdate(selfToken: Field) {
    // get next account update from the current forest (might be a dummy)
    let { accountUpdate, calls } = this.currentLayer.forest.pop();
    let forest = new CallForest(calls);
    let restOfForest = this.currentLayer.forest;

    this.nonEmptyParentLayers.pushIf(restOfForest.notEmpty(), {
      forest: restOfForest,
      mayUseToken: this.currentLayer.mayUseToken,
    });

    // check if this account update / it's children can use the token
    let update = accountUpdate.unhash();

    let canAccessThisToken = Provable.equal(
      MayUseToken.type,
      update.body.mayUseToken,
      this.currentLayer.mayUseToken
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

    // if the current forest is empty, step up to the next non-empty parent layer
    // invariant: the current layer will _never_ be empty _except_ at the point where we stepped
    // through the entire forest and there are no remaining parent layers
    let currentLayer = { forest, mayUseToken: MayUseToken.InheritFromParent };
    let currentIsEmpty = forest.isEmpty();

    let parentLayers = this.nonEmptyParentLayers.clone();
    let nextParentLayer = this.nonEmptyParentLayers.pop();
    let parentLayersIfSteppingUp = this.nonEmptyParentLayers;

    this.currentLayer = Provable.if(
      currentIsEmpty,
      Layer,
      nextParentLayer,
      currentLayer
    );
    this.nonEmptyParentLayers = Provable.if(
      currentIsEmpty,
      ParentLayers.provable,
      parentLayersIfSteppingUp,
      parentLayers
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
