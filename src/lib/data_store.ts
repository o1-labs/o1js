import { AccumulatorMembershipProof, Index } from './merkle_proof';
import { AsFieldElements, Field } from '../snarky';

export interface DataStore<A, P> {
  getValue: (index: Index) => A,
  getProof: (index: Index) => P,
  set: (index: Index, a: A) => void,
  commitment: () => Field,
}

export function IPFS<A>(
  eltTyp: AsFieldElements<A>,
  ipfsRoot: string
  ): DataStore<A, AccumulatorMembershipProof> {
  throw 'todo'
}

export function Disk<A>(
  eltTyp: AsFieldElements<A>,
  path: string
  ): DataStore<A, AccumulatorMembershipProof> {
  throw 'todo'
}