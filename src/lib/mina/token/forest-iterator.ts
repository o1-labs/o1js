import {
  AccountUpdate,
  AccountUpdateForest,
  TokenId,
} from '../../account_update.js';
import { Field } from '../../core.js';
import { Provable } from '../../provable.js';
import { Struct } from '../../circuit_value.js';
import { assert } from '../../gadgets/common.js';
import {
  MerkleListIterator,
  MerkleList,
} from '../../provable-types/merkle-list.js';

export { AccountUpdateIterator, TokenAccountUpdateIterator };

class AccountUpdateIterator extends MerkleListIterator.createFromList(
  AccountUpdateForest
) {}

class Layer extends Struct({
  forest: AccountUpdateIterator.provable,
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
    forest: AccountUpdateIterator,
    mayUseToken: MayUseToken,
    selfToken: Field
  ) {
    this.currentLayer = { forest, mayUseToken };
    this.unfinishedParentLayers = ParentLayers.empty();
    this.selfToken = selfToken;
  }

  static create(forest: AccountUpdateForest, selfToken: Field) {
    return new TokenAccountUpdateIterator(
      AccountUpdateIterator.startIterating(forest),
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
    // and step down into the layer of its children
    let { accountUpdate, calls } = this.currentLayer.forest.next();
    let forest = AccountUpdateIterator.startIterating(calls);
    let parentForest = this.currentLayer.forest;

    this.unfinishedParentLayers.pushIf(parentForest.isAtEnd().not(), {
      forest: parentForest,
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
      this.selfToken
    );

    let usesThisToken = update.tokenId.equals(this.selfToken);

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

    return { accountUpdate: update, usesThisToken };
  }

  assertFinished(message?: string) {
    assert(
      this.currentLayer.forest.isAtEnd(),
      message ?? 'TokenAccountUpdateIterator not finished'
    );
  }
}
