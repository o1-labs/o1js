import {
  Experimental,
  Mina,
  Party,
  Field,
  PrivateKey,
  UInt64,
  UInt32,
} from 'snarkyjs';
import { deployContracts } from './deployContracts';
import { VotingAppParams } from './factory';
import { Member, MerkleWitness } from './member';
import { Membership_ } from './membership';
import { OffchainStorage } from './off_chain_storage';
import { Voting_ } from './voting';
import { registerMember, printResult, vote } from './voting_lib';

type Votes = OffchainStorage<Member>;
type Candidates = OffchainStorage<Member>;
type Voters = OffchainStorage<Member>;

let correctlyFails;

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

  let feePayer = Local.testAccounts[2].privateKey;

  let tx;

  let { votersStore, candidatesStore, votesStore } = storage;
  let { votingKey, candidateKey, voterKey } = params;

  const initialRoot = votersStore.getRoot();

  console.log('deploying 3 contracts ...');
  let { voterContract, candidateContract, voting } = await deployContracts(
    feePayer,
    contracts,
    params,
    votersStore.getRoot(),
    candidatesStore.getRoot(),
    votesStore.getRoot()
  );
  console.log('all contracts deployed!');

  console.log('setting slot to 0');
  Local.setGlobalSlot(UInt32.from(0));

  console.log('attempting to register a voter...');
  let newVoter1: Member;
  try {
    tx = await Mina.transaction(feePayer, () => {
      newVoter1 = registerMember(
        0n,
        Member.from(
          PrivateKey.random().toPublicKey(),
          Field.zero,
          UInt64.from(25)
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

  console.log('attempting to register a voter with not enough balance...');
  try {
    tx = await Mina.transaction(feePayer, () => {
      let v = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        params.voterPreconditions.minMina.sub(1)
      );

      // register new member
      voting.voterRegistration(v);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    handleError(err, 'assert_equal');
  }

  console.log('attempting to register a voter with too high balance...');
  try {
    tx = await Mina.transaction(feePayer, () => {
      let v = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        params.voterPreconditions.maxMina.add(1)
      );

      // register new member
      voting.voterRegistration(v);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    handleError(err, 'assert_equal');
  }

  let numberOfEvents = voterContract.reducer.getActions({}).length;
  if (numberOfEvents !== 1) {
    throw Error(
      'Should have emitted 1 event after registering only one valid voter'
    );
  }

  console.log('attempting to register another voter...');
  let newVoter2: Member;
  try {
    tx = await Mina.transaction(feePayer, () => {
      newVoter2 = registerMember(
        1n,
        Member.from(
          PrivateKey.random().toPublicKey(),
          Field.zero,
          UInt64.from(25)
        ),
        votersStore
      );

      // register new member
      voting.voterRegistration(newVoter2);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    throw Error(err);
  }
  /* 
  console.log('attempting to register another voter...');
  let newVoter3: Member;
  try {
    tx = await Mina.transaction(feePayer, () => {
      newVoter3 = registerMember(
        3n,
        Member.from(
          PrivateKey.random().toPublicKey(),
          Field.zero,
          UInt64.from(60)
        ),
        votersStore
      );

      // register new member
      voting.voterRegistration(newVoter3);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    throw Error(err);
  } */

  numberOfEvents = voterContract.reducer.getActions({}).length;
  if (numberOfEvents !== 2) {
    throw Error('Should have emitted 2 event after registering 2 valid voter');
  }

  console.log('attempting to register the same voter twice...');

  try {
    tx = await Mina.transaction(feePayer, () => {
      voting.voterRegistration(newVoter1);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    handleError(err, 'assert_equal: 1 != 0');
  }

  console.log('attempting to register a candidate...');

  try {
    tx = await Mina.transaction(feePayer, () => {
      let newCandidate = registerMember(
        0n,
        Member.from(
          PrivateKey.random().toPublicKey(),
          Field.zero,
          params.candidatePreconditions.minMina.add(1)
        ),
        candidatesStore
      );

      // register new candidate
      voting.candidateRegistration(newCandidate);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  console.log('attempting to register another candidate...');

  try {
    tx = await Mina.transaction(feePayer, () => {
      let newCandidate = registerMember(
        1n,
        Member.from(
          PrivateKey.random().toPublicKey(),
          Field.zero,
          params.candidatePreconditions.minMina.add(1)
        ),
        candidatesStore
      );

      // register new candidate
      voting.candidateRegistration(newCandidate);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  numberOfEvents = candidateContract.reducer.getActions({}).length;
  if (numberOfEvents !== 2) {
    throw Error(
      `Should have emitted 2 event after registering 2 candidates. ${numberOfEvents} emitted`
    );
  }

  // the merkle roots of both membership contract should still be the initial ones because publish hasn't been invoked
  // therefor the state should not have changes
  if (
    !candidateContract.committedMembers.get().equals(initialRoot).toBoolean()
  ) {
    throw Error('candidate merkle root is not the initialroot');
  }

  if (!voterContract.committedMembers.get().equals(initialRoot).toBoolean()) {
    throw Error('voter merkle root is not the initialroot');
  }

  console.log('authorizing registrations...');
  try {
    tx = await Mina.transaction(feePayer, () => {
      // register new candidate
      voting.authorizeRegistrations();
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  // authorizeVoters updates the committed members on both contracts by invoking the publish method.
  // We check if offchain storage merkle roots match both on-chain committedMembers for voters and candidates
  if (
    !candidateContract.committedMembers
      .get()
      .equals(candidatesStore.getRoot())
      .toBoolean()
  ) {
    throw Error(
      'candidatesStore merkle root does not match on-chain committed members'
    );
  }

  if (
    !voterContract.committedMembers
      .get()
      .equals(votersStore.getRoot())
      .toBoolean()
  ) {
    throw Error(
      'votersStore merkle root does not match on-chain committed members'
    );
  }

  console.log(
    'attempting to register a candidate within the election period ...'
  );
  Local.setGlobalSlot(params.electionPreconditions.startElection.add(1));

  try {
    tx = await Mina.transaction(feePayer, () => {
      let lateCandidate = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(200)
      );
      // register late candidate
      voting.candidateRegistration(lateCandidate);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    handleError(err, 'rangeCheckHelper');
  }

  console.log('attempting to register a voter within the election period ...');
  Local.setGlobalSlot(params.electionPreconditions.startElection.add(1));
  try {
    tx = await Mina.transaction(feePayer, () => {
      let lateVoter = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );

      // register late candidate
      voting.voterRegistration(lateVoter);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    handleError(err, 'rangeCheckHelper');
  }

  if (
    !candidateContract.committedMembers
      .get()
      .equals(candidatesStore.getRoot())
      .toBoolean()
  ) {
    throw Error(
      'candidatesStore merkle root does not match on-chain committed members'
    );
  }

  if (
    !voterContract.committedMembers
      .get()
      .equals(votersStore.getRoot())
      .toBoolean()
  ) {
    throw Error(
      'votersStore merkle root does not match on-chain committed members'
    );
  }

  console.log('attempting to vote for the candidate...');

  let currentCandidate: Member;
  try {
    tx = await Mina.transaction(feePayer, () => {
      // attempting to vote for the registered candidate
      currentCandidate = candidatesStore.get(0n)!;
      currentCandidate.witness = new MerkleWitness(
        candidatesStore.getWitness(0n)
      );
      currentCandidate.votesWitness = new MerkleWitness(
        votesStore.getWitness(0n)
      );

      let v = votersStore.get(0n)!;
      v.witness = new MerkleWitness(votersStore.getWitness(0n));

      voting.vote(currentCandidate, v);
      voting.sign(votingKey);
    });

    tx.send();
    // update offchain storage after transaction goes through
    vote(0n, votesStore, candidatesStore);
  } catch (err: any) {
    throw Error(err);
  }

  numberOfEvents = voting.reducer.getActions({}).length;
  if (numberOfEvents !== 1) {
    throw Error('Should have emitted 1 event after voting for a candidate');
  }

  console.log('attempting to vote for a fake candidate...');
  try {
    tx = await Mina.transaction(feePayer, () => {
      let fakeCandidate = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );
      voting.vote(fakeCandidate, votersStore.get(0n)!);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    handleError(err, 'assert_equal');
  }

  console.log('unregistered voter attempting to vote');
  try {
    tx = await Mina.transaction(feePayer, () => {
      let fakeVoter = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );
      voting.vote(fakeVoter, votersStore.get(0n)!);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    handleError(err, 'assert_equal');
  }

  console.log('attempting to vote for voter...');
  Local.setGlobalSlotSinceHardfork(new UInt32(5));
  try {
    tx = await Mina.transaction(feePayer, () => {
      // const candidate = candidatesStore.get(0n)!;
      const voter = votersStore.get(0n)!;

      voting.vote(voter, votersStore.get(0n)!);
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    handleError(err, 'assert_equal');
  }

  console.log('counting votes...');
  try {
    tx = await Mina.transaction(feePayer, () => {
      voting.countVotes();
      voting.sign(votingKey);
    });

    tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  printResult(voting, votesStore);
  console.log('test successful!');
}

/**
 * Test for expected failure case. Original error thrown if not expected failure case.
 * @param {any} error  The error thrown in the catch block.
 * @param {string} errorMessage  The expected error message.
 */
function handleError(error: any, errorMessage: string) {
  if (error.message.includes(errorMessage)) {
    correctlyFails = true;
    console.log(`Update correctly rejected with failing precondition.`);
  } else {
    throw Error(error);
  }
}
