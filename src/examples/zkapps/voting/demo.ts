// used to do a dry run, without tests
// ./run ./src/examples/zkapps/voting/demo.ts

import {
  Field,
  Mina,
  Party,
  PrivateKey,
  Permissions,
  UInt64,
  Experimental,
} from 'snarkyjs';
import { VotingApp, VotingAppParams } from './factory';
import { Member, MerkleWitness } from './member';
import { OffchainStorage } from './off_chain_storage';
import {
  ParticipantPreconditions,
  ElectionPreconditions,
} from './preconditions';

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
  candidatePreconditions: ParticipantPreconditions.default,
  voterPreconditions: ParticipantPreconditions.default,
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
    Party.fundNewAccount(feePayer, {
      initialBalance: Mina.accountCreationFee().add(Mina.accountCreationFee()),
    });

    contracts.voting.deploy({ zkappKey: votingKey });
    contracts.voting.committedVotes.set(votesStore.getRoot());

    contracts.candidateContract.deploy({ zkappKey: candidateKey });
    contracts.candidateContract.committedMembers.set(candidateStore.getRoot());

    contracts.voterContract.deploy({ zkappKey: voterKey });
    contracts.voterContract.committedMembers.set(voterStore.getRoot());
  });
  tx.send();

  // lets register three voters
  tx = await Mina.transaction(feePayer, () => {
    // creating and registering a new voter
    let m = registerMember(
      0n,
      Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(50)
      ),
      voterStore
    );

    contracts.voting.voterRegistration(m);

    m = registerMember(
      1n,
      Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(550)
      ),
      voterStore
    );

    contracts.voting.voterRegistration(m);

    m = registerMember(
      2n,
      Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(910)
      ),
      voterStore
    );

    contracts.voting.voterRegistration(m);

    if (!params.doProofs) contracts.voting.sign(votingKey);
  });

  if (params.doProofs) await tx.prove();
  tx.send();
  /*
  since the voting contact calls the voter membership contract via invoking voterRegister,
  the membership contract will then emit one event per new member
  we should have emitted three new members
  */
  console.log(
    '3 events?? ',
    contracts.voterContract.reducer.getActions({}).length == 3
  );

  /*

    Lets register one candidate

  */
  tx = await Mina.transaction(feePayer, () => {
    // creating and registering a new candidate
    let m = registerMember(
      0n,
      Member.from(
        PrivateKey.random().toPublicKey(),
        Field.zero,
        UInt64.from(600)
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
  we should have emitted one new member, because we registered one new candidate
  */
  console.log(
    '1 event?? ',
    JSON.stringify(
      contracts.candidateContract.reducer.getActions({}).length == 1
    )
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

  tx = await Mina.transaction(feePayer, () => {
    contracts.voting.vote(candidateStore.get(0n)!);
    if (!params.doProofs) contracts.voting.sign(votingKey);
  });

  if (params.doProofs) await tx.prove();
  tx.send();

  // vote dispatches a new sequence events, so we should have one

  console.log(
    '1 vote sequence event? ',
    contracts.voting.reducer.getActions({}).length == 1
  );
} catch (error) {
  console.log(error);
}

function registerMember(
  i: bigint,
  m: Member,
  store: OffchainStorage<Member>
): Member {
  // we will also have to keep track of new voters and candidates within our off-chain merkle tree
  store.set(i, m); // setting voter 0n
  // setting the merkle witness
  m.witness = new MerkleWitness(store.getWitness(i));

  return m;
}
