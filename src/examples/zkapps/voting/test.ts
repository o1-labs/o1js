import { Experimental, Mina, Party } from 'snarkyjs';
import { VotingAppParams } from './factory';
import { Member } from './member';
import { Membership_ } from './membership';
import { OffchainStorage } from './off_chain_storage';
import { Voting_ } from './voting';

type Votes = OffchainStorage<Member>;
type Candidates = OffchainStorage<Member>;
type Voters = OffchainStorage<Member>;

/**
 * Function used to test a set of contracts and precondition
 * @param set A set of contracts
 * @param params A set of preconditions and parameters
 * @param storage A set of off-chain storage
 */
export async function testSet(
  set: {
    voterContract: Membership_;
    candidateContract: Membership_;
    voting: Voting_;
  },
  params: VotingAppParams,
  storage: {
    votesStore: Votes;
    candidatesStore: Candidates;
    votersStore: Voters;
  }
) {
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  let feePayer = Local.testAccounts[0].privateKey;

  let tx;

  let voterContract = set.voterContract;
  let candidateContract = set.candidateContract;
  let voting = set.voting;

  console.log('deploying set of 3 contracts');
  tx = await Mina.transaction(feePayer, () => {
    Party.fundNewAccount(feePayer, { initialBalance: 0 });
    voterContract.deploy({ zkappKey: params.voterKey });
    //candidateContract.deploy({ zkappKey: params.candidateKey });
    //voting.deploy({ zkappKey: params.votingKey });

    // setting the merkle root
    voterContract.committedMembers.set(storage.votersStore.getRoot());
    //candidateContract.committedMembers.set(storage.candidatesStore.getRoot());
    //voting.committedVotes.set(storage.votesStore.getRoot());

    // setting the initial sequence events hash
    voterContract.accumulatedMembers.set(
      Experimental.Reducer.initialActionsHash
    );
    /*     candidateContract.accumulatedMembers.set(
      Experimental.Reducer.initialActionsHash
    );
    voting.accumulatedVotes.set(Experimental.Reducer.initialActionsHash); */
  });
  tx.send();

  // TODO: do our testing here
  //throw new Error('Not implemented');
  console.log('test successful!');
}
