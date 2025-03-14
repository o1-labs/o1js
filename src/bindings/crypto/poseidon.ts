import { assertPositiveInteger } from './non-negative.js';
import { poseidonParamsKimchiFp, poseidonParamsLegacyFp } from './constants.js';
import { FiniteField, Fp } from './finite-field.js';
import { GroupMapPallas } from './elliptic-curve.js';

export { Poseidon, PoseidonLegacy };

type PoseidonParameters = {
  fullRounds: number;
  partialRounds: number;
  hasInitialRoundConstant: boolean;
  stateSize: number;
  rate: number;
  power: number;
  roundConstants: string[][];
  mds: string[][];
};

function fieldToGroup(x: bigint) {
  const { potentialXs, tryDecode } = GroupMapPallas;
  const xs = potentialXs(x);
  return xs.map((x) => tryDecode(x)).find((x) => x);
}

function makeHashToGroup(hash: (i: bigint[]) => bigint) {
  return (input: bigint[]) => {
    let digest = hash(input);
    let g = fieldToGroup(digest);
    if (g === undefined) return undefined;

    // the y coordinate is calculated using a square root, so it has two possible values
    // to make the output deterministic, we negate y if it is odd
    // we do the same in-snark, so both APIs match
    let isOdd = (g.y & 1n) === 1n;
    let y = isOdd ? Fp.negate(g.y) : g.y;
    return { x: g.x, y };
  };
}

const PoseidonSpec = createPoseidon(Fp, poseidonParamsKimchiFp);

const Poseidon = {
  ...PoseidonSpec,
  hashToGroup: makeHashToGroup(PoseidonSpec.hash),
};
const PoseidonLegacy = createPoseidon(Fp, poseidonParamsLegacyFp);

function createPoseidon(
  Fp: FiniteField,
  {
    fullRounds,
    partialRounds,
    hasInitialRoundConstant,
    stateSize,
    rate,
    power: power_,
    roundConstants: roundConstants_,
    mds: mds_,
  }: PoseidonParameters
) {
  if (partialRounds !== 0) {
    throw Error("we don't support partial rounds");
  }
  assertPositiveInteger(rate, 'rate must be a positive integer');
  assertPositiveInteger(fullRounds, 'fullRounds must be a positive integer');
  assertPositiveInteger(power_, 'power must be a positive integer');
  let power = BigInt(power_);
  let roundConstants = roundConstants_.map((arr) => arr.map(BigInt));
  let mds = mds_.map((arr) => arr.map(BigInt));

  function initialState(): bigint[] {
    return Array(stateSize).fill(0n);
  }

  function hash(input: bigint[]) {
    let state = update(initialState(), input);
    return state[0];
  }

  function update([...state]: bigint[], input: bigint[]) {
    // special case for empty input
    if (input.length === 0) {
      permutation(state);
      return state;
    }
    // pad input with zeros so its length is a multiple of the rate
    let n = Math.ceil(input.length / rate) * rate;
    input = input.concat(Array(n - input.length).fill(0n));
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
   * If `hasInitialRoundConstant` is true, another ARK step is added at the beginning.
   *
   * See also Snarky.Sponge.Poseidon.block_cipher
   */
  function permutation(state: bigint[]) {
    // special case: initial round constant
    let offset = 0;
    if (hasInitialRoundConstant) {
      for (let i = 0; i < stateSize; i++) {
        state[i] = Fp.add(state[i], roundConstants[0][i]);
      }
      offset = 1;
    }
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
        state[i] = Fp.add(state[i], roundConstants[round + offset][i]);
      }
    }
  }

  return { initialState, update, hash };
}
