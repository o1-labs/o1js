import { AccountUpdate, Field, Hashed } from 'o1js';
import { MerkleList } from './merkle-list.js';

export { CallForest };

class CallTree {
  accountUpdate: Hashed<AccountUpdate>;
  calls: CallTree[];
}

// basically a MerkleList<CallTree> if MerkleList were generic
type CallForest = MerkleList<CallTree>[];

class PartialCallForest {
  forest: Hashed<CallForest>;
  pendingForests: MerkleList<CallForest>;
}
