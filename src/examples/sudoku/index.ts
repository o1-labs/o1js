import { Sudoku, SudokuZkapp } from './sudoku-zkapp.js';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib.js';
import {
  Bool,
  isReady,
  Mina,
  AccountUpdate,
  PrivateKey,
  shutdown,
} from 'snarkyjs';

// setup
await isReady;
const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
const account1 = Local.testAccounts[0].privateKey;
const zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();
let zkapp = new SudokuZkapp(zkappAddress);

// generate sudoku, compile & deploy
let sudoku = generateSudoku(0.5);

console.log('Deploying Sudoku...');
await SudokuZkapp.compile(zkappAddress);
let tx = await Mina.transaction(account1, () => {
  AccountUpdate.fundNewAccount(account1);
  let zkapp = new SudokuZkapp(zkappAddress);
  let sudokuInstance = new Sudoku(sudoku);
  zkapp.deploy({ zkappKey });
  zkapp.sudokuHash.set(sudokuInstance.hash());
  zkapp.isSolved.set(Bool(false));
});
await tx.send().wait();
console.log('Is the sudoku solved?', zkapp.isSolved.get().toBoolean());

let solution = solveSudoku(sudoku);
if (solution === undefined) throw Error('cannot happen');

// submit a wrong solution (this runs quickly, because proof creation fails)
let noSolution = cloneSudoku(solution);
noSolution[0][0] = (noSolution[0][0] % 9) + 1;

console.log('Submitting wrong solution...');
try {
  await submitSolution(sudoku, noSolution);
} catch {}
console.log('Is the sudoku solved?', zkapp.isSolved.get().toBoolean());

// submit the actual solution
console.log('Submitting solution...');
await submitSolution(sudoku, solution);
console.log('Is the sudoku solved?', zkapp.isSolved.get().toBoolean());

shutdown();

async function submitSolution(sudoku: number[][], solution: number[][]) {
  let tx = await Mina.transaction(account1, () => {
    let zkapp = new SudokuZkapp(zkappAddress);
    zkapp.submitSolution(new Sudoku(sudoku), new Sudoku(solution));
  });
  await tx.prove();
  await tx.send().wait();
}
