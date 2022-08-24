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
  let newVoter: Member;
  try {
    tx = await Mina.transaction(feePayer, () => {
    newVoter = Member.from(
      PrivateKey.random().toPublicKey(),
      Field.zero,
      UInt64.from(50)
    );

    // register new member
    contracts.voting.voterRegistration(newVoter);
    
  });
  if (params.doProofs) await tx.prove();
  tx.send();
} catch (err: any) {
  throw Error(err)
}

console.log('attempting to register the same voter twice...')

  try {
    tx = await Mina.transaction(feePayer, () => {
    // register new member
    contracts.voting.voterRegistration(newVoter);
    
  });
  if (params.doProofs) await tx.prove();
  tx.send();
} catch (err: any) {
  // Todo: handle expected error and throw otherwise
}


 console.log('attempting to register a candidate...')
let newCandidate: Member;
  try {
    tx = await Mina.transaction(feePayer, () => {
    newCandidate = Member.from(
      PrivateKey.random().toPublicKey(),
      Field.zero,
      UInt64.from(50)
    );

    // register new candidate
    contracts.voting.candidateRegistration(newCandidate);
    contracts.voting.sign(votingKey);
  });
  
  tx.send();
} catch (err: any) {
  throw Error(err)
}

 console.log('attempting to register a candidate outside the time window ...')
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

// isMember test cases


console.log('authrozing registrations...')
  try {
    tx = await Mina.transaction(feePayer, () => {
    // register new candidate
    contracts.voting.authorizeRegistrations();
    contracts.voting.sign(votingKey);
  });
  
  tx.send();
} catch (err: any) {
  throw Error(err)
}

console.log('attempting to vote for the new candidate...')
  try {
    tx = await Mina.transaction(feePayer, () => {
  
    contracts.voting.vote(newCandidate);
    contracts.voting.sign(votingKey);
  });
  
  tx.send();
} catch (err: any) {
  throw Error(err)
}

console.log('attempting to vote for a fake candidate...')
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

console.log('counting votes ...')
let voteCount;
  try {
    tx = await Mina.transaction(feePayer, () => {

  let fakeCandidate = Member.from(
    PrivateKey.random().toPublicKey(),
    Field.zero,
    UInt64.from(50)
  );
  voteCount  =  contracts.voting.countVotes();
    
  });
  
  tx.send();
} catch (err: any) {
   // TODO: handle errors
   throw Error(error);
}

if(voteCount === '2') {
  throw Error(`Vote count of ${voteCount} is incorrect`)
}
  console.log('test successful!');
}
