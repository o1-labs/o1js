export { generateSudoku, solveSudoku, cloneSudoku };

/**
 * Generates a random 9x9 sudoku. Cells are either filled out (1,...,9) or empty (0).
 *
 * @param {number?} difficulty number between 0 (easiest = full sudoku) and 1 (hardest = empty sudoku)
 * @returns {number[][]} the sudoku
 */
function generateSudoku(difficulty = 0.5) {
  let solution = solveSudokuInternal(emptySudoku(), false);
  let partial = deleteRandomValues(solution, difficulty);
  return partial;
}

function deleteRandomValues(sudoku, p) {
  // p \in [0,1] ... probability to delete a value
  return sudoku.map((row) => row.map((x) => (Math.random() < p ? 0 : x)));
}

// sudoku = {0,...,9}^(9x9) matrix, 0 means empty cell
function emptySudoku() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

/**
 * Solve a given sudoku. Returns undefined if there is no solution.
 *
 * @param {number[][]} sudoku - The input sudoku with some cell values equal to zero
 * @returns {number[][] | undefined} - The full sudoku, or undefined if no solution exists
 */
function solveSudoku(sudoku) {
  return solveSudokuInternal(sudoku, true);
}

function solveSudokuInternal(sudoku, deterministic, possible) {
  // find *a* compatible solution to the sudoku - not checking for uniqueness
  // if deterministic = true: always take the smallest possible cell value
  // if deterministic = false: take random compatible values
  if (possible === undefined) {
    possible = possibleFromSudoku(sudoku);
    sudoku = cloneSudoku(sudoku);
  }
  while (true) {
    let [i, j, n] = cellWithFewestPossible(sudoku, possible);

    // no free values => sudoku is solved!
    if (n === Infinity) return sudoku;

    if (n === 1) {
      let x = chooseFirstPossible(i, j, possible);
      // console.log('determined', x, 'at', i, j);
      sudoku[i][j] = x;
      fixValue(i, j, x, possible);
      continue;
    }

    while (true) {
      let x = deterministic
        ? chooseFirstPossible(i, j, possible)
        : chooseRandomPossible(i, j, possible);

      // no values possible! we failed to get a solution
      if (x === 0) return;

      let sudoku_ = cloneSudoku(sudoku);
      let possible_ = cloneSudoku(possible);
      sudoku_[i][j] = x;
      fixValue(i, j, x, possible_);

      let solution = solveSudokuInternal(sudoku_, deterministic, possible_);

      // found a solution? return it!
      if (solution !== undefined) return solution;

      // there is no solution with x at i, j!
      // mark this value as impossible and try again
      possible[i][j][x - 1] = 0;
    }
  }
}

// possible = {0,1}^(9x9x9) tensor of possibilities
// possible[i][j][x] contains a 1 if entry x \in {1,...,9} is possible in sudoku[i][j], 0 otherwise
// => allows us to quickly determine cells where few values are possible
function possibleFromSudoku(sudoku) {
  let possible = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => Array(9).fill(1))
  );
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      let x = sudoku[i][j];
      if (x !== 0) {
        fixValue(i, j, x, possible);
      }
    }
  }
  return possible;
}

function chooseFirstPossible(i, j, possible) {
  let possibleIJ = possible[i][j];
  let x = 0;
  for (let k = 0; k < 9; k++) {
    if (possibleIJ[k] === 1) {
      x = k + 1;
      break;
    }
  }
  return x;
}

function chooseRandomPossible(i, j, possible) {
  let possibleValues = possible[i][j]
    .map((b, m) => b && m + 1)
    .filter((b) => b);
  let n = possibleValues.length;
  if (n === 0) return 0;
  let k = Math.floor(Math.random() * n);
  return possibleValues[k];
}

function fixValue(i, j, x, possible) {
  // mark the value as impossible in the same row
  for (let k = 0; k < 9; k++) {
    if (k === j) {
      possible[i][k][x - 1] = 1;
    } else {
      possible[i][k][x - 1] = 0;
    }
  }
  // mark the value as impossible in the same column
  for (let k = 0; k < 9; k++) {
    if (k === i) {
      possible[k][j][x - 1] = 1;
    } else {
      possible[k][j][x - 1] = 0;
    }
  }
  // mark the value as impossible in the same square
  let [i0, i1] = divmod(i, 3);
  let [j0, j1] = divmod(j, 3);
  for (let k = 0; k < 9; k++) {
    let [ii, jj] = divmod(k, 3);
    if (ii === i1 && jj === j1) {
      possible[3 * i0 + ii][3 * j0 + jj][x - 1] = 1;
    } else {
      possible[3 * i0 + ii][3 * j0 + jj][x - 1] = 0;
    }
  }
  // mark all other values as impossible in the same cell
  for (let k = 0; k < 9; k++) {
    if (k === x - 1) {
      possible[i][j][k] = 1;
    } else {
      possible[i][j][k] = 0;
    }
  }
}

function cellWithFewestPossible(sudoku, possible) {
  let i0, j0;
  let fewest = Infinity;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (sudoku[i][j] !== 0) continue;
      let possibleIJ = possible[i][j];
      let n = 0;
      for (let k = 0; k < 9; k++) {
        if (possibleIJ[k] === 1) n++;
      }
      if (n < fewest) {
        if (n === 1 || n === 0) return [i, j, n];
        fewest = n;
        [i0, j0] = [i, j];
      }
    }
  }
  return [i0, j0, fewest];
}

function divmod(k, n) {
  let q = Math.floor(k / n);
  return [q, k - q * n];
}

/**
 * Clones a sudoku.
 *
 * @template T
 * @param {T[]} sudoku
 * @returns {T[]}
 */
function cloneSudoku(sudoku) {
  if (Array.isArray(sudoku[0])) {
    return sudoku.map((x) => cloneSudoku(x));
  } else {
    return [...sudoku];
  }
}
