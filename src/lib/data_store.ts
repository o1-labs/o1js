import { AccumulatorMembershipProof, Index } from './merkle_proof';
import { AsFieldElements, Field } from '../snarky';
import {
  Tree,
  IndexFactory,
  MerkleProof,
  MerkleProofFactory,
} from './merkle_proof';
import { Poseidon } from '../snarky';
import { asFieldElementsToConstant } from './circuit_value';
import { UInt64 } from './int';
import { Circuit, Bool } from '../snarky';

export interface DataStore<A, P> {
  depth: number;
  getValue: (index: Index) => A | null;
  getIndex: (x: A) => Index | null;
  getProof: (index: Index) => P;
  nextIndex: () => Index;
  set: (index: Index, a: A) => void;
  commitment: () => Field;
}

export interface KeyedDataStore<K, V, P> {
  depth: number;
  nextIndex: () => Index;
  getIndex: (x: K) => Index | null;
  getProof: (index: Index) => P;
  getValue(k: K): { value: V; empty: boolean };
  setValue(k: K, v: V): void;
  commitment(): Field;
  /*
  depth: number,
  getValue: (index: Index) => A | null,
  getIndex: (x: A) => Index | null,
  getProof: (index: Index) => P,
  nextIndex: () => Index,
  set: (index: Index, a: A) => void,
  commitment: () => Field, */
}

export class Keyed {
  static InMemory<K, V>(
    eltTyp: AsFieldElements<V>,
    keyTyp: AsFieldElements<K>,
    key: (v: V) => K,
    depth: number
  ): KeyedDataStore<K, V, MerkleProof> {
    const keyTable: Map<string, Index> = new Map();

    const P = MerkleProofFactory(depth);
    const I = Index[depth];

    const t = new Tree<V>(depth, (x) => Poseidon.hash(eltTyp.toFields(x)), []);

    let nextIdx = 0;
    let indexes: Map<string, boolean[]> = new Map();

    let dummy = (() => {
      const n = eltTyp.sizeInFields();
      const xs = [];
      for (var i = 0; i < n; ++i) {
        xs.push(Field.zero);
      }
      return eltTyp.ofFields(xs);
    })();

    const getValue = (k: K): { value: V; empty: boolean } => {
      const h = Poseidon.hash(keyTyp.toFields(k));

      const r = indexes.get(h.toString());
      const empty = { value: dummy, empty: true };
      if (r === undefined) {
        return empty;
      } else {
        const res = t.get(r).value;
        return res === null ? empty : { value: res, empty: false };
      }
    };

    const getProof = (i: Index): MerkleProof => {
      console.log('getproof');
      const p = t.getMerklePath(i.value.map((b) => b.toBoolean()));
      console.log('getproof');
      return new P(p);
    };

    const commitment = (): Field => t.root();

    const getIndex = (k: K): Index | null => {
      const h = Poseidon.hash(keyTyp.toFields(k)).toString();
      const r = indexes.get(h);
      if (r === undefined) {
        return null;
      } else {
        return new I(r.map((b) => new Bool(b)));
      }
    };

    const nextIndex = (): Index => {
      const n = nextIdx;
      nextIdx += 1;
      return I.fromInt(n);
    };

    const setValue = (k: K, v: V) => {
      console.log('setvalu');
      const h = Poseidon.hash(keyTyp.toFields(k)).toString();
      const idx_ = indexes.get(h);
      let idx =
        idx_ === undefined ? nextIndex().value.map((b) => b.toBoolean()) : idx_;
      indexes.set(h, idx);

      console.log('setvalu');
      t.setValue(idx, v, Poseidon.hash(eltTyp.toFields(v)));
    };

    return {
      depth,
      nextIndex,
      getIndex,
      getProof,
      getValue,
      setValue,
      commitment,
    };
  }
}

export function IPFS<A>(
  eltTyp: AsFieldElements<A>,
  ipfsRoot: string
): DataStore<A, MerkleProof> {
  throw 'ipfs';
}

export function InMemory<A>(
  eltTyp: AsFieldElements<A>,
  depth: number
): DataStore<A, MerkleProof> {
  const P = MerkleProofFactory(depth);
  const I = Index[depth];

  const t = new Tree<A>(depth, (x) => Poseidon.hash(eltTyp.toFields(x)), []);
  let nextIdx = 0;
  let indexes: Map<string, boolean[]> = new Map();

  const getValue = (i: Index): A | null =>
    t.get(i.value.map((b) => b.toBoolean())).value;

  const getProof = (i: Index): MerkleProof => {
    console.log('mgetproof');
    const p = t.getMerklePath(i.value.map((b) => b.toBoolean()));
    console.log('mgetproof');
    return new P(p);
  };

  const set = (i: Index, x: A) => {
    Circuit.asProver(() => {
      console.log('mset');
      const idx = i.value.map((b) => b.toBoolean());
      const h = Poseidon.hash(eltTyp.toFields(x));
      console.log('mset');
      indexes.set(h.toString(), idx);
      t.setValue(idx, x, h);
    });
  };

  const commitment = (): Field => t.root();

  const getIndex = (x: A): Index | null => {
    const h = Poseidon.hash(eltTyp.toFields(x));
    const r = indexes.get(h.toString());
    if (r === undefined) {
      return null;
    } else {
      return new I(r.map((b) => new Bool(b)));
    }
    /*
    const y = asFieldElementsToConstant<A>(eltTyp, x);
    y.toFields() */
  };

  const nextIndex = (): Index => {
    const n = nextIdx;
    nextIdx += 1;
    return I.fromInt(n);
  };

  return { getValue, getIndex, getProof, nextIndex, set, commitment, depth };
}

export function OnDisk<A>(
  eltTyp: AsFieldElements<A>,
  path: string
): DataStore<A, MerkleProof> {
  throw 'ondisk';
}
