import {
  Mina,
  AccountUpdate,
  Field,
  PrivateKey,
  UInt64,
  UInt32,
  Permissions,
} from 'snarkyjs';
import { deployContracts, deployInvalidContracts } from './deployContracts.js';
import { DummyContract } from './dummyContract.js';
import { VotingAppParams } from './factory.js';
import { Member, MyMerkleWitness } from './member.js';
import { Membership_ } from './membership.js';
import { OffchainStorage } from './off_chain_storage.js';
import { Voting_ } from './voting.js';
import {
  assertValidTx,
  getResults,
  registerMember,
  vote,
} from './voting_lib.js';

type Votes = OffchainStorage<Member>;
type Candidates = OffchainStorage<Member>;
type Voters = OffchainStorage<Member>;

/**
 * Function used to test a set of contracts and precondition
 * @param contracts A set of contracts
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
  let { votersStore, candidatesStore, votesStore } = storage;

  /*
    test case description:
      change verification key of a deployed zkapp
    
    preconditions:
      - contracts are deployed and valid
      - verification key changes

    tested cases:
      - deploy contract and make sure they are valid
      - change verification key
      - proofs should fail since verification key is outdated

    expected results:
      - transaction fails if verification key does not match the proof 

  */
  console.log('deploying testing phase 1 contracts');

  let verificationKeySet = await deployContracts(
    contracts,
    params,
    Field(0),
    Field(0),
    Field(0),
    true
  );
  console.log('checking that the tx is valid using default verification key');

  await assertValidTx(
    true,
    () => {
      let m = Member.from(
        PrivateKey.random().toPublicKey(),

        UInt64.from(15)
      );
      verificationKeySet.Local.addAccount(m.publicKey, m.balance.toString());

      verificationKeySet.voting.voterRegistration(m);
    },
    verificationKeySet.feePayer
  );

  console.log('changing verification key');
  let { verificationKey } = await DummyContract.compile();

  await assertValidTx(
    true,
    () => {
      let vkUpdate = AccountUpdate.createSigned(params.votingKey);
      vkUpdate.account.verificationKey.set({
        ...verificationKey,
        hash: Field(verificationKey.hash),
      });
    },
    verificationKeySet.feePayer
  );

  await assertValidTx(
    false,
    () => {
      let m = Member.from(
        PrivateKey.random().toPublicKey(),

        UInt64.from(15)
      );
      verificationKeySet.Local.addAccount(m.publicKey, m.balance.toString());

      verificationKeySet.voting.voterRegistration(m);
    },
    verificationKeySet.feePayer,
    'Invalid proof'
  );

  /*
    test case description:
      permissions of the zkapp account change in the middle of a transaction
    
    preconditions:
      - set of voting contracts deployed
      - permissions allow the transaction to pass
      - trying to register a valid member
      - changing permissions mid-transaction

    tested cases:
      - making sure a transaction passed with default permissions -> tx success
      - changing the permissions to disallow the transaction to pass -> tx failure
      - changing permissions back to default that allows the transaction to pass -> tx success
      - changing permissions back to default on its own -> tx success
      - invoking a method on its own -> success

    expected results:
      - transaction fails or succeeds, depending on the ordering of permissions changes

  */
  console.log('deploying testing phase 2 contracts');

  let permissionedSet = await deployContracts(
    contracts,
    params,
    Field(0),
    Field(0),
    Field(0)
  );
  console.log('checking that the tx is valid using default permissions');

  await assertValidTx(
    true,
    () => {
      let m = Member.from(
        PrivateKey.random().toPublicKey(),

        UInt64.from(15)
      );
      permissionedSet.Local.addAccount(m.publicKey, m.balance.toString());

      permissionedSet.voting.voterRegistration(m);
    },
    permissionedSet.feePayer
  );

  console.log('trying to change permissions...');

  await assertValidTx(
    true,
    () => {
      let permUpdate = AccountUpdate.createSigned(params.voterKey);

      permUpdate.account.permissions.set({
        ...Permissions.default(),
        setPermissions: Permissions.none(),
        editSequenceState: Permissions.impossible(),
      });
    },
    permissionedSet.feePayer
  );

  console.log('trying to invoke method with invalid permissions...');

  await assertValidTx(
    false,
    () => {
      let m = Member.from(
        PrivateKey.random().toPublicKey(),

        UInt64.from(15)
      );
      permissionedSet.Local.addAccount(m.publicKey, m.balance.toString());

      permissionedSet.voting.voterRegistration(m);
    },
    permissionedSet.feePayer,
    'sequenceEvents'
  );

  /*
    test case description:
      voting contract is trying to call methods of an invalid contract 
    
    preconditions:
      - real voting contract deployed
      - voter and candidate membership contracts are faulty (empty/dummy contracts)
      - trying to register a valid voter member

    tested cases:
      - deploying set of invalid contracts
        - trying to invoke a non-existent method -> failure

    expected results:
      - throws an error

  */

  console.log('deploying testing phase 3 contracts');

  let invalidSet = await deployInvalidContracts(
    contracts,
    params,
    votersStore.getRoot(),
    candidatesStore.getRoot(),
    votesStore.getRoot()
  );

  console.log('trying to invoke invalid contract method...');

  try {
    let tx = await Mina.transaction(invalidSet.feePayer.toPublicKey(), () => {
      let m = Member.from(
        PrivateKey.random().toPublicKey(),

        UInt64.from(15)
      );
      invalidSet.Local.addAccount(m.publicKey, m.balance.toString());

      invalidSet.voting.voterRegistration(m);
    });

    await tx.prove();
    await tx.sign([invalidSet.feePayer]).send();
  } catch (err: any) {
    if (!err.toString().includes('precondition_unsatisfied')) {
      throw Error(
        `Transaction should have failed but went through! Error: ${err}`
      );
    }
  }

  const initialRoot = votersStore.getRoot();

  console.log('deploying testing phase 4 contracts');

  let sequenceOverflowSet = await deployContracts(
    contracts,
    params,
    votersStore.getRoot(),
    candidatesStore.getRoot(),
    votesStore.getRoot()
  );

  /*
    test case description:
      overflowing maximum amount of sequence events allowed in the reducer (32 default)
    
    preconditions:
      - x

    tested cases:
      - emitted 33 sequence events and trying to reduce them

    expected results:
      - throws an error

  */

  console.log('trying to overflow sequence events (default 32)');

  console.log(
    'emitting more than 32 sequence events without periodically updating them'
  );
  for (let index = 0; index <= 32; index++) {
    try {
      let tx = await Mina.transaction(
        sequenceOverflowSet.feePayer.toPublicKey(),
        () => {
          let m = Member.from(
            PrivateKey.random().toPublicKey(),

            UInt64.from(15)
          );
          sequenceOverflowSet.Local.addAccount(
            m.publicKey,
            m.balance.toString()
          );

          sequenceOverflowSet.voting.voterRegistration(m);
        }
      );
      await tx.prove();
      await tx.sign([sequenceOverflowSet.feePayer]).send();
    } catch (error) {
      throw new Error('Transaction failed!');
    }
  }

  if (sequenceOverflowSet.voterContract.reducer.getActions({}).length < 32) {
    throw Error(
      `Did not emitted expected sequence events! Only emitted ${
        sequenceOverflowSet.voterContract.reducer.getActions({}).length
      }`
    );
  }

  try {
    let tx = await Mina.transaction(
      sequenceOverflowSet.feePayer.toPublicKey(),
      () => {
        sequenceOverflowSet.voting.approveRegistrations();
      }
    );
    await tx.prove();
    await tx.sign([sequenceOverflowSet.feePayer]).send();
  } catch (err: any) {
    if (!err.toString().includes('the maximum number of lists of actions')) {
      throw Error(
        `Transaction should have failed but went through! Error: ${err}`
      );
    }
  }

  console.log('deploying testing phase 5 contracts');

  let { voterContract, candidateContract, voting, feePayer, Local } =
    await deployContracts(
      contracts,
      params,
      votersStore.getRoot(),
      candidatesStore.getRoot(),
      votesStore.getRoot()
    );

  /*
    test case description:
      Happy path - invokes addEntry on voter membership SC
    
    preconditions:
      - no such member exists within the accumulator
      - the member passed in is a valid voter that passes the required preconditions
      - time window is before election has started

    tested cases:
      - voter is valid and can be registered

    expected results:
      - no state change at all
      - voter SC emits one sequence event
      - -> invoked addEntry method on voter SC

  */

  let initialAccumulatedMembers = voterContract.accumulatedMembers.get();
  let initialCommittedMembers = voterContract.committedMembers.get();

  console.log(
    `setting slot to ${params.electionPreconditions.startElection
      .sub(1)
      .toString()}, before election has started`
  );
  Local.setGlobalSlot(
    UInt32.from(params.electionPreconditions.startElection.sub(1))
  );

  console.log('attempting to register a valid voter... ');

  let newVoter1: Member;

  await assertValidTx(
    true,
    () => {
      newVoter1 = registerMember(
        0n,
        Member.from(
          PrivateKey.random().toPublicKey(),

          UInt64.from(15)
        ),
        votersStore,
        Local
      );
      // register new member
      voting.voterRegistration(newVoter1);
    },
    feePayer
  );

  if (voterContract.reducer.getActions({}).length !== 1) {
    throw Error(
      'Should have emitted 1 event after registering only one valid voter'
    );
  }

  if (
    !initialAccumulatedMembers
      .equals(voterContract.accumulatedMembers.get())
      .toBoolean() ||
    !initialCommittedMembers
      .equals(voterContract.committedMembers.get())
      .toBoolean()
  ) {
    throw Error('State changed, but should not have!');
  }

  /*
    test case description:
      checking the methods failure, depending on different predefined preconditions
      (voterPreconditions - minimum balance and maximum balance)
    
    preconditions:
      - voter has not enough balance
      - voter has a too high balance  
      - voter already exists within the sequence state
      - .. ??

    tested cases:
      - voter has not enough balance -> failure
      - voter has too high balance -> failure
      - voter registered twice -> failure


    expected results:
      - no state change at all
      - voter SC emits one sequence event
  */
  console.log('attempting to register a voter with not enough balance...');
  await assertValidTx(
    false,
    () => {
      let v = Member.from(
        PrivateKey.random().toPublicKey(),

        params.voterPreconditions.minMina.sub(1)
      );

      voting.voterRegistration(v);
    },
    feePayer,
    'rangeCheckHelper'
  );

  console.log('attempting to register a voter with too high balance...');
  await assertValidTx(
    false,
    () => {
      let v = Member.from(
        PrivateKey.random().toPublicKey(),

        params.voterPreconditions.maxMina.add(1)
      );

      voting.voterRegistration(v);
    },
    feePayer,
    'rangeCheckHelper'
  );

  console.log('attempting to register the same voter twice...');

  await assertValidTx(
    false,
    () => {
      voting.voterRegistration(newVoter1);
    },
    feePayer,
    'assert_equal'
  );

  if (voterContract.reducer.getActions({}).length !== 1) {
    throw Error(
      'Should have emitted 1 event after registering only one valid voter'
    );
  }

  /*

    test case description:
      Happy path - invokes addEntry on candidate membership SC
      (similar to voter contract)
    
    preconditions:
      - no such member exists within the accumulator
      - the member passed in is a valid candidate that passes the required preconditions
      - time window is before election has started

    tested cases:
      - candidate is valid and can be registered -> success  

    expected results:
      - no state change at all
      - voter SC emits one sequence event
      - -> invoked addEntry method on voter SC
  */
  console.log('attempting to register a candidate...');

  await assertValidTx(
    true,
    () => {
      let newCandidate = registerMember(
        0n,
        Member.from(
          PrivateKey.random().toPublicKey(),

          params.candidatePreconditions.minMina.add(1)
        ),
        candidatesStore,
        Local
      );

      // register new candidate
      voting.candidateRegistration(newCandidate);
    },
    feePayer
  );

  console.log('attempting to register another candidate...');

  await assertValidTx(
    true,
    () => {
      let newCandidate = registerMember(
        1n,
        Member.from(
          PrivateKey.random().toPublicKey(),

          params.candidatePreconditions.minMina.add(1)
        ),
        candidatesStore,
        Local
      );

      // register new candidate
      voting.candidateRegistration(newCandidate);
    },
    feePayer
  );

  let numberOfEvents = candidateContract.reducer.getActions({}).length;
  if (candidateContract.reducer.getActions({}).length !== 2) {
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

  /*
    test case description:
      approve registrations, invoked publish on both membership SCs
    
    preconditions:
      - votes and candidates were registered previously

    tested cases:
      - authorizing all members -> success
  
    expected results:
      - publish invoked
      - sequence events executed and committed state updates on both membership contracts
        - committed state should now equal off-chain state
      - voting contract state unchanged
  */
  console.log('authorizing registrations...');

  await assertValidTx(
    true,
    () => {
      // register new candidate
      voting.approveRegistrations();
    },
    feePayer
  );

  // approve updates the committed members on both contracts by invoking the publish method.
  // We check if offchain storage merkle roots match both on-chain committedMembers for voters and candidates

  if (!voting.committedVotes.get().equals(initialRoot).toBoolean()) {
    throw Error('voter contract state changed, but should not have');
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

  /*
    test case description:
      registering candidate within the election period
    
    preconditions:
      - slot has been set to within the election period

    tested cases:
      - registering candidate -> failure
      - registering voter -> failure
  
    expected results:
      - no new events emitted
      - no state changes
  */

  console.log(
    'attempting to register a candidate within the election period ...'
  );
  Local.setGlobalSlot(params.electionPreconditions.startElection.add(1));

  let previousEventsVoter = voterContract.reducer.getActions({}).length;
  let previousEventsCandidate = candidateContract.reducer.getActions({}).length;

  await assertValidTx(
    false,
    () => {
      let lateCandidate = Member.from(
        PrivateKey.random().toPublicKey(),

        UInt64.from(200)
      );
      // register late candidate
      voting.candidateRegistration(lateCandidate);
    },
    feePayer,
    'assert_equal'
  );

  console.log('attempting to register a voter within the election period ...');

  await assertValidTx(
    false,
    () => {
      let lateVoter = Member.from(
        PrivateKey.random().toPublicKey(),

        UInt64.from(50)
      );

      // register late voter
      voting.voterRegistration(lateVoter);
    },
    feePayer,
    'assert_equal'
  );

  if (previousEventsVoter !== voterContract.reducer.getActions({}).length) {
    throw Error('events emitted but should not have been');
  }
  if (
    previousEventsCandidate !== candidateContract.reducer.getActions({}).length
  ) {
    throw Error('events emitted but should not have been');
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

  /*
    test case description:
      attempting to count votes before any votes were casted
    
    preconditions:
      - no votes have been casted

    tested cases:
      - count votes -> success, but no state change

    expected results:
      - no state change
  */
  console.log('attempting to count votes but no votes were casted...');

  let beforeAccumulator = voting.accumulatedVotes.get();
  let beforeCommitted = voting.committedVotes.get();
  await assertValidTx(
    true,
    () => {
      voting.countVotes();
    },
    feePayer
  );

  if (!beforeAccumulator.equals(voting.accumulatedVotes.get()).toBoolean()) {
    throw Error('state changed but it should not have!');
  }
  if (!beforeCommitted.equals(voting.committedVotes.get()).toBoolean()) {
    throw Error('state changed but it should not have!');
  }

  /*
    test case description:
      happy path voting for candidate
    
    preconditions:
      - slot is within predefine precondition slot
      - voters and candidates have been registered previously

    tested cases:
      - voting for candidate -> success

    expected results:
      - isMember check on voter and candidate
      - vote invoked
      - vote sequence event emitted
      - state unchanged
  */
  console.log('attempting to vote for the candidate...');

  let currentCandidate: Member;

  await assertValidTx(
    true,
    () => {
      // attempting to vote for the registered candidate
      currentCandidate = candidatesStore.get(0n)!;
      currentCandidate.witness = new MyMerkleWitness(
        candidatesStore.getWitness(0n)
      );
      currentCandidate.votesWitness = new MyMerkleWitness(
        votesStore.getWitness(0n)
      );

      let v = votersStore.get(0n)!;
      v.witness = new MyMerkleWitness(votersStore.getWitness(0n));

      voting.vote(currentCandidate, v);
    },
    feePayer
  );

  vote(0n, votesStore, candidatesStore);

  numberOfEvents = voting.reducer.getActions({}).length;
  if (numberOfEvents !== 1) {
    throw Error('Should have emitted 1 event after voting for a candidate');
  }

  /*
    test case description:
      voting for invalid candidate
    
    preconditions:
      - slot is within predefine precondition slot
      - candidate is invalid (not registered)
      - voting for voter
      - unregistered voter

    tested cases:
      - voting for fake candidate -> failure
      - unregistered voter voting for candidate -> failure
      - voter voting for voter -> failure

    expected results:
      - isMember check on voter and candidate -> fails and tx fails
      - no state changes and no emitted events

  */
  console.log('attempting to vote for a fake candidate...');

  await assertValidTx(
    false,
    () => {
      // attempting to vote for the registered candidate
      let fakeCandidate = Member.from(
        PrivateKey.random().toPublicKey(),

        params.candidatePreconditions.minMina.add(1)
      );
      voting.vote(fakeCandidate, votersStore.get(0n)!);
    },
    feePayer,
    'assert_equal'
  );

  console.log('unregistered voter attempting to vote');

  await assertValidTx(
    false,
    () => {
      let fakeVoter = Member.from(
        PrivateKey.random().toPublicKey(),

        UInt64.from(50)
      );
      voting.vote(fakeVoter, votersStore.get(0n)!);
    },
    feePayer,
    'assert_equal'
  );

  console.log('attempting to vote for voter...');

  await assertValidTx(
    false,
    () => {
      const voter = votersStore.get(0n)!;

      voting.vote(voter, votersStore.get(0n)!);
    },
    feePayer,
    'assert_equal'
  );

  /*
    test case description:
      happy path - vote counting

    preconditions:
      - votes were emitted

    tested cases:
      - counting votes -> success

    expected results:
      - counts all emitted votes through sequence events
      - updates on-chain state to equal off-chain state
      - prints final result (helper function)

  */
  console.log('counting votes...');

  await assertValidTx(
    true,
    () => {
      voting.countVotes();
    },
    feePayer
  );

  if (!voting.committedVotes.get().equals(votesStore.getRoot()).toBoolean()) {
    throw Error(
      'votesStore merkle root does not match on-chain committed votes'
    );
  }

  console.log('election is over, printing results');

  let results = getResults(voting, votesStore);
  console.log(results);

  if (results[currentCandidate!.publicKey.toBase58()] !== 1) {
    throw Error(
      `Candidate ${currentCandidate!.publicKey.toBase58()} should have one vote, but has ${
        results[currentCandidate!.publicKey.toBase58()]
      } `
    );
  }

  console.log('testing after election state');

  /*
    test case description:
      registering voter and candidates AFTER election has ended
    
    preconditions:
      - election ended

    tested cases:
      - registering voter -> failure
      - registering candidate -> failure

    expected results:
      - no state changes
      - no events emitted

  */
  console.log('attempting to register voter after election has ended');

  await assertValidTx(
    false,
    () => {
      let voter = Member.from(
        PrivateKey.random().toPublicKey(),

        params.voterPreconditions.minMina.add(1)
      );
      voting.voterRegistration(voter);
    },
    feePayer,
    'assert_equal'
  );

  console.log('attempting to register candidate after election has ended');

  await assertValidTx(
    false,
    () => {
      let candidate = Member.from(
        PrivateKey.random().toPublicKey(),
        params.candidatePreconditions.minMina.add(1)
      );
      voting.candidateRegistration(candidate);
    },
    feePayer,
    'assert_equal'
  );

  console.log('test successful!');
}
