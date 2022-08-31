export {
  Group,
  Scalar,
  AsFieldElements,
  Ledger,
  isReady,
  shutdown,
} from './snarky.js';
export { Field, Bool } from './lib/core.js';
export type { VerificationKey, Keypair } from './snarky.js';
export * from './snarky/addons.js';
export { Poseidon, TokenSymbol } from './lib/hash.js';
export * from './lib/signature.js';
export {
  Circuit,
  CircuitValue,
  prop,
  arrayProp,
  matrixProp,
  public_,
  circuitMain,
  circuitValue,
} from './lib/circuit_value.js';
export { UInt32, UInt64, Int64, Sign } from './lib/int.js';
export { Types } from './snarky/types.js';

export * as Mina from './lib/mina.js';
export {
  SmartContract,
  method,
  deploy,
  DeployArgs,
  signFeePayer,
  declareMethods,
  Account,
} from './lib/zkapp.js';
export { state, State, declareState } from './lib/state.js';
export { Proof, SelfProof, ZkProgram, verify } from './lib/proof_system.js';

export {
  Token,
  Party,
  Permissions,
  ZkappPublicInput,
  partiesToJson,
} from './lib/party.js';
export {
  fetchAccount,
  fetchLastBlock,
  addCachedAccount,
  setGraphqlEndpoint,
  sendZkapp,
} from './lib/fetch.js';
export * as Encryption from './lib/encryption.js';
export * as Encoding from './lib/encoding.js';
export { Character, CircuitString } from './lib/string.js';

// experimental APIs
import { Reducer, Callback, partyFromCallback } from './lib/zkapp.js';
import { createChildParty } from './lib/party.js';
import {
  memoizeWitness,
  AsFieldsAndAux as AsFieldsAndAux_,
} from './lib/circuit_value.js';
import { jsLayout, asFieldsAndAux } from './snarky/types.js';
import { packToFields } from './lib/hash.js';
import { MerkleTree, MerkleWitness } from './lib/merkle_tree.js';
export { Experimental };

const Experimental_ = {
  Reducer,
  Callback,
  partyFromCallback,
  createChildParty,
  memoizeWitness,
  // TODO: for testing, maybe remove later
  jsLayout,
  asFieldsAndAux,
  packToFields,
  MerkleTree,
  MerkleWitness,
};

type Callback_ = Callback;

/**
 * This module exposes APIs that are unstable, in the sense that the API surface is expected to change.
 * (Not unstable in the sense that they are less functional or tested than other parts.)
 */
namespace Experimental {
  export let Reducer = Experimental_.Reducer;
  export let createChildParty = Experimental_.createChildParty;
  export let memoizeWitness = Experimental_.memoizeWitness;
  export let jsLayout = Experimental_.jsLayout;
  export let asFieldsAndAux = Experimental_.asFieldsAndAux;
  export let packToFields = Experimental_.packToFields;
  export let MerkleTree = Experimental_.MerkleTree;
  export let MerkleWitness = Experimental_.MerkleWitness;
  export let partyFromCallback = Experimental_.partyFromCallback;
  export type AsFieldsAndAux<T, TJson> = AsFieldsAndAux_<T, TJson>;
  export let Callback = Experimental_.Callback;
  export type Callback = Callback_;
}
