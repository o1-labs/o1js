/*
 * used to do a dry run, without tests
 * ./run ./src/examples/zkapps/voting/demo.ts
 *
 * Warning: The reducer API in o1js is currently not safe to use in production applications. The `reduce()`
 * method breaks if more than the hard-coded number (default: 32) of actions are pending. Work is actively
 * in progress to mitigate this limitation.
 */

import { Mina, AccountUpdate, PrivateKey, UInt64, Reducer, Bool } from 'o1js';
import { VotingApp, VotingAppParams } from './factory.js';
import { Member, MyMerkleWitness } from './member.js';
import { OffchainStorage } from './off-chain-storage.js';
import { ParticipantPreconditions, ElectionPreconditions } from './preconditions.js';

let Local = await Mina.LocalBlockchain({
  proofsEnabled: false,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(Local);

let [feePayer] = Local.testAccounts;

let tx;

// B62qra25W4URGXxZYqYjfkXBa6SfwwrSjX2ZFJ24x12sSy8khGRcRH1
let voterKey = PrivateKey.fromBase58('EKEgiGWBmGG77ERKU7ihArYbUTfroEr466Gs1RKUph8bgpvF5BSD');
// B62qohqUFi8iy5mA4roZDNEuHdj1bWtyriYZouybC33wb8Q6AiUc7D7
let candidateKey = PrivateKey.fromBase58('EKELdqBuWoNa4KFibyumCJNCr1SzMFJi5mV3pCASXfNH3geh6ezG');
// B62qq2s61y9gzALPWSAFitucxq1PhLEjQLGwb65gQ7UgsVFNTtjrzRj
let votingKey = PrivateKey.fromBase58('EKFHGpCJTuQk1xHTkQH3q3xXJCHMQLPwhy5iTJk3L2bK4FG9iVnv');

let params: VotingAppParams = {
  candidatePreconditions: new ParticipantPreconditions(UInt64.from(100), UInt64.from(1000)),
  voterPreconditions: new ParticipantPreconditions(UInt64.from(10), UInt64.from(200)),
  electionPreconditions: ElectionPreconditions.default,
  voterKey,
  candidateKey,
  votingKey,
  doProofs: true,
};
params.electionPreconditions.enforce = Bool(true);

let contracts = await VotingApp(params);

let voterStore = new OffchainStorage<Member>(3);
let candidateStore = new OffchainStorage<Member>(3);
let votesStore = new OffchainStorage<Member>(3);

let initialRoot = voterStore.getRoot();
tx = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer, 3);

  await contracts.voting.deploy();
  contracts.voting.committedVotes.set(votesStore.getRoot());
  contracts.voting.accumulatedVotes.set(Reducer.initialActionState);

  await contracts.candidateContract.deploy();
  contracts.candidateContract.committedMembers.set(candidateStore.getRoot());
  contracts.candidateContract.accumulatedMembers.set(Reducer.initialActionState);

  await contracts.voterContract.deploy();
  contracts.voterContract.committedMembers.set(voterStore.getRoot());
  contracts.voterContract.accumulatedMembers.set(Reducer.initialActionState);
});
await tx.sign([feePayer.key, votingKey, candidateKey, voterKey]).send();

let m: Member = Member.empty();
// lets register three voters
tx = await Mina.transaction(feePayer, async () => {
  // creating and registering a new voter
  m = registerMember(
    /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
    0n,
    Member.from(PrivateKey.random().toPublicKey(), UInt64.from(150)),
    voterStore
  );

  contracts.voting.voterRegistration(m);
});
await tx.prove();
await tx.sign([feePayer.key]).send();

// lets register three voters
tx = await Mina.transaction(feePayer, async () => {
  // creating and registering a new voter
  m = registerMember(
    /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
    1n,
    Member.from(PrivateKey.random().toPublicKey(), UInt64.from(160)),
    voterStore
  );

  contracts.voting.voterRegistration(m);
});
await tx.prove();
await tx.sign([feePayer.key]).send();

// lets register three voters
tx = await Mina.transaction(feePayer, async () => {
  // creating and registering a new voter
  m = registerMember(
    /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
    2n,
    Member.from(PrivateKey.random().toPublicKey(), UInt64.from(170)),
    voterStore
  );

  contracts.voting.voterRegistration(m);
});
await tx.prove();
await tx.sign([feePayer.key]).send();

/*
  since the voting contract calls the voter membership contract via invoking voterRegister,
  the membership contract will then emit one event per new member
  we should have emitted three new members
  */
