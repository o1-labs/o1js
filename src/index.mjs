// this is the entry point for node projects that use ESM imports
import snarky from '../dist/server/index.js';
// here we can just await the promise to provide a cleaner interface
await snarky.snarkyReady;

// TODO: autogenerate this
let {
  Bool,
  Circuit,
  Field,
  Group,
  Poseidon,
  Scalar,
  shutdown,
  PrivateKey,
  PublicKey,
  Signature,
  CircuitValue,
  circuitMain,
  prop,
  public_,
  Collection,
  Index,
  IndexBase,
  IndexFactory,
  MerkleProof,
  MerkleProofFactory,
  Tree,
} = snarky;
export {
  Bool,
  Circuit,
  Field,
  Group,
  Poseidon,
  Scalar,
  shutdown,
  PrivateKey,
  PublicKey,
  Signature,
  CircuitValue,
  circuitMain,
  prop,
  public_,
  Collection,
  Index,
  IndexBase,
  IndexFactory,
  MerkleProof,
  MerkleProofFactory,
  Tree,
};
