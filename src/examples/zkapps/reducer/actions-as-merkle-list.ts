/**
 * This example shows how to iterate through incoming actions, not using `Reducer.reduce` but by
 * treating the actions as a merkle list.
 *
 * This is mainly intended as an example for using `MerkleList`, but it might also be useful as
 * a blueprint for processing actions in a custom and more explicit way.
 */
import {
  AccountUpdate,
  Bool,
  Field,
  MerkleList,
  Mina,
  Provable,
  PublicKey,
  Reducer,
  SmartContract,
  method,
  assert,
} from 'o1js';

const { Actions } = AccountUpdate;

// in this example, an action is just a public key
type Action = Field;
const Action = Field;

// the actions within one account update are a Merkle list with a custom hash
const emptyHash = Actions.empty().hash;
const nextHash = (hash: Field, action: Action) =>
  Actions.pushEvent({ hash, data: [] }, action.toFields()).hash;

class MerkleActions extends MerkleList.create(Action, nextHash, emptyHash) {}

let list = MerkleActions.from([Field(0), Field(1), Field(2), Field(3)]);
let iter = list.startIterating();

Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
