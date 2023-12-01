import { Field } from './field.js';
import { Gadgets } from './gadgets/gadgets.js';

// KECCAK CONSTANTS

// Length of the square matrix side of Keccak states
const KECCAK_DIM = 5;

// Value `l` in Keccak, ranges from 0 to 6 and determines the lane width
const KECCAK_ELL = 6;

// Width of a lane of the state, meaning the length of each word in bits (64)
const KECCAK_WORD = 2 ** KECCAK_ELL;

// Number of bytes that fit in a word (8)
const BYTES_PER_WORD = KECCAK_WORD / 8;

// Length of the state in bits, meaning the 5x5 matrix of words in bits (1600)
const KECCAK_STATE_LENGTH = KECCAK_DIM ** 2 * KECCAK_WORD;

// Number of rounds of the Keccak permutation function depending on the value `l` (24)
const KECCAK_ROUNDS = 12 + 2 * KECCAK_ELL;

// Creates the 5x5 table of rotation offset for Keccak modulo 64
//  | x \ y |  0 |  1 |  2 |  3 |  4 |
//  | ----- | -- | -- | -- | -- | -- |
//  | 0     |  0 | 36 |  3 | 41 | 18 |
//  | 1     |  1 | 44 | 10 | 45 |  2 |
//  | 2     | 62 |  6 | 43 | 15 | 61 |
//  | 3     | 28 | 55 | 25 | 21 | 56 |
//  | 4     | 27 | 20 | 39 |  8 | 14 |
const ROT_TABLE = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

// Round constants for Keccak
// From https://keccak.team/files/Keccak-reference-3.0.pdf
const ROUND_CONSTANTS = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
].map(Field.from);

// Return a keccak state where all lanes are equal to 0
const getKeccakStateZeros = (): Field[][] =>
  Array.from(Array(KECCAK_DIM), (_) => Array(KECCAK_DIM).fill(Field.from(0)));

// KECCAK HASH FUNCTION

// ROUND TRANSFORMATION

// First algorithm in the compression step of Keccak for 64-bit words.
// C[x] = A[x,0] xor A[x,1] xor A[x,2] xor A[x,3] xor A[x,4]
// D[x] = C[x-1] xor ROT(C[x+1], 1)
// E[x,y] = A[x,y] xor D[x]
// In the Keccak reference, it corresponds to the `theta` algorithm.
// We use the first index of the state array as the x coordinate and the second index as the y coordinate.
const theta = (state: Field[][]): Field[][] => {
  const stateA = state;

  // XOR the elements of each row together
  // for all x in {0..4}: C[x] = A[x,0] xor A[x,1] xor A[x,2] xor A[x,3] xor A[x,4]
  const stateC = stateA.map((row) =>
    row.reduce((acc, next) => Gadgets.xor(acc, next, KECCAK_WORD))
  );

  // for all x in {0..4}: D[x] = C[x-1] xor ROT(C[x+1], 1)
  const stateD = Array.from({ length: KECCAK_DIM }, (_, x) =>
    Gadgets.xor(
      stateC[(x + KECCAK_DIM - 1) % KECCAK_DIM],
      Gadgets.rotate(stateC[(x + 1) % KECCAK_DIM], 1, 'left'),
      KECCAK_WORD
    )
  );

  // for all x in {0..4} and y in {0..4}: E[x,y] = A[x,y] xor D[x]
  const stateE = stateA.map((row, index) =>
    row.map((elem) => Gadgets.xor(elem, stateD[index], KECCAK_WORD))
  );

  return stateE;
};

// Second and third steps in the compression step of Keccak for 64-bit words.
// B[y,2x+3y] = ROT(E[x,y], r[x,y])
// which is equivalent to the `rho` algorithm followed by the `pi` algorithm in the Keccak reference as follows:
// rho:
// A[0,0] = a[0,0]
// | x |  =  | 1 |
// | y |  =  | 0 |
// for t = 0 to 23 do
//   A[x,y] = ROT(a[x,y], (t+1)(t+2)/2 mod 64)))
//   | x |  =  | 0  1 |   | x |
//   |   |  =  |      | * |   |
//   | y |  =  | 2  3 |   | y |
// end for
// pi:
// for x = 0 to 4 do
//   for y = 0 to 4 do
//     | X |  =  | 0  1 |   | x |
//     |   |  =  |      | * |   |
//     | Y |  =  | 2  3 |   | y |
//     A[X,Y] = a[x,y]
//   end for
// end for
// We use the first index of the state array as the x coordinate and the second index as the y coordinate.
function piRho(state: Field[][]): Field[][] {
  const stateE = state;
  const stateB: Field[][] = getKeccakStateZeros();

  // for all x in {0..4} and y in {0..4}: B[y,2x+3y] = ROT(E[x,y], r[x,y])
  for (let x = 0; x < KECCAK_DIM; x++) {
    for (let y = 0; y < KECCAK_DIM; y++) {
      stateB[y][(2 * x + 3 * y) % KECCAK_DIM] = Gadgets.rotate(
        stateE[x][y],
        ROT_TABLE[x][y],
        'left'
      );
    }
  }

  return stateB;
}

// Fourth step of the compression function of Keccak for 64-bit words.
// F[x,y] = B[x,y] xor ((not B[x+1,y]) and B[x+2,y])
// It corresponds to the chi algorithm in the Keccak reference.
// for y = 0 to 4 do
//   for x = 0 to 4 do
//     A[x,y] = a[x,y] xor ((not a[x+1,y]) and a[x+2,y])
//   end for
// end for
function chi(state: Field[][]): Field[][] {
  const stateB = state;
  const stateF = getKeccakStateZeros();

  // for all x in {0..4} and y in {0..4}: F[x,y] = B[x,y] xor ((not B[x+1,y]) and B[x+2,y])
  for (let x = 0; x < KECCAK_DIM; x++) {
    for (let y = 0; y < KECCAK_DIM; y++) {
      stateF[x][y] = Gadgets.xor(
        stateB[x][y],
        Gadgets.and(
          // We can use unchecked NOT because the length of the input is constrained to be 64 bits thanks to the fact that it is the output of a previous Xor64
          Gadgets.not(stateB[(x + 1) % KECCAK_DIM][y], KECCAK_WORD, false),
          stateB[(x + 2) % KECCAK_DIM][y],
          KECCAK_WORD
        ),
        KECCAK_WORD
      );
    }
  }

  return stateF;
}

// Fifth step of the permutation function of Keccak for 64-bit words.
// It takes the word located at the position (0,0) of the state and XORs it with the round constant.
function iota(state: Field[][], rc: Field): Field[][] {
  const stateG = state;

  stateG[0][0] = Gadgets.xor(stateG[0][0], rc, KECCAK_WORD);

  return stateG;
}

// One round of the Keccak permutation function.
// iota o chi o pi o rho o theta
function round(state: Field[][], rc: Field): Field[][] {
  const stateA = state;
  const stateE = theta(stateA);
  const stateB = piRho(stateE);
  const stateF = chi(stateB);
  const stateD = iota(stateF, rc);
  return stateD;
}

// Keccak permutation function with a constant number of rounds
function permutation(state: Field[][], rc: Field[]): Field[][] {
  return rc.reduce(
    (currentState, rcValue) => round(currentState, rcValue),
    state
  );
}

// TESTING

const blockTransformation = (state: Field[][]): Field[][] =>
  permutation(state, ROUND_CONSTANTS);

export { KECCAK_DIM, ROUND_CONSTANTS, theta, piRho, chi, iota, round, blockTransformation };
