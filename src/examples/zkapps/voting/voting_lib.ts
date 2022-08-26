import { Member, MerkleWitness } from './member';
import { OffchainStorage } from './off_chain_storage';
import { Voting_ } from './voting';

export function registerMember(
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

export function vote(
  i: bigint,
  votesStore: OffchainStorage<Member>,
  candidateStore: OffchainStorage<Member>
) {
  let c_ = votesStore.get(i)!;
  if (!c_) {
    votesStore.set(i, candidateStore.get(i)!);
    c_ = votesStore.get(i)!;
  }
  c_ = c_.addVote();
  votesStore.set(i, c_);
  return c_;
}

export function printResult(
  voting: Voting_,
  votesStore: OffchainStorage<Member>
) {
  if (!voting.committedVotes.get().equals(votesStore.getRoot()).toBoolean()) {
    throw new Error('On-chain root is not up to date with the off-chain tree');
  }

  let result: any = [];
  votesStore.forEach((m, i) => {
    result.push({
      [m.publicKey.toBase58()]: m.votes.toString(),
    });
  });
  console.log(result);
}
