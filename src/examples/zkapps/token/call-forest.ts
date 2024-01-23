import {
  AccountUpdate,
  Field,
  Hashed,
  Poseidon,
  Provable,
  Struct,
  TokenId,
} from 'o1js';
import {
  MerkleArray,
  MerkleArrayBase,
  MerkleList,
  ProvableHashable,
} from './merkle-list.js';

export { CallForest, PartialCallForest };

class HashedAccountUpdate extends Hashed.create(AccountUpdate, (a) =>
  a.hash()
) {}

type CallTree = {
  accountUpdate: Hashed<AccountUpdate>;
  calls: MerkleArrayBase<CallTree>;
};
const CallTree: ProvableHashable<CallTree> = Struct({
  accountUpdate: HashedAccountUpdate.provable,
  calls: MerkleArrayBase<CallTree>(),
});

class CallForest extends MerkleArray.create(CallTree, merkleListHash) {
  static fromAccountUpdates(updates: AccountUpdate[]): CallForest {
    let nodes = updates.map((update) => {
      let accountUpdate = HashedAccountUpdate.hash(update);
      let calls = CallForest.fromAccountUpdates(update.children.accountUpdates);
      return { accountUpdate, calls };
    });

    return CallForest.from(nodes);
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
  unfinishedParentLayers: MerkleList<Layer>;

  constructor(forest: CallForest, mayUseToken: MayUseToken) {
    this.currentLayer = { forest, mayUseToken };
    this.unfinishedParentLayers = ParentLayers.empty();
  }

  nextAccountUpdate(selfToken: Field) {
    // get next account update from the current forest (might be a dummy)
    let { accountUpdate, calls } = this.currentLayer.forest.next();
    let forest = CallForest.startIterating(calls);
    let parentLayer = this.currentLayer.forest;

    this.unfinishedParentLayers.pushIf(parentLayer.isAtEnd(), {
      forest: parentLayer,
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

    // if we don't have to check the children, ignore the forest by jumping to its end
    let skipSubtree = canAccessThisToken.not().or(isSelf);
    forest.jumpToEndIf(skipSubtree);

    // if we're at the end of the current layer, step up to the next unfinished parent layer
    // invariant: the new current layer will _never_ be finished _except_ at the point where we stepped
    // through the entire forest and there are no remaining parent layers to finish
    let currentLayer = { forest, mayUseToken: MayUseToken.InheritFromParent };
    let currentIsFinished = forest.isAtEnd();

    let parentLayers = this.unfinishedParentLayers.clone();
    let nextParentLayer = this.unfinishedParentLayers.pop();
    let parentLayersIfSteppingUp = this.unfinishedParentLayers;

    this.currentLayer = Provable.if(
      currentIsFinished,
      Layer,
      nextParentLayer,
      currentLayer
    );
    this.unfinishedParentLayers = Provable.if(
      currentIsFinished,
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