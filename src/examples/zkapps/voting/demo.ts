// used to do a dry run, without tests
// ./run ./src/examples/zkapps/voting/demo.ts

import {
  Field,
  Mina,
  AccountUpdate,
  PrivateKey,
  Permissions,
  UInt64,
  Experimental,
  UInt32,
} from 'snarkyjs';
import { VotingApp, VotingAppParams } from './factory.js';
import { Member, MerkleWitness } from './member.js';
import { OffchainStorage } from './off_chain_storage.js';
import {
  ParticipantPreconditions,
  ElectionPreconditions,
} from './preconditions.js';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let feePayer = Local.testAccounts[0].privateKey;

let tx;

// B62qra25W4URGXxZYqYjfkXBa6SfwwrSjX2ZFJ24x12sSy8khGRcRH1
let voterKey = PrivateKey.fromBase58(
  'EKEgiGWBmGG77ERKU7ihArYbUTfroEr466Gs1RKUph8bgpvF5BSD'
);
// B62qohqUFi8iy5mA4roZDNEuHdj1bWtyriYZouybC33wb8Q6AiUc7D7
let candidateKey = PrivateKey.fromBase58(
  'EKELdqBuWoNa4KFibyumCJNCr1SzMFJi5mV3pCASXfNH3geh6ezG'
);
// B62qq2s61y9gzALPWSAFitucxq1PhLEjQLGwb65gQ7UgsVFNTtjrzRj
let votingKey = PrivateKey.fromBase58(
  'EKFHGpCJTuQk1xHTkQH3q3xXJCHMQLPwhy5iTJk3L2bK4FG9iVnv'
);

let params: VotingAppParams = {
  candidatePreconditions: new ParticipantPreconditions(
    UInt64.from(100),
    UInt64.from(1000)
  ),
  voterPreconditions: new ParticipantPreconditions(
    UInt64.from(10),
    UInt64.from(200)
  ),
  electionPreconditions: ElectionPreconditions.default,
  voterKey,
  candidateKey,
  votingKey,
  doProofs: false,
};

let contracts = await VotingApp(params);

let voterStore = new OffchainStorage<Member>(8);
let candidateStore = new OffchainStorage<Member>(8);
let votesStore = new OffchainStorage<Member>(8);

