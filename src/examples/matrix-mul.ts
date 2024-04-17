import { Field, provable, Provable } from 'o1js';

// there are two ways of specifying an n*m matrix

// provable
let Matrix3x3 = provable([
  [Field, Field, Field],
  [Field, Field, Field],
  [Field, Field, Field],
]);
// Provable.Array -- types somewhat more loosely but can be easier to write
let Matrix3x4 = Provable.Array(Provable.Array(Field, 4), 3);
let Matrix4x3 = Provable.Array(Provable.Array(Field, 3), 4);

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
  let x = Provable.witness(Matrix3x4, () => {
    return [
      [Field.random(), Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random(), Field.random()],
    ];
  });
  let y = Provable.witness(Matrix4x3, () => {
    return [
      [Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random()],
      [Field.random(), Field.random(), Field.random()],
    ];
  });
  return matrixMul(x, y);
}

let { rows } = await Provable.constraintSystem(circuit);
let result: Field[][];
await Provable.runAndCheck(() => {
  let result_ = circuit();
  Provable.asProver(() => {
    result = result_.map((x) => x.map((y) => y.toConstant()));
  });
});
console.log({ rows, result: Matrix3x3.toJSON(result!) });
