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
} from 'o1js';

const emptyHash = Field(2);
Provable.log('empty initial hash', emptyHash);
const nextHash = (hash: Field, action: Field) => Poseidon.hash([hash, action]);

class MerkleActions extends MerkleList.create(Field, nextHash, emptyHash) {}

let list = MerkleActions.from([Field(1), Field(2), Field(3), Field(4)]);

let iter = list.startIterating();
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
Provable.log(iter.next());