console.log('3 events?? ', (await contracts.voterContract.reducer.fetchActions()).length === 3);

/*

    Lets register two candidates

  */
tx = await Mina.transaction(feePayer, async () => {
  // creating and registering 1 new candidate
  let m = registerMember(
    /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
    0n,
    Member.from(PrivateKey.random().toPublicKey(), UInt64.from(250)),
    candidateStore
  );

  contracts.voting.candidateRegistration(m);
});

await tx.prove();
await tx.sign([feePayer.key]).send();

tx = await Mina.transaction(feePayer, async () => {
  // creating and registering 1 new candidate
  let m = registerMember(
    /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
    1n,
    Member.from(PrivateKey.random().toPublicKey(), UInt64.from(400)),
    candidateStore
  );

  contracts.voting.candidateRegistration(m);
});

await tx.prove();
await tx.sign([feePayer.key]).send();

/*
  since the voting contact calls the candidate membership contract via invoking candidateRegister,
  the membership contract will then emit one event per new member
  we should have emitted 2 new members, because we registered 2 new candidates
  */
console.log('2 events?? ', (await contracts.candidateContract.reducer.fetchActions()).length === 2);

/*
  we only emitted sequence events,
  so the merkel roots of both membership contract should still be the initial ones
  because the committed state should only change after publish has been invoked
  */

console.log(
  'still initial root? ',
  contracts.candidateContract.committedMembers.get().equals(initialRoot).toBoolean()
);
console.log(
  'still initial root? ',
  contracts.voterContract.committedMembers.get().equals(initialRoot).toBoolean()
);

/*
  if we now call approveVoters, which invokes publish on both membership contracts,
  we will also update the committed members!
  and since we keep track of voters and candidates in our off-chain storage,
  both the on-chain committedMembers variable and the off-chain merkle tree root need to be equal
  */

tx = await Mina.transaction(feePayer, async () => {
  contracts.voting.approveRegistrations();
});

await tx.prove();
await tx.sign([feePayer.key]).send();

for (let a of candidateStore.values()) {
  console.log(a.publicKey.toBase58());
}

console.log(
  'candidate root? ',
  contracts.candidateContract.committedMembers.get().equals(candidateStore.getRoot()).toBoolean()
);
console.log(
  'voter root? ',
  contracts.voterContract.committedMembers.get().equals(voterStore.getRoot()).toBoolean()
);

/*
    lets vote for the one candidate we have
  */
// we have to up the slot so we are within our election period
Local.incrementGlobalSlot(5);
tx = await Mina.transaction(feePayer, async () => {
  let c = candidateStore.get(0n)!;
  c.witness = new MyMerkleWitness(candidateStore.getWitness(0n));
  c.votesWitness = new MyMerkleWitness(votesStore.getWitness(0n));
  // we are voting for candidate c, 0n, with voter 2n
  contracts.voting.vote(c, voterStore.get(2n)!);
});

await tx.prove();
await tx.sign([feePayer.key]).send();
// after the transaction went through, we have to update our off chain store as well
vote(0n);

// vote dispatches a new sequence events, so we should have one

console.log(
  '1 vote sequence event? ',
  (await contracts.voting.reducer.fetchActions()).length === 1
);

/*
    counting the votes
  */
tx = await Mina.transaction(feePayer, async () => {
  contracts.voting.countVotes();
});

await tx.prove();
await tx.sign([feePayer.key]).send();

// vote dispatches a new sequence events, so we should have one

console.log(
  'votes roots equal? ',
  votesStore.getRoot().equals(contracts.voting.committedVotes.get()).toBoolean()
);

printResult();

function registerMember(i: bigint, m: Member, store: OffchainStorage<Member>): Member {
  Local.addAccount(m.publicKey, m.balance.toString());

  // we will also have to keep track of new voters and candidates within our off-chain merkle tree
  store.set(i, m); // setting voter 0n
  // setting the merkle witness
  m.witness = new MyMerkleWitness(store.getWitness(i));
  return m;
}

function vote(i: bigint) {
  let c_ = votesStore.get(i)!;
  if (!c_) {
    votesStore.set(i, candidateStore.get(i)!);
    c_ = votesStore.get(i)!;
  }
  c_ = c_.addVote();
  votesStore.set(i, c_);
  return c_;
}

function printResult() {
  if (!contracts.voting.committedVotes.get().equals(votesStore.getRoot()).toBoolean()) {
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
