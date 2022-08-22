import { Mina, PublicKey } from 'snarkyjs';
import { VotingApp, VotingAppParams } from './factory';
import { Membership_ } from './membership';
import {
  ElectionPreconditions,
  ParticipantPreconditions,
} from './preconditions';
import { Voting_ } from './voting';

import { OffchainStorage } from './off_chain_storage';
import { Member } from './member';

type Votes = OffchainStorage<Member>;
type Candidates = OffchainStorage<Member>;
type Voters = OffchainStorage<Member>;

const HeightCandidateTree = 8;
const HeightVoterTree = 8;

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

console.log('Running Voting script...');

// I really hope this factory pattern works with SnarkyJS' contracts
// one voting instance always consists of three contracts: two membership contracts and one voting contract
// this pattern will hopefully help us deploy multiple sets of voting apps
// with different preconditions efficiently for integration tests
// ! the VotingApp() factory returns a set of compiled contract instances

// dummy set to demonstrate how the script will function
console.log('Starting run for set 1...');

let params_set1: VotingAppParams = {
  candidatePreconditions: ParticipantPreconditions.default,
  voterPreconditions: ParticipantPreconditions.default,
  electionPreconditions: ElectionPreconditions.default,
  voterAddress: PublicKey.empty(),
  candidateAddress: PublicKey.empty(),
  votingAddress: PublicKey.empty(),
};

let storage_set1 = {
  votesStore: new OffchainStorage<Member>(HeightVoterTree),
  candidatesStore: new OffchainStorage<Member>(HeightCandidateTree),
  votersStore: new OffchainStorage<Member>(HeightCandidateTree),
};

console.log('Building contracts for set 1...');
let contracts_set1 = await VotingApp(params_set1);

console.log('Testing set 1...');
await testSet(contracts_set1, params_set1, storage_set1);

// ..

// dummy set to demonstrate how the script will function
console.log('Starting run for set 2...');

let params_set2: VotingAppParams = {
  candidatePreconditions: ParticipantPreconditions.default,
  voterPreconditions: ParticipantPreconditions.default,
  electionPreconditions: ElectionPreconditions.default,
  voterAddress: PublicKey.empty(),
  candidateAddress: PublicKey.empty(),
  votingAddress: PublicKey.empty(),
};

let storage_set2 = {
  votesStore: new OffchainStorage<Member>(HeightVoterTree),
  candidatesStore: new OffchainStorage<Member>(HeightCandidateTree),
  votersStore: new OffchainStorage<Member>(HeightCandidateTree),
};

console.log('Building contracts for set 2...');
let contracts_set2 = await VotingApp(params_set1);

console.log('Testing set 1...');
await testSet(contracts_set2, params_set2, storage_set2);

// do our thing before we create another set
// sets need to be created and used in series,
// parallel creation of sets doesnt work with the current "factory" pattern

// ..

/**
 * Function used to test a set of contracts and precondition
 * @param set A set of contracts
 * @param params A set of preconditions and parameters
 * @param storage A set of off-chain storage
 */
async function testSet(
  set: {
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
  // TODO: do our testing here
  throw new Error('Not implemented');
}
