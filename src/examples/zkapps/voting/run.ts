import { Membership } from './membership';
import {
  Mina,
  Experimental,
  PrivateKey,
  Party,
  UInt64,
  Field,
  Permissions,
  method,
  SmartContract,
  state,
  State,
  UInt32,
} from 'snarkyjs';
import { MerkleTree, MerkleWitness } from 'dist/server/lib/merkle_tree';
import { Member } from './member';
import { ElectionPreconditions } from './election_preconditions';
import { ParticipantPreconditions } from './participant_preconditions';
import { Voting } from './voting';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

console.log('Running Voting script...');

// Add integration test script here.

// ! dummy Voting contract

let doProofs = false;
let feePayer = Local.testAccounts[0].privateKey;
let initialBalance = 10_000_000_000;

let zkappKey = PrivateKey.random();

let VotingContract = new Voting(zkappKey.toPublicKey());

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);

  VotingContract.deploy({ zkappKey });
  if (!doProofs) {
    VotingContract.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
  }
  VotingContract.accumulatedVotes.set(Experimental.Reducer.initialActionsHash);
  VotingContract.committedVotes.set(Field.zero); // TODO: set this to the initial merkle root
});
tx.send();

let candidateKey = PrivateKey.random();
let candidate1 = Member.from(
  candidateKey.toPublicKey(),
  Field.zero,
  UInt64.from(100)
);

console.log('sending vote to candidate1');
tx = await Mina.transaction(feePayer, () => {
  VotingContract.vote(candidate1);
  if (!doProofs) {
    VotingContract.sign(zkappKey);
  }
});
if (doProofs) await tx.prove();
tx.send();

// TODO: this wont work it seems like values that extend CircuitValue cause bugs with the reducer
console.log('counting votes');
tx = await Mina.transaction(feePayer, () => {
  VotingContract.countVotes();
  if (!doProofs) {
    VotingContract.sign(zkappKey);
  }
});
if (doProofs) await tx.prove();
tx.send();
