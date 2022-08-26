import { Member, MerkleWitness } from './member';
import { OffchainStorage } from './off_chain_storage';

function registerMember(
  i: bigint,
  m: Member,
  store: OffchainStorage<Member>
): Member {
  // we will also have to keep track of new voters and candidates within our off-chain merkle tree
  store.set(i, m); // setting voter 0n
  // setting the merkle witness
  m.witness = new MerkleWitness(store.getWitness(i));

  return m;
}
