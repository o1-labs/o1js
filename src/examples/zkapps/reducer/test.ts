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
  Poseidon,
  PrivateKey,
} from 'o1js';
const { Actions } = AccountUpdate;

// in this example, an action is just a public key
type Action = PublicKey;
const Action = PublicKey;

// the actions within one account update are a Merkle list with a custom hash
const emptyHash = Poseidon.hash([Field(0)]);
Provable.log('we defined empty hash', emptyHash);
const nextHash = (hash: Field, action: Action) =>
  Poseidon.hash([hash, ...action.toFields()]);
//Actions.pushEvent({ hash, data: [] }, action.toFields()).hash;

class MerkleActions extends MerkleList.create(Action, nextHash, emptyHash) {}

let list = MerkleActions.from([
  PrivateKey.random().toPublicKey(),
  PrivateKey.random().toPublicKey(),
  PrivateKey.random().toPublicKey(),
]);

let iter = list.startIterating();
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());

/* 
class MList extends MerkleList.create(
  Field,
  (hash: Field, value: Field) => Poseidon.hash([hash, value]),
  Field(0)
) {}

let l = MList.from([Field(1), Field(2), Field(3), Field(4)]);
let iterOldes = l.startIteratingFromOldest();
let iter = l.startIterating();

Provable.log(iterOldes.next());
Provable.log(iterOldes.next());
Provable.log(iterOldes.next());
Provable.log(iterOldes.next());

Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
 */
