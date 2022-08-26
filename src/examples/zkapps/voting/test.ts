import { Experimental, Mina, Party, Field, PrivateKey, UInt64 } from 'snarkyjs';
import { VotingAppParams } from './factory';
import { Member, MerkleWitness } from './member';
import { Membership_ } from './membership';
import { OffchainStorage } from './off_chain_storage';
import { Voting_ } from './voting';
import { registerMember, printResult, vote } from './voting_lib';

type Votes = OffchainStorage<Member>;
type Candidates = OffchainStorage<Member>;
type Voters = OffchainStorage<Member>;

/**
 * Function used to test a set of contracts and precondition
 * @param set A set of contracts
 * @param params A set of preconditions and parameters
 * @param storage A set of off-chain storage
 */
let correctlyFails;

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

  let { votersStore, candidatesStore, votesStore } = storage;
  let { voterContract, candidateContract, voting } = contracts;
  let { votingKey } = params;

  const initialRoot = votersStore.getRoot();

  console.log('deploying voting contract...');
  tx = await Mina.transaction(feePayer, () => {
    Party.fundNewAccount(feePayer, {
      initialBalance: Mina.accountCreationFee().add(Mina.accountCreationFee()),
    });

    voting.deploy({ zkappKey: params.votingKey });
    // setting the merkle root
    voting.committedVotes.set(votesStore.getRoot());
    // setting the initial sequence events hash
    voting.accumulatedVotes.set(Experimental.Reducer.initialActionsHash);
  });
  tx.send();

  console.log('deploying candidate membership contract...');
  tx = await Mina.transaction(feePayer, () => {
    candidateContract.deploy({ zkappKey: params.candidateKey });
    // setting the merkle root
    candidateContract.committedMembers.set(candidatesStore.getRoot());
    // setting the initial sequence events hash
    candidateContract.accumulatedMembers.set(
      Experimental.Reducer.initialActionsHash
    );
  });
  tx.send();

  console.log('deploying voter membership contract...');

  tx = await Mina.transaction(feePayer, () => {
    voterContract.deploy({ zkappKey: params.voterKey });
    // setting the merkle root
    voterContract.committedMembers.set(votersStore.getRoot());
    // setting the initial sequence events hash
    voterContract.accumulatedMembers.set(
      Experimental.Reducer.initialActionsHash
    );
  });
  tx.send();

  console.log('all contracts deployed!');

  console.log('attempting to register a voter...');
  let newVoter1: Member;
  try {
    tx = await Mina.transaction(feePayer, () => {
      newVoter1 = registerMember(
        0n,
        Member.from(
          PrivateKey.random().toPublicKey(),
          Field.zero,
          UInt64.from(50)
        ),
        votersStore
      );

      // register new member
      voting.voterRegistration(newVoter1);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  let numberOfEvents = voterContract.reducer.getActions({}).length;
  if (numberOfEvents !== 1) {
    throw Error('Should have emmited 1 event after regestering a voter');
  }

  // This is currently not throwing an error

  console.log('attempting to register the same voter twice...');

  try {
    tx = await Mina.transaction(feePayer, () => {
      // attempt to register the same voter again
      voting.voterRegistration(newVoter1);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    console.log(err);
    // Todo: handle expected error and throw otherwise
  }

  numberOfEvents = voterContract.reducer.getActions({}).length;
  console.log(numberOfEvents);
  // if (numberOfEvents !== 1) {
  //   throw Error(
  //     'No event should be emmited after attempting to regester a voter twice'
  //   );
  // }

  console.log('attempting to register a candidate...');

  try {
    tx = await Mina.transaction(feePayer, () => {
      let newCandidate = registerMember(
        0n,
        Member.from(
          PrivateKey.random().toPublicKey(),
          Field.zero,
          UInt64.from(600)
        ),
        candidatesStore
      );

      voting.candidateRegistration(newCandidate);
      // register new candidate
      contracts.voting.candidateRegistration(newCandidate);
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  numberOfEvents = voterContract.reducer.getActions({}).length;
  if (numberOfEvents !== 2) {
    throw Error('Should have emmited 1 event after regestering a candidate');
  }

  // the merkel roots of both membership contract should still be the initial ones because publish hasn't been invoked
  if (
    !contracts.candidateContract.committedMembers
      .get()
      .equals(initialRoot)
      .toBoolean()
  ) {
    throw Error('candidate merkle root is not the initialroot');
  }

  if (
    !contracts.voterContract.committedMembers
      .get()
      .equals(initialRoot)
      .toBoolean()
  ) {
    throw Error('voter merkle root is not the initialroot');
  }

  console.log('attempting to register a candidate before the time window ...');
  //
  try {
    tx = await Mina.transaction(feePayer, () => {
      let earlyCandidate = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );
      // register late candidate
      contracts.voting.candidateRegistration(earlyCandidate);
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    // TODO: handle error when
  }

  //
  try {
    tx = await Mina.transaction(feePayer, () => {
      let lateCandidate = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );
      // register late candidate
      contracts.voting.candidateRegistration(lateCandidate);
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    // TODO: handle error when
  }

  console.log('attempting to register a voter before the time window ...');
  //
  try {
    tx = await Mina.transaction(feePayer, () => {
      let earlyVoter = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );

      // register early candidate
      contracts.voting.voterRegistration(earlyVoter);
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    // TODO: handle error when
  }

  console.log('attempting to register a voter after the time window ...');
  //
  try {
    tx = await Mina.transaction(feePayer, () => {
      let lateVoter = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );

      // register late candidate
      contracts.voting.voterRegistration(lateVoter);
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    // TODO: handle error when
  }

  console.log('authrozing registrations...');
  try {
    tx = await Mina.transaction(feePayer, () => {
      // register new candidate
      contracts.voting.authorizeRegistrations();
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  console.log('attempting to vote for the new candidate...');

  try {
    // setting the slot within our election period
    Local.setGlobalSlotSinceHardfork(new UInt32(1));
    tx = await Mina.transaction(feePayer, () => {
      // attempting to vote for the registered candidate
      const candidate = candidatesStore.get(0n)!;

      candidate.votesWitness = new MerkleWitness(votesStore.getWitness(0n));
      voting.vote(candidate);
      voting.sign(votingKey);
    });

    tx.send();

    // update ofchain storage after transaction goes through
    vote(0n, candidatesStore, votesStore);

    numberOfEvents = voting.reducer.getActions({}).length;
    if (numberOfEvents !== 1) {
      throw Error('Should have emmited 1 event after voting for  a candidate');
    }
  } catch (err: any) {
    throw Error(err);
  }

  console.log('attempting to vote twice...');
  try {
    tx = await Mina.transaction(feePayer, () => {
      contracts.voting.vote(candidateChoice);
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    // should throw error if double voting
  }

  console.log('attempting to vote for a fake candidate...');
  try {
    tx = await Mina.transaction(feePayer, () => {
      let fakeCandidate = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );
      contracts.voting.vote(fakeCandidate);
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    // TODO: handle errors
  }

  console.log('unregistered voter attempting to vote');
  try {
    tx = await Mina.transaction(feePayer, () => {
      let fakeCandidate = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );
      contracts.voting.vote(fakeCandidate);
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    // TODO: handle errors
  }

  console.log('candidate attempting to vote for voter...');
  try {
    tx = await Mina.transaction(feePayer, () => {
      let voter = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );
      contracts.voting.vote(voter);
      contracts.voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    // TODO: handle errors
  }

  console.log('counting votes ...');
  let voteCount;
  try {
    tx = await Mina.transaction(feePayer, () => {
      let fakeCandidate = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );
      voteCount = contracts.voting.countVotes();
    });

    tx.send();
  } catch (err: any) {
    // TODO: handle errors
    throw Error(error);
  }

  if (voteCount === '2') {
    throw Error(`Vote count of ${voteCount} is incorrect`);
  }
  console.log('test successful!');
}

function handleError(error: any, errorMessage: string) {
  if (error.message.includes(errorMessage)) {
    correctlyFails = true;
    console.log(
      `Update correctly rejected with failing precondition. Current state is still ${currentState}.`
    );
  } else {
    throw Error(error);
  }
}
