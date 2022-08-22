import { Mina, PrivateKey, PublicKey } from 'snarkyjs';
import { VotingApp, VotingAppParams } from './factory';
import {
  ElectionPreconditions,
  ParticipantPreconditions,
} from './preconditions';

import { OffchainStorage } from './off_chain_storage';
import { Member } from './member';
import { testSet } from './test';

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
  voterKey: PrivateKey.random(),
  candidateKey: PrivateKey.random(),
  votingKey: PrivateKey.random(),
  doProofs: false,
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

// do our thing before we create another set
// sets need to be created and used in series,
// parallel creation of sets doesnt work with the current "factory" pattern

// ..
