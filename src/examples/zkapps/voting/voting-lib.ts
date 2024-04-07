import { Member, MyMerkleWitness } from './member.js';
import { OffchainStorage } from './off-chain-storage.js';
import { Voting_ } from './voting.js';
import { Mina, PrivateKey } from 'o1js';

/**
 * Updates off-chain storage when registering a member or candidate
 * @param {bigint} i index of memberStore or candidatesStore
 * @param {Member} m member to register
 * @param {OffchainStorage<Member>} store  off-chain store which should be used when registering a new member
 * @param {any} Local  local blockchain instance in use
 */
export function registerMember(
  i: bigint,
  m: Member,
  store: OffchainStorage<Member>,
  Local: any
): Member {
  Local.addAccount(m.publicKey, m.balance.toString());

  // we will also have to keep track of new voters and candidates within our off-chain merkle tree
  store.set(i, m); // setting voter 0n
  // setting the merkle witness
  m.witness = new MyMerkleWitness(store.getWitness(i));

  return m;
}

/**
 * Updates off-chain storage after voting
 * @param {bigint} i                            index of candidateStore and votesStore
 * @param {OffchainStorage<Member>} votesStore  votes off-chain storage
 * @param {OffchainStorage<Member>} votesStore  candidates off-chain storage
 */
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

/**
 * Prints the voting results of an election
 */
export function getResults(
  voting: Voting_,
  votesStore: OffchainStorage<Member>
) {
  if (!voting.committedVotes.get().equals(votesStore.getRoot()).toBoolean()) {
    throw new Error('On-chain root is not up to date with the off-chain tree');
  }

  let result: Record<string, number> = {};
  votesStore.forEach((m, i) => {
    result[m.publicKey.toBase58()] = Number(m.votes.toString());
  });
  return result;
}

/**
 * Checks if a transaction is valid.
 * If it is expected to fail, an expected error message needs to be provided
 * @boolean expectedToBeValid - true if the transaction is expected to pass without error
 */
export async function assertValidTx(
  expectToBeValid: boolean,
  cb: () => Promise<void>,
  signers: PrivateKey | [PrivateKey, ...PrivateKey[]],
  msg?: string
) {
  let failed = false;
  let err;
  if (!Array.isArray(signers)) signers = [signers];
  let [feePayer] = signers;
  try {
    let tx = await Mina.transaction(feePayer.toPublicKey(), cb);
    await tx.prove();
    await tx.sign(signers).send();
  } catch (e: any) {
    failed = true;
    err = e;
  }

  if (!failed && expectToBeValid) {
    console.log('> transaction valid!');
  } else if (failed && expectToBeValid) {
    console.error('transaction failed but should have passed');
    console.log(cb.toString());
    console.error('with error message: ');
    throw Error(err);
  } else if (failed && !expectToBeValid) {
    if (err.message.includes(msg ?? 'NO__EXPECTED_ERROR_MESSAGE_SET')) {
      console.log('> transaction failed, as expected!');
    } else {
      console.log(err);
      throw Error('transaction failed, but got a different error message!');
    }
  } else if (!failed && !expectToBeValid) {
    throw Error('transaction passed but should have failed');
  } else {
    throw Error('transaction was expected to fail but it passed');
  }
}
