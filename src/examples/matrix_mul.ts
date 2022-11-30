import { Field, provable, Circuit, isReady } from 'snarkyjs';

await isReady;

// there are two ways of specifying an n*m matrix

// provable
let Matrix3x3 = provable([
  [Field, Field, Field],
  [Field, Field, Field],
  [Field, Field, Field],
]);
// Circuit.array -- types somewhat more loosely but can be easier to write
let Matrix3x4 = Circuit.array(Circuit.array(Field, 4), 3);
let Matrix4x3 = Circuit.array(Circuit.array(Field, 3), 4);

/* @param x an n*m matrix, encoded as x[i][k] for row i column k.
 * @param y an m*o matrix, both encoded as y[k][j] for row j column j.
 * Returns an n*o matrix.
 */
function matrixMul(x: Field[][], y: Field[][]): Field[][] {
  let n = x.length;
  let m = y.length; // has to be === x[0].length
  let o = y[0].length;

  let result: Field[][] = [];

  // Compute the output matrix.
  for (let i = 0; i < n; i++) {
    result[i] = [];
    for (let j = 0; j < o; j++) {
      result[i][j] = Field(0);
      for (let k = 0; k < m; k++) {
        result[i][j] = result[i][j].add(x[i][k].mul(y[k][j]));
      }
    }
  }
  return result;
}

function circuit(): Field[][] {
  let x = Circuit.witness(Matrix3x4, () => {
    return [
      [Field.random(), Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random(), Field.random()],
    ];
  });
  let y = Circuit.witness(Matrix4x3, () => {
    return [
      [Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random()],
    ];
  });
  return matrixMul(x, y);
}

let { rows } = Circuit.constraintSystem(circuit);
let result = Circuit.runAndCheck(circuit);
console.log({ rows, result: Matrix3x3.toJSON(result) });
