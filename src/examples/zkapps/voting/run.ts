import { Bool, PrivateKey, UInt32, UInt64 } from 'o1js';
import { VotingApp, VotingAppParams } from './factory.js';
import {
  ElectionPreconditions,
  ParticipantPreconditions,
} from './preconditions.js';

import { OffchainStorage } from './off-chain-storage.js';
import { Member } from './member.js';
import { testSet } from './test.js';
import { getProfiler } from '../../utils/profiler.js';

console.log('Running Voting script...');

// I really hope this factory pattern works with o1js' contracts
// one voting instance always consists of three contracts: two membership contracts and one voting contract
// this pattern will hopefully help us deploy multiple sets of voting apps
// with different preconditions efficiently for integration tests
// ! the VotingApp() factory returns a set of compiled contract instances

// dummy set to demonstrate how the script will function
console.log('Starting set 1...');

let params_set1: VotingAppParams = {
  candidatePreconditions: new ParticipantPreconditions(
    UInt64.from(10),
    UInt64.from(5000)
  ),
  voterPreconditions: new ParticipantPreconditions(
    UInt64.from(10),
    UInt64.from(50)
  ),
  electionPreconditions: new ElectionPreconditions(
    UInt32.from(5),
    UInt32.from(15),
    Bool(true)
  ),
  voterKey: PrivateKey.random(),
  candidateKey: PrivateKey.random(),
  votingKey: PrivateKey.random(),
  doProofs: false,
};

let storage_set1 = {
  votesStore: new OffchainStorage<Member>(3),
  candidatesStore: new OffchainStorage<Member>(3),
  votersStore: new OffchainStorage<Member>(3),
};

console.log('Building contracts for set 1...');
let contracts_set1 = await VotingApp(params_set1);

console.log('Testing set 1...');
const VotingProfiler = getProfiler('Voting profiler set 1');
VotingProfiler.start('Voting test flow');
await testSet(contracts_set1, params_set1, storage_set1);
VotingProfiler.stop().store();
// ..
