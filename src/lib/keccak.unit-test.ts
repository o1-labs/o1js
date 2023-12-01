import { Field } from './field.js';
import { Provable } from './provable.js';
import { ZkProgram } from './proof_system.js';
import { constraintSystem, print } from './testing/constraint-system.js';
import {
  ROUND_CONSTANTS,
  theta,
  piRho,
  chi,
  iota,
  round,
  blockTransformation,
} from './keccak.js';

const KECCAK_TEST_STATE = [
  [0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [1, 0, 0, 0, 0],
  [0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0],
].map((row) => row.map((elem) => Field.from(elem)));

let KeccakBlockTransformation = ZkProgram({
  name: 'KeccakBlockTransformation',
  publicInput: Provable.Array(Provable.Array(Field, 5), 5),
  publicOutput: Provable.Array(Provable.Array(Field, 5), 5),

  methods: {
    Theta: {
      privateInputs: [],
      method(input: Field[][]) {
        return theta(input);
      },
    },
    PiRho: {
      privateInputs: [],
      method(input: Field[][]) {
        return piRho(input);
      },
    },
    Chi: {
      privateInputs: [],
      method(input: Field[][]) {
        return chi(input);
      },
    },
    Iota: {
      privateInputs: [],
      method(input: Field[][]) {
        return iota(input, ROUND_CONSTANTS[0]);
      },
    },
    Round: {
      privateInputs: [],
      method(input: Field[][]) {
        return round(input, ROUND_CONSTANTS[0]);
      },
    },
    BlockTransformation: {
      privateInputs: [],
      method(input: Field[][]) {
        return blockTransformation(input);
      },
    },
  },
});

// constraintSystem.fromZkProgram(
//   KeccakBlockTransformation,
//   'BlockTransformation',
//   print
// );

console.log('KECCAK_TEST_STATE: ', KECCAK_TEST_STATE.toString());

console.log('Compiling...');
await KeccakBlockTransformation.compile();
console.log('Done!');
console.log('Generating proof...');
let proof0 = await KeccakBlockTransformation.BlockTransformation(
  KECCAK_TEST_STATE
);
console.log('Done!');
console.log('Output:', proof0.publicOutput.toString());
console.log('Verifying...');
proof0.verify();
console.log('Done!');

/*
[RUST IMPLEMENTATION OUTPUT](https://github.com/BaldyAsh/keccak-rust)

INPUT:
[[0, 0, 0, 0, 0],
 [0, 0, 1, 0, 0],
 [1, 0, 0, 0, 0],
 [0, 0, 0, 1, 0],
 [0, 1, 0, 0, 0]]

OUTPUT:
[[8771753707458093707, 14139250443469741764, 11827767624278131459, 2757454755833177578, 5758014717183214102],
[3389583698920935946, 1287099063347104936, 15030403046357116816, 17185756281681305858, 9708367831595350450],
[1416127551095004411, 16037937966823201128, 9518790688640222300, 1997971396112921437, 4893561083608951508],
[8048617297177300085, 10306645194383020789, 2789881727527423094, 7603160281577405588, 12935834807086847890],
[9476112750389234330, 13193683191463706918, 4460519148532423021, 7183125267124224670, 1393214916959060614]]
*/
