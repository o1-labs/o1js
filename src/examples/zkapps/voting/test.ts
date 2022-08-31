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
let feePayer: PrivateKey;

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

  feePayer = Local.testAccounts[2].privateKey;

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

  console.log('attempting to register a voter... ');

  let newVoter1: Member;
  await assertValidTx(true, () => {
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

  console.log('attempting to register a voter with not enough balance...');

  await assertValidTx(
    false,
    () => {
      let v = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        params.voterPreconditions.minMina.sub(1)
      );

      voting.voterRegistration(v);
      voting.sign(votingKey);
    },
    'assert_equal'
  );

  console.log('attempting to register a voter with too high balance...');

  await assertValidTx(
    false,
    () => {
      let v = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        params.voterPreconditions.maxMina.add(1)
      );

      voting.voterRegistration(v);
      voting.sign(votingKey);
    },
    'assert_equal'
  );

  let numberOfEvents = voterContract.reducer.getActions({}).length;
  if (numberOfEvents !== 1) {
    throw Error(
      'Should have emitted 1 event after registering only one valid voter'
    );
  }

  console.log('attempting to register another voter...');

  let newVoter2;
  await assertValidTx(true, () => {
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

  numberOfEvents = voterContract.reducer.getActions({}).length;
  if (numberOfEvents !== 2) {
    throw Error('Should have emitted 2 event after registering 2 valid voter');
  }

  console.log('attempting to register the same voter twice...');

  await assertValidTx(
    false,
    () => {
      voting.voterRegistration(newVoter1);
      voting.sign(votingKey);
    },
    'assert_equal: 1 != 0'
  );

  console.log('attempting to register a candidate...');

  await assertValidTx(true, () => {
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

  console.log('attempting to register another candidate...');

  await assertValidTx(true, () => {
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

  await assertValidTx(true, () => {
    // register new candidate
    voting.authorizeRegistrations();
    voting.sign(votingKey);
  });

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

  await assertValidTx(
    false,
    () => {
      let lateCandidate = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(200)
      );
      // register late candidate
      voting.candidateRegistration(lateCandidate);
      voting.sign(votingKey);
    },
    'rangeCheckHelper'
  );

  console.log('attempting to register a voter within the election period ...');

  await assertValidTx(
    false,
    () => {
      let lateVoter = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );

      // register late candidate
      voting.voterRegistration(lateVoter);
      voting.sign(votingKey);
    },
    'rangeCheckHelper'
  );

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

  await assertValidTx(true, () => {
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

  vote(0n, votesStore, candidatesStore);

  numberOfEvents = voting.reducer.getActions({}).length;
  if (numberOfEvents !== 1) {
    throw Error('Should have emitted 1 event after voting for a candidate');
  }

  console.log('attempting to vote for a fake candidate...');

  await assertValidTx(
    false,
    () => {
      // attempting to vote for the registered candidate
      let fakeCandidate = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        params.candidatePreconditions.minMina.add(1)
      );
      voting.vote(fakeCandidate, votersStore.get(0n)!);
      voting.sign(votingKey);
    },
    'assert_equal'
  );

  console.log('unregistered voter attempting to vote');

  await assertValidTx(
    false,
    () => {
      let fakeVoter = Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      );
      voting.vote(fakeVoter, votersStore.get(0n)!);
      voting.sign(votingKey);
    },
    'assert_equal'
  );

  console.log('attempting to vote for voter...');

  await assertValidTx(
    false,
    () => {
      const voter = votersStore.get(0n)!;

      voting.vote(voter, votersStore.get(0n)!);
      voting.sign(votingKey);
    },
    'assert_equal'
  );

  console.log('counting votes...');

  await assertValidTx(true, () => {
    voting.countVotes();
    voting.sign(votingKey);
  });

  printResult(voting, votesStore);
  console.log('test successful!');
}

async function assertValidTx(
  expectToBeValid: boolean,
  cb: () => void,
  msg?: string
) {
  let failed = false;
  let err;
  try {
    let tx = await Mina.transaction(feePayer, cb);
    tx.send();
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
      throw Error('transaction failed, but got a different error message!');
    }
  } else {
    throw Error('transaction was expected to fail but it passed');
  }
}
