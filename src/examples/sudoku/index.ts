import { deploy, submitSolution, getZkappState } from './sudoku-zkapp.js';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib.js';
import { shutdown } from 'snarkyjs';

let sudoku = generateSudoku(0.5);

console.log('Deploying Sudoku...');
await deploy(sudoku);
console.log('Is the sudoku solved?', (await getZkappState()).isSolved);

let solution = solveSudoku(sudoku);
if (solution === undefined) throw Error('cannot happen');

// submit a wrong solution
let noSolution = cloneSudoku(solution);
noSolution[0][0] = (noSolution[0][0] % 9) + 1;

console.log('Submitting wrong solution...');
try {
  await submitSolution(sudoku, noSolution);
} catch {}
console.log('Is the sudoku solved?', (await getZkappState()).isSolved);

// submit the actual solution
console.log('Submitting solution...');
await submitSolution(sudoku, solution);
console.log('Is the sudoku solved?', (await getZkappState()).isSolved);

shutdown();
