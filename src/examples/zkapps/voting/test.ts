import { Experimental, Mina, Party, Field, PrivateKey, UInt64 } from 'snarkyjs';
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
  contracts: {
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

  let voterContract = contracts.voterContract;
  let candidateContract = contracts.candidateContract;
  let voting = contracts.voting;

  console.log('deploying set of 3 contracts');
  tx = await Mina.transaction(feePayer, () => {
    Party.fundNewAccount(feePayer, {
      initialBalance: Mina.accountCreationFee().add(Mina.accountCreationFee()),
    });

    voting.deploy({ zkappKey: params.votingKey });
    candidateContract.deploy({ zkappKey: params.candidateKey });
    voterContract.deploy({ zkappKey: params.voterKey });

    // setting the merkle root
    voterContract.committedMembers.set(storage.votersStore.getRoot());
    candidateContract.committedMembers.set(storage.candidatesStore.getRoot());
    voting.committedVotes.set(storage.votesStore.getRoot());

    // setting the initial sequence events hash
    voterContract.accumulatedMembers.set(
      Experimental.Reducer.initialActionsHash
    );
    candidateContract.accumulatedMembers.set(
      Experimental.Reducer.initialActionsHash
    );
    voting.accumulatedVotes.set(Experimental.Reducer.initialActionsHash);
  });
  tx.send();

  console.log('all contracts deployed!');

  console.log('attempting to register a voter...')

  try {
  tx = await Mina.transaction(feePayer, () => {
    let newVoter = Member.from(
      PrivateKey.random().toPublicKey(),
      Field.zero,
      UInt64.from(50)
    );
    // register new member
    contracts.voting.voterRegistration(newVoter);
    if (!params.doProofs) contracts.voting.sign(votingKey);
  });
  if (params.doProofs) await tx.prove();
  tx.send();
} catch (error) {
  console.log(error);
}
  console.log('test successful!');
}
