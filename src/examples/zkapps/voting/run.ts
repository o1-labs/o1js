import { Mina } from 'snarkyjs';
import { VotingApp } from './factory';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

console.log('Running Voting script...');

// I really hope this factory pattern works with SnarkyJS' contracts
// one voting instance always consists of three contracts: two membership contracts and one voting contract
// this pattern will hopefully help us deploy multiple sets of voting apps
// with different preconditions efficiently for integration tests
let VotingAppSet = VotingApp();
