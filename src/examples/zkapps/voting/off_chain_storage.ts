// Merkle Tree and off chain storage

import { Experimental } from 'snarkyjs';

export {
  VoteHeight,
  CandidateHeight,
  VoterHeight,
  VoteTree,
  CandidateTree,
  VoterTree,
};

const CandidateHeight = 4;
const VoteHeight = CandidateHeight;
const VoterHeight = 8;

let CandidateTree = new Experimental.MerkleTree(CandidateHeight);
let VoteTree = new Experimental.MerkleTree(VoteHeight);
let VoterTree = new Experimental.MerkleTree(VoterHeight);

class CandidateWitness extends Experimental.MerkleWitness(CandidateHeight) {}
class VoteWitness extends Experimental.MerkleWitness(VoteHeight) {}
class VoterWitness extends Experimental.MerkleWitness(VoterHeight) {}
