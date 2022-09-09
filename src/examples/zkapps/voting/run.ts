import { Membership } from './membership';
import { Mina, PrivateKey, AccountUpdate, Field } from 'snarkyjs';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

console.log('Running Voting script...');

// Add integration test script here.
