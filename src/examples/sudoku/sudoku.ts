import {
  matrixProp,
  CircuitValue,
  Field,
  SmartContract,
  method,
  Bool,
  state,
  State,
  Poseidon,
} from 'snarkyjs';

export { SudokuZkapp, Sudoku };

class Sudoku extends CircuitValue {
  @matrixProp(Field, 9, 9) value: Field[][];

  constructor(sudoku: number[][]) {
    super();
    this.value = sudoku.map((row) => row.map(Field));
  }

  hash() {
    return Poseidon.hash(this.value.flat());
  }
}

class SudokuZkapp extends SmartContract {
  @state(Field) sudokuHash = State<Field>();
  @state(Bool) isSolved = State<Bool>();

  @method submitSolution(sudokuInstance: Sudoku, solutionInstance: Sudoku) {
    let sudoku = sudokuInstance.value;
    let solution = solutionInstance.value;

    // first, we check that the passed solution is a valid sudoku

    // define helpers
    let range9 = Array.from({ length: 9 }, (_, i) => i);
    let oneTo9 = range9.map((i) => Field(i + 1));

    function assertHas1To9(array: Field[]) {
      oneTo9
        .map((k) => range9.map((i) => array[i].equals(k)).reduce(Bool.or))
        .reduce(Bool.and)
        .assertEquals(true);
    }

    // check all rows
    for (let i = 0; i < 9; i++) {
      let row = solution[i];
      assertHas1To9(row);
    }
    // check all columns
    for (let j = 0; j < 9; j++) {
      let column = solution.map((row) => row[j]);
      assertHas1To9(column);
    }
    // check 3x3 squares
    for (let k = 0; k < 9; k++) {
      let [i0, j0] = divmod(k, 3);
      let square = range9.map((m) => {
        let [i1, j1] = divmod(m, 3);
        return solution[3 * i0 + i1][3 * j0 + j1];
      });
      assertHas1To9(square);
    }

    // next, we check that the solution extends the initial sudoku
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        let cell = sudoku[i][j];
        let solutionCell = solution[i][j];
        // either the sudoku has nothing in it (indicated by a cell value of 0),
        // or it is equal to the solution
        Bool.or(cell.equals(0), cell.equals(solutionCell)).assertEquals(true);
      }
    }

    // finally, we check that the sudoku is the one that was originally deployed
    let sudokuHash = this.sudokuHash.get(); // get the hash from the blockchain
    this.sudokuHash.assertEquals(sudokuHash);
    sudokuInstance.hash().assertEquals(sudokuHash);

    // all checks passed => the sudoku is solved!
    this.isSolved.set(Bool(true));
  }
}

// helper

function divmod(k: number, n: number) {
  let q = Math.floor(k / n);
  return [q, k - q * n];
}
