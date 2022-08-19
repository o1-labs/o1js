import { Mina, PublicKey } from 'snarkyjs';
import { VotingApp, VotingAppParams } from './factory';
import {
  ElectionPreconditions,
  ParticipantPreconditions,
} from './preconditions';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

console.log('Running Voting script...');

// I really hope this factory pattern works with SnarkyJS' contracts
// one voting instance always consists of three contracts: two membership contracts and one voting contract
// this pattern will hopefully help us deploy multiple sets of voting apps
// with different preconditions efficiently for integration tests
// ! the VotingApp() factory returns a set of compiled contract instances

let set1Params: VotingAppParams = {
  candidatePreconditions: ParticipantPreconditions.default,
  voterPreconditions: ParticipantPreconditions.default,
  electionPreconditions: ElectionPreconditions.default,
  voterAddress: PublicKey.empty(),
  candidateAddress: PublicKey.empty(),
  votingAddress: PublicKey.empty(),
};

let { voterContract, candidateContract, voting } = await VotingApp(set1Params);

// do our thing before we create another set
// sets need to be created and used in series,
// parallel creation of sets doesnt work with the current "factory" pattern
