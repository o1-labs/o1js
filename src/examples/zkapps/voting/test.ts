import {
  Mina,
  AccountUpdate,
  Field,
  PrivateKey,
  UInt64,
  UInt32,
  Permissions,
  Reducer,
} from 'o1js';
import { deployContracts, deployInvalidContracts } from './deploy-contracts.js';
import { DummyContract } from './dummy-contract.js';
import { VotingAppParams } from './factory.js';
import { Member, MyMerkleWitness } from './member.js';
import { Membership_ } from './membership.js';
import { OffchainStorage } from './off-chain-storage.js';
import { Voting_ } from './voting.js';
import {
  assertValidTx,
  getResults,
  registerMember,
  vote,
} from './voting-lib.js';

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

  // toggle these to only run a subset for debugging
  let runTestingPhases = { 1: true, 2: true, 3: true, 4: true, 5: true };

  if (runTestingPhases[1]) {
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

    let m = Member.from(PrivateKey.random().toPublicKey(), UInt64.from(15));
    verificationKeySet.Local.addAccount(m.publicKey, m.balance.toString());

    await assertValidTx(
      true,
      async () => {
        await verificationKeySet.voting.voterRegistration(m);
      },
      verificationKeySet.feePayer
    );

    console.log('changing verification key');
    let { verificationKey } = await DummyContract.compile();

    await assertValidTx(
      true,
      async () => {
        let vkUpdate = AccountUpdate.createSigned(
          params.votingKey.toPublicKey()
        );
        vkUpdate.account.verificationKey.set({
          ...verificationKey,
          hash: Field(verificationKey.hash),
        });
      },
      [verificationKeySet.feePayer, params.votingKey]
    );

    m = Member.from(PrivateKey.random().toPublicKey(), UInt64.from(15));
    verificationKeySet.Local.addAccount(m.publicKey, m.balance.toString());

    await assertValidTx(
      false,
      async () => {
        await verificationKeySet.voting.voterRegistration(m);
      },
      verificationKeySet.feePayer,
      'Invalid proof'
    );
  }

  if (runTestingPhases[2]) {
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

    let m = Member.from(PrivateKey.random().toPublicKey(), UInt64.from(15));
    permissionedSet.Local.addAccount(m.publicKey, m.balance.toString());

    await assertValidTx(
      true,
      async () => {
        await permissionedSet.voting.voterRegistration(m);
      },
      permissionedSet.feePayer
    );

    console.log('trying to change permissions...');

    await assertValidTx(
      true,
      async () => {
        let permUpdate = AccountUpdate.createSigned(
          params.voterKey.toPublicKey()
        );

        permUpdate.account.permissions.set({
          ...Permissions.default(),
          setPermissions: Permissions.none(),
          editActionState: Permissions.impossible(),
        });
      },
      [permissionedSet.feePayer, params.voterKey]
    );

    console.log('trying to invoke method with invalid permissions...');

    m = Member.from(PrivateKey.random().toPublicKey(), UInt64.from(15));
    permissionedSet.Local.addAccount(m.publicKey, m.balance.toString());

    await assertValidTx(
      false,
      async () => {
        await permissionedSet.voting.voterRegistration(m);
      },
      permissionedSet.feePayer,
      'actions'
    );
  }

  if (runTestingPhases[3]) {
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

    let m = Member.from(PrivateKey.random().toPublicKey(), UInt64.from(15));
    invalidSet.Local.addAccount(m.publicKey, m.balance.toString());

    try {
      let tx = await Mina.transaction(
        invalidSet.feePayer.toPublicKey(),
        async () => {
          await invalidSet.voting.voterRegistration(m);
        }
      );
      await tx.prove();
      await tx.sign([invalidSet.feePayer]).send();
    } catch (err: any) {
      if (!err.toString().includes('fromActionState not found')) {
        throw Error(
          `Transaction should have failed, but failed with an unexpected error! ${err}`
        );
      }
    }
  }

  const initialRoot = votersStore.getRoot();

  if (runTestingPhases[4]) {
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
      overflowing maximum amount of sequence events allowed in the reducer (2)
    
    preconditions:
      - x

    tested cases:
      - emitted 3 sequence events and trying to reduce them

    expected results:
      - throws an error

  */

    console.log('trying to overflow actions (custom max: 2)');

    console.log(
      'emitting more than 2 actions without periodically updating them'
    );
    for (let index = 0; index <= 3; index++) {
      try {
        let tx = await Mina.transaction(
          sequenceOverflowSet.feePayer.toPublicKey(),
          async () => {
            let m = Member.from(
              PrivateKey.random().toPublicKey(),

              UInt64.from(15)
            );
            sequenceOverflowSet.Local.addAccount(
              m.publicKey,
              m.balance.toString()
            );

            await sequenceOverflowSet.voting.voterRegistration(m);
          }
        );
        await tx.prove();
        await tx.sign([sequenceOverflowSet.feePayer]).send();
      } catch (error) {
        throw new Error('Transaction failed!');
      }
    }

    if (actionsLength(sequenceOverflowSet.voterContract) < 3) {
      throw Error(
        `Did not emit expected actions! Only emitted ${actionsLength(
          sequenceOverflowSet.voterContract
        )}`
      );
    }

    try {
      let tx = await Mina.transaction(
        sequenceOverflowSet.feePayer.toPublicKey(),
        async () => {
          await sequenceOverflowSet.voting.approveRegistrations();
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
  }

  if (runTestingPhases[5]) {
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

    // register new member
    let newVoter1 = registerMember(
      0n,
      Member.from(PrivateKey.random().toPublicKey(), UInt64.from(15)),
      votersStore,
      Local
    );

    await assertValidTx(
      true,
      async () => {
        await voting.voterRegistration(newVoter1);
      },
      feePayer
    );

    if (actionsLength(voterContract) !== 1) {
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
    function addAccount(member: Member) {
      Local.addAccount(member.publicKey, member.balance.toString());
    }
    console.log('attempting to register a voter with not enough balance...');
    let newVoterLow = Member.from(
      PrivateKey.random().toPublicKey(),
      params.voterPreconditions.minMina.sub(1)
    );
    addAccount(newVoterLow);

    await assertValidTx(
      false,
      async () => {
        await voting.voterRegistration(newVoterLow);
      },
      feePayer,
      'Balance not high enough!'
    );

    console.log('attempting to register a voter with too high balance...');
    let newVoterHigh = Member.from(
      PrivateKey.random().toPublicKey(),
      params.voterPreconditions.maxMina.add(1)
    );
    addAccount(newVoterHigh);

    await assertValidTx(
      false,
      async () => {
        await voting.voterRegistration(newVoterHigh);
      },
      feePayer,
      'Balance too high!'
    );

    console.log('attempting to register the same voter twice...');

    await assertValidTx(
      false,
      async () => {
        await voting.voterRegistration(newVoter1);
      },
      feePayer,
      'Member already exists!'
    );

    if (actionsLength(voterContract) !== 1) {
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
      async () => {
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
        await voting.candidateRegistration(newCandidate);
      },
      feePayer
    );

    console.log('attempting to register another candidate...');

    await assertValidTx(
      true,
      async () => {
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
        await voting.candidateRegistration(newCandidate);
      },
      feePayer
    );

    let numberOfEvents = actionsLength(candidateContract);
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
      async () => {
        // register new candidate
        await voting.approveRegistrations();
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

    let previousEventsVoter = actionsLength(voterContract);
    let previousEventsCandidate = actionsLength(candidateContract);

    let lateCandidate = Member.from(
      PrivateKey.random().toPublicKey(),
      UInt64.from(200)
    );
    addAccount(lateCandidate);

    await assertValidTx(
      false,
      async () => {
        // register late candidate
        await voting.candidateRegistration(lateCandidate);
      },
      feePayer,
      'Outside of election period!'
    );

    console.log(
      'attempting to register a voter within the election period ...'
    );

    let lateVoter = Member.from(
      PrivateKey.random().toPublicKey(),
      UInt64.from(50)
    );
    addAccount(lateVoter);

    await assertValidTx(
      false,
      async () => {
        // register late voter
        await voting.voterRegistration(lateVoter);
      },
      feePayer,
      'Outside of election period!'
    );

    if (previousEventsVoter !== actionsLength(voterContract)) {
      throw Error('events emitted but should not have been');
    }
    if (previousEventsCandidate !== actionsLength(candidateContract)) {
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
      async () => {
        await voting.countVotes();
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
      async () => {
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

        await voting.vote(currentCandidate, v);
      },
      feePayer
    );

    vote(0n, votesStore, candidatesStore);

    numberOfEvents = actionsLength(voting);
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

    let fakeCandidate = Member.from(
      PrivateKey.random().toPublicKey(),
      params.candidatePreconditions.minMina.add(1)
    );
    addAccount(fakeCandidate);

    await assertValidTx(
      false,
      async () => {
        // attempting to vote for the registered candidate

        await voting.vote(fakeCandidate, votersStore.get(0n)!);
      },
      feePayer,
      'Member is not a candidate!'
    );

    console.log('unregistered voter attempting to vote');

    let fakeVoter = Member.from(
      PrivateKey.random().toPublicKey(),
      UInt64.from(50)
    );
    addAccount(fakeVoter);

    await assertValidTx(
      false,
      async () => {
        await voting.vote(fakeVoter, votersStore.get(0n)!);
      },
      feePayer,
      'Member is not a candidate!'
    );

    console.log('attempting to vote for voter...');

    await assertValidTx(
      false,
      async () => {
        const voter = votersStore.get(0n)!;
        await voting.vote(voter, votersStore.get(0n)!);
      },
      feePayer,
      'Member is not a candidate!'
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
      async () => {
        await voting.countVotes();
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

    let voter = Member.from(
      PrivateKey.random().toPublicKey(),
      params.voterPreconditions.minMina.add(1)
    );
    addAccount(voter);

    await assertValidTx(
      false,
      async () => {
        await voting.voterRegistration(voter);
      },
      feePayer,
      'Outside of election period!'
    );

    console.log('attempting to register candidate after election has ended');

    let candidate = Member.from(
      PrivateKey.random().toPublicKey(),
      params.candidatePreconditions.minMina.add(1)
    );
    addAccount(candidate);

    await assertValidTx(
      false,
      async () => {
        await voting.candidateRegistration(candidate);
      },
      feePayer,
      'Outside of election period!'
    );
  }

  console.log('test successful!');
}

// TODO maybe this type should actually be what is exported as the `Reducer` type
// the existing `Reducer` type is just a simple input argument type that can be inlined
function actionsLength(contract: { reducer: ReturnType<typeof Reducer> }) {
  return contract.reducer.getActions().data.get().length;
}
