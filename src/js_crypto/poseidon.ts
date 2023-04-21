import { assertPositiveInteger } from './non-negative.js';
import { poseidonParamsKimchiFp, poseidonParamsLegacyFp } from './constants.js';
import { FiniteField, Fp, Fq } from './finite_field.js';
import { bigIntToBytes } from './bigint-helpers.js';
import { Field, Group } from 'src/snarky.js';

export { Poseidon, PoseidonLegacy, toGroup };

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

const Poseidon = createPoseidon(Fp, poseidonParamsKimchiFp);
const PoseidonLegacy = createPoseidon(Fp, poseidonParamsLegacyFp);

type GroupMapParams = {
  u: bigint;
  u_over_2: bigint;
  conic_c: bigint;
  projection_point: {
    z: bigint;
    y: bigint;
  };
  spec: { a: bigint; b: bigint };
};

type Conic = {
  z: bigint;
  y: bigint;
};

type STuple = {
  u: bigint;
  v: bigint;
  y: bigint;
};
const GroupMap = {
  Tock: (F: FiniteField) => {
    const params: GroupMapParams = {
      u: 2n,
      u_over_2: 1n,
      conic_c: 3n,
      projection_point: {
        z: 12196889842669319921865617096620076994180062626450149327690483414064673774441n,
        y: 1n,
      },
      spec: {
        a: 0n,
        b: 5n,
      },
    };

    function tryDecode(x: bigint): { x: bigint; y: bigint } | undefined {
      const { a, b } = params.spec;

      function f(x: bigint) {
        // a * a * a = a^3
        const pow3 = F.power(x, 3n);
        // a * x
        const ax = F.mul(a, x);
        // a^3 + ax + b
        return F.add(F.add(pow3, ax), b);
      }

      const y = f(x);
      console.log(y);
      const sqrtY = F.sqrt(y);
      return F.isSquare(y) && sqrtY ? { x, y: sqrtY } : undefined;
    }

    function s_to_v_truncated(s: STuple): [bigint, bigint, bigint] {
      const { u, v, y } = s;
      return [v, F.negate(F.add(u, v)), F.add(u, F.square(y))];
    }

    function conic_to_s(c: Conic): STuple {
      const d = F.div(c.z, c.y);
      if (!d) throw Error(`Division undefined! ${c.z}/${c.y}`);
      const v = F.sub(d, params.u_over_2);

      return {
        u: params.u,
        v,
        y: c.y,
      };
    }

    function field_to_conic(t: bigint): Conic {
      const { z: z0, y: y0 } = params.projection_point;

      const ct = F.mul(params.conic_c, t);

      const d1 = F.add(F.mul(ct, y0), z0);
      const d2 = F.add(F.mul(ct, t), 1n);

      const d = F.div(d1, d2);

      if (!d) throw Error(`Division undefined! ${d1}/${d2}`);

      const s = F.mul(2n, d);

      return {
        z: F.sub(z0, s),
        y: F.sub(y0, F.mul(s, t)),
      };
    }

    return {
      potentialXs: (t: bigint) =>
        s_to_v_truncated(conic_to_s(field_to_conic(t))),
      tryDecode,
    };
  },
};

function toGroup(x: bigint) {
  const { potentialXs, tryDecode } = GroupMap.Tock(Fp);
  const xs = potentialXs(x);
  return xs.map((x) => tryDecode(x)).find((x) => x);
}

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

  function hashToCurve(input: bigint[]) {
    // reference implementation Message.hash_to_group
    let digest = hash(input);
    return toGroup(digest);
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

  return { initialState, update, hash, hashToCurve };
}
