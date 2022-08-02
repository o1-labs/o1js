import { Members } from './members';
import { Mina, PrivateKey, Party, Field } from 'snarkyjs';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

console.log('Running Voting script...');

// Add integration test script here.
