import { testLocal as testActionsContract } from './actions-as-merkle-list-iterator.js';
import { testLocal as testMerkleListContract } from './actions-as-merkle-list.js';

await testMerkleListContract();
await testActionsContract();