let initialRoot = voterStore.getRoot();
try {
  tx = await Mina.transaction(feePayer, () => {
    AccountUpdate.fundNewAccount(feePayer, {
      initialBalance: Mina.accountCreationFee().add(Mina.accountCreationFee()),
    });

    contracts.voting.deploy({ zkappKey: votingKey });
    contracts.voting.committedVotes.set(votesStore.getRoot());
    contracts.voting.accumulatedVotes.set(
      Experimental.Reducer.initialActionsHash
    );

    contracts.candidateContract.deploy({ zkappKey: candidateKey });
    contracts.candidateContract.committedMembers.set(candidateStore.getRoot());
    contracts.candidateContract.accumulatedMembers.set(
      Experimental.Reducer.initialActionsHash
    );

    contracts.voterContract.deploy({ zkappKey: voterKey });
    contracts.voterContract.committedMembers.set(voterStore.getRoot());
    contracts.voterContract.accumulatedMembers.set(
      Experimental.Reducer.initialActionsHash
    );
  });
  tx.send();
  let m: Member = Member.empty();
  // lets register three voters
  tx = await Mina.transaction(feePayer, () => {
    // creating and registering a new voter
    m = registerMember(
      /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
      0n,
      Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(150)
      ),
      voterStore
    );

    contracts.voting.voterRegistration(m);
    if (!params.doProofs) contracts.voting.sign(votingKey);
  });
  if (params.doProofs) await tx.prove();
  tx.send();

  // lets register three voters
  tx = await Mina.transaction(feePayer, () => {
    // creating and registering a new voter
    m = registerMember(
      /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
      1n,
      Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(160)
      ),
      voterStore
    );

    contracts.voting.voterRegistration(m);

    if (!params.doProofs) contracts.voting.sign(votingKey);
  });
  if (params.doProofs) await tx.prove();
  tx.send();

  // lets register three voters
  tx = await Mina.transaction(feePayer, () => {
    // creating and registering a new voter
    m = registerMember(
      /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
      2n,
      Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(170)
      ),
      voterStore
    );

    contracts.voting.voterRegistration(m);

    if (!params.doProofs) contracts.voting.sign(votingKey);
  });
  if (params.doProofs) await tx.prove();
  tx.send();

  /*
  since the voting contract calls the voter membership contract via invoking voterRegister,
  the membership contract will then emit one event per new member
  we should have emitted three new members
  */
  console.log(
    '3 events?? ',
    contracts.voterContract.reducer.getActions({}).length == 3
  );

  /*

    Lets register two candidates

  */
  tx = await Mina.transaction(feePayer, () => {
    // creating and registering 1 new candidate
    let m = registerMember(
      /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
      0n,
      Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(250)
      ),
      candidateStore
    );

    contracts.voting.candidateRegistration(m);
    if (!params.doProofs) contracts.voting.sign(votingKey);
  });

  if (params.doProofs) await tx.prove();
  tx.send();
  tx = await Mina.transaction(feePayer, () => {
    // creating and registering 1 new candidate
    let m = registerMember(
      /*
      NOTE: it isn't wise to use an incremented integer as an
      identifier for real world applications for your entries,
      but instead a public key
      */
      1n,
      Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(400)
      ),
      candidateStore
    );

    contracts.voting.candidateRegistration(m);
    if (!params.doProofs) contracts.voting.sign(votingKey);
  });

  if (params.doProofs) await tx.prove();
  tx.send();
  /*
  since the voting contact calls the candidate membership contract via invoking candidateRegister,
  the membership contract will then emit one event per new member
  we should have emitted 2 new members, because we registered 2 new candidates
  */
  console.log(
    '2 events?? ',
    contracts.candidateContract.reducer.getActions({}).length == 2
  );

  /*
  we only emitted sequence events,
  so the merkel roots of both membership contract should still be the initial ones
  because the committed state should only change after publish has been invoked
  */

  console.log(
    'still initial root? ',
    contracts.candidateContract.committedMembers
      .get()
      .equals(initialRoot)
      .toBoolean()
  );
  console.log(
    'still initial root? ',
    contracts.voterContract.committedMembers
      .get()
      .equals(initialRoot)
      .toBoolean()
  );

  /*
  if we now call authorizeVoters, which invokes publish on both membership contracts,
  we will also update the committed members!
  and since we keep track of voters and candidates in our off-chain storage,
  both the on-chain committedMembers variable and the off-chain merkle tree root need to be equal
  */

  tx = await Mina.transaction(feePayer, () => {
    contracts.voting.authorizeRegistrations();
    if (!params.doProofs) contracts.voting.sign(votingKey);
  });

  if (params.doProofs) await tx.prove();
  tx.send();

  for (let a of candidateStore.values()) {
    console.log(a.publicKey.toBase58());
  }

  console.log(
    'candidate root? ',
    contracts.candidateContract.committedMembers
      .get()
      .equals(candidateStore.getRoot())
      .toBoolean()
  );
  console.log(
    'voter root? ',
    contracts.voterContract.committedMembers
      .get()
      .equals(voterStore.getRoot())
      .toBoolean()
  );

  /*
    lets vote for the one candidate we have
  */
  // we have to up the slot so we are within our election period
  Local.setGlobalSlotSinceHardfork(new UInt32(5));
  tx = await Mina.transaction(feePayer, () => {
    let c = candidateStore.get(0n)!;
    c.witness = new MerkleWitness(candidateStore.getWitness(0n));
    c.votesWitness = new MerkleWitness(votesStore.getWitness(0n));
    // we are voting for candidate c, 0n, with voter 2n
    contracts.voting.vote(c, voterStore.get(2n)!);
    if (!params.doProofs) contracts.voting.sign(votingKey);
  });

  if (params.doProofs) await tx.prove();
  tx.send();
  // after the transaction went through, we have to update our off chain store as well
  vote(0n);

  // vote dispatches a new sequence events, so we should have one

  console.log(
    '1 vote sequence event? ',
    contracts.voting.reducer.getActions({}).length == 1
  );

  /*
    counting the votes
  */
  tx = await Mina.transaction(feePayer, () => {
    contracts.voting.countVotes();
    if (!params.doProofs) contracts.voting.sign(votingKey);
  });

  if (params.doProofs) await tx.prove();
  tx.send();

  // vote dispatches a new sequence events, so we should have one

  console.log(
    'votes roots equal? ',
    votesStore
      .getRoot()
      .equals(contracts.voting.committedVotes.get())
      .toBoolean()
  );

  printResult();
} catch (error) {
  console.log(error);
}

function registerMember(
  i: bigint,
  m: Member,
  store: OffchainStorage<Member>
): Member {
  Local.addAccount(m.publicKey, m.balance.toString());

  // we will also have to keep track of new voters and candidates within our off-chain merkle tree
  store.set(i, m); // setting voter 0n
  // setting the merkle witness
  m.witness = new MerkleWitness(store.getWitness(i));
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
  if (
    !contracts.voting.committedVotes
      .get()
      .equals(votesStore.getRoot())
      .toBoolean()
  ) {
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
