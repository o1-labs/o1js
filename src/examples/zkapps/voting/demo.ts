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
import { Member } from './member';
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

  tx = await Mina.transaction(feePayer, () => {
    let m = Member.from(
      PrivateKey.random().toPublicKey(),
      Field.zero,
      UInt64.from(50)
    );
    contracts.voting.voterRegistration(m);
    if (!params.doProofs) contracts.voting.sign(votingKey);
  });
  if (params.doProofs) await tx.prove();
  tx.send();
} catch (error) {
  console.log(error);
}
