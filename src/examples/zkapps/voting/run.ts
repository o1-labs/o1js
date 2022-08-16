import { Membership } from './membership';
import { Mina, Experimental } from 'snarkyjs';
import { MerkleTree, MerkleWitness } from 'dist/server/lib/merkle_tree';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

console.log('Running Voting script...');

function votingFactory() {
  return null;
}

// Add integration test script here.
