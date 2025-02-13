import {
  AccountUpdate,
  AccountUpdateForest,
  AccountUpdateTreeBase,
  TokenId,
} from '../account-update.js';
import { Field } from '../../../provable/wrapped.js';
import { Provable } from '../../../provable/provable.js';
import { Struct } from '../../../provable/types/struct.js';
import { assert } from '../../../provable/gadgets/common.js';
import { MerkleListIterator, MerkleList } from '../../../provable/merkle-list.js';

export { TokenAccountUpdateIterator };

const AccountUpdateIterator = MerkleListIterator.create(
  AccountUpdateForest.prototype.innerProvable,
  AccountUpdateForest._nextHash,
  AccountUpdateForest.emptyHash
);

class Layer extends Struct({
  forest: AccountUpdateIterator,
  mayUseToken: AccountUpdate.MayUseToken.type,
}) {}
const ParentLayers = MerkleList.create<Layer>(Layer);

type MayUseToken = AccountUpdate['body']['mayUseToken'];
const MayUseToken = AccountUpdate.MayUseToken;

/**
 * Data structure to represent a forest of account updates that is being iterated over,
 * in the context of a token manager contract.
 *
 * The iteration is done in a depth-first manner.
 *
 * ```ts
 * let forest: AccountUpdateForest = ...;
 * let tokenIterator = TokenAccountUpdateIterator.create(forest, tokenId);
 *
 * // process the first 5 account updates in the tree
 * for (let i = 0; i < 5; i++) {
 *  let { accountUpdate, usesThisToken } = tokenIterator.next();
 *  // ... do something with the account update ...
 * }
 * ```
 *
 * **Important**: Since this is specifically used by token manager contracts to process their entire subtree
 * of account updates, the iterator skips subtrees that don't inherit token permissions and can therefore definitely not use the token.
 *
 * So, the assumption is that the consumer of this iterator is only interested in account updates that use the token.
 * We still can't avoid processing some account updates that don't use the token, therefore the iterator returns a boolean
 * `usesThisToken` alongside each account update.
 */
class TokenAccountUpdateIterator {
  currentLayer: Layer;
  unfinishedParentLayers: MerkleList<Layer>;
  selfToken: Field;

  constructor(
    forest: MerkleListIterator<AccountUpdateTreeBase>,
    mayUseToken: MayUseToken,
    selfToken: Field
  ) {
    this.currentLayer = { forest, mayUseToken };
    this.unfinishedParentLayers = ParentLayers.empty();
    this.selfToken = selfToken;
  }

  static create(forest: AccountUpdateForest, selfToken: Field) {
    return new TokenAccountUpdateIterator(
      AccountUpdateIterator.startIteratingFromLast(forest),
      MayUseToken.ParentsOwnToken,
      selfToken
    );
  }

  /**
   * Make a single step along a tree of account updates.
   *
   * This function is guaranteed to visit each account update in the tree that uses the token
   * exactly once, when called repeatedly.
   *
   * The method makes a best effort to avoid visiting account updates that are not using the token,
   * and in particular, to avoid returning dummy updates.
   * However, neither can be ruled out. We're returning { update, usesThisToken: Bool } and let the
   * caller handle the irrelevant case where `usesThisToken` is false.
   */
  next() {
    // get next account update from the current forest (might be a dummy)
    let { accountUpdate, children } = this.currentLayer.forest.previous();
    let childForest = AccountUpdateIterator.startIteratingFromLast(children);
    let childLayer = {
      forest: childForest,
      mayUseToken: MayUseToken.InheritFromParent,
    };

    let update = accountUpdate.unhash();
    let usesThisToken = update.tokenId.equals(this.selfToken);

    // check if this account update / it's children can use the token
    let canAccessThisToken = Provable.equal(
      MayUseToken.type,
      update.body.mayUseToken,
      this.currentLayer.mayUseToken
    );
    let isSelf = TokenId.derive(update.publicKey, update.tokenId).equals(this.selfToken);

    // if we don't have to check the children, ignore the forest by jumping to its end
    let skipSubtree = canAccessThisToken.not().or(isSelf);
    childForest.jumpToStartIf(skipSubtree);

    // there are three cases for how to proceed:
    // 1. if we have to process children, we step down and add the current layer to the stack of unfinished parent layers
    // 2. if we don't have to process children, but are not finished with the current layer, we stay in the current layer
    //    (below, this is the case where the current layer is first pushed to and then popped from the stack of unfinished parent layers)
    // 3. if both of the above are false, we step up to the next unfinished parent layer
    let currentForest = this.currentLayer.forest;
    let currentLayerFinished = currentForest.isAtStart();
    let childLayerFinished = childForest.isAtStart();

    this.unfinishedParentLayers.pushIf(currentLayerFinished.not(), this.currentLayer);
    let currentOrParentLayer = this.unfinishedParentLayers.popIf(childLayerFinished);

    this.currentLayer = Provable.if(childLayerFinished, Layer, currentOrParentLayer, childLayer);

    return { accountUpdate: update, usesThisToken };
  }

  assertFinished(message?: string) {
    assert(
      this.currentLayer.forest.isAtStart(),
      message ?? 'TokenAccountUpdateIterator not finished'
    );
  }
}
