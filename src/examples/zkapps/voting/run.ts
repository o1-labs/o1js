import { Mina } from 'snarkyjs';
import { VotingApp } from './factory';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

console.log('Running Voting script...');

// I really hope this factory pattern works with SnarkyJS' contracts
let VotingAppSet = VotingApp();
