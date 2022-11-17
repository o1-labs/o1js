import { Field as FieldSnarky } from '../snarky.js';
import { Poseidon as PoseidonSnarky, prefixes } from '../lib/hash.js';
import { Field, HashInput, sizeInBits } from './field-bigint.js';
import { bitsToBytes, prefixToField } from './binable.js';
import { FiniteField, Fp } from 'src/js_crypto/finite_field.js';

export { Poseidon, prefixes, packToFields, hashWithPrefix, packToFieldsLegacy };

const Poseidon = {
  update(state: [Field, Field, Field], input: Field[]): [Field, Field, Field] {
    let stateSnarky = state.map(FieldSnarky) as [
      FieldSnarky,
      FieldSnarky,
      FieldSnarky
    ];
    let inputSnarky = input.map(FieldSnarky);
    let [s1, s2, s3] = PoseidonSnarky.update(stateSnarky, inputSnarky).map(
      (x) => x.toBigInt()
    );
    return [Field(s1), Field(s2), Field(s3)];
  },
  initialState() {
    return [Field(0), Field(0), Field(0)] as [Field, Field, Field];
  },
};

function salt(prefix: string) {
  return Poseidon.update(Poseidon.initialState(), [
    prefixToField(Field, prefix),
  ]);
}
function hashWithPrefix(prefix: string, input: Field[]) {
  let init = salt(prefix);
  return Poseidon.update(init, input)[0];
}

/**
 * Convert the {fields, packed} hash input representation to a list of field elements
 * Random_oracle_input.Chunked.pack_to_fields
 */
function packToFields({ fields = [], packed = [] }: HashInput) {
  if (packed.length === 0) return fields;
  let packedBits = [];
  let currentPackedField = 0n;
  let currentSize = 0;
  for (let [field, size] of packed) {
    currentSize += size;
    if (currentSize < 255) {
      currentPackedField = currentPackedField * (1n << BigInt(size)) + field;
    } else {
      packedBits.push(currentPackedField);
      currentSize = size;
      currentPackedField = field;
    }
  }
  packedBits.push(currentPackedField);
  return fields.concat(packedBits);
}
/**
 * Random_oracle_input.Legacy.pack_to_fields, for the special case of a single bitstring
 */
function packToFieldsLegacy([...bits]: boolean[]) {
  let fields = [];
  while (bits.length > 0) {
    let fieldBits = bits.splice(0, sizeInBits);
    let field = Field.fromBytes(bitsToBytes(fieldBits));
    fields.push(field);
  }
  return fields;
}

type PoseidonParameters = {
  fullRounds: number;
  partialRounds: number;
  hasInitialRoundConstant: boolean;
  stateSize: number;
  rate: number;
  power: number;
  roundConstants: Field[][];
  mds: Field[][];
};

let fullRounds = 55;
let poseidonStateSize = 3;
let poseidonRate = 2;
let power = 7;

function createPoseidon(
  Fp: FiniteField,
  {
    fullRounds,
    partialRounds,
    hasInitialRoundConstant,
    stateSize,
    rate,
    power: power_,
    roundConstants,
    mds,
  }: PoseidonParameters
) {
  if (hasInitialRoundConstant) {
    throw Error("we don't support an initial round constant");
  }
  if (partialRounds !== 0) {
    throw Error("we don't support partial rounds");
  }
  let power = Field(power_);

  function initialState() {
    return Array(stateSize).fill(Field(0));
  }

  function update([...state]: Field[], input: Field[]) {
    // pad input with zeros so its length is a multiple of the rate
    let n = Math.ceil(input.length / rate) * rate;
    input = input.concat(Array(n - input.length).fill(Field(0)));
    // for every block of length `rate`, add block to the first `rate` elements of the state, and apply the permutation
    for (let blockIndex = 0; blockIndex < n; blockIndex += rate) {
      for (let i = 0; i < rate; i++) {
        state[i] = Fp.add(state[i], input[blockIndex + i]);
      }
      permutation(state);
    }
    return state;
  }

  /**
   * Standard Poseidon (without "partial rounds") goes like this:
   *
   *    ARK_0 -> SBOX -> MDS
   * -> ARK_1 -> SBOX -> MDS
   * -> ...
   * -> ARK_{rounds - 1} -> SBOX -> MDS
   *
   * where all computation operates on a vector of field elements, the "state", and
   * - ARK  ... add vector of round constants to the state, element-wise (different vector in each round)
   * - SBOX ... raise state to a power, element-wise
   * - MDS  ... multiply the state by a constant matrix (same matrix every round)
   * (these operations are done modulo p of course)
   *
   * For constraint efficiency reasons, in Mina's implementation the first round constant addition is left out
   * and is done at the end instead, so that effectively the order of operations in each iteration is rotated:
   *
   *    SBOX -> MDS -> ARK_0
   * -> SBOX -> MDS -> ARK_1
   * -> ...
   * -> SBOX -> MDS -> ARK_{rounds - 1}
   *
   * See also Snarky.Sponge.Poseidon.block_cipher
   */
  function permutation(state: Field[]) {
    for (let round = 0; round < fullRounds; round++) {
      // raise to a power
      for (let i = 0; i < stateSize; i++) {
        state[i] = Fp.power(state[i], power);
      }
      let oldState = [...state];
      for (let i = 0; i < stateSize; i++) {
        // multiply by mds matrix
        state[i] = Fp.dot(mds[i], oldState);
        // add round constants
        state[i] = Fp.add(state[i], roundConstants[round][i]);
      }
    }
  }

  return { initialState, update };
}
