import { Sudoku, SudokuZkApp } from './sudoku.js';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib.js';
import { AccountUpdate, Mina, PrivateKey, shutdown } from 'o1js';

// setup
const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const { publicKey: account, privateKey: accountKey } = Local.testAccounts[0];
const sudoku = generateSudoku(0.5);
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
// create an instance of the smart contract
const zkApp = new SudokuZkApp(zkAppAddress);

let methods = SudokuZkApp.analyzeMethods();
console.log(
  'first 5 gates of submitSolution method:',
  ...methods.submitSolution.gates.slice(0, 5)
);

console.log('Deploying and initializing Sudoku...');
await SudokuZkApp.compile();
let tx = await Mina.transaction(account, () => {
  AccountUpdate.fundNewAccount(account);
  zkApp.deploy();
  zkApp.update(Sudoku.from(sudoku));
});
await tx.prove();
/**
 * note: this tx needs to be signed with the `zkAppPrivateKey`, because `deploy` uses `requireSignature()` under the hood,
 * so one of the account updates in this tx has to be authorized with a signature (vs proof).
 * this is necessary for the deploy tx because the initial permissions for all account fields are "signature".
 * (but `deploy()` changes some of those permissions to "proof" and adds the verification key that enables proofs.
 * that's why we don't need `tx.sign()` for the later transactions.)
 */
await tx.sign([zkAppPrivateKey, accountKey]).send();

console.log('Is the sudoku solved?', zkApp.isSolved.get().toBoolean());

let solution = solveSudoku(sudoku);
if (solution === undefined) throw Error('cannot happen');

// submit a wrong solution
let noSolution = cloneSudoku(solution);
noSolution[0][0] = (noSolution[0][0] % 9) + 1;

console.log('Submitting wrong solution...');
try {
  let tx = await Mina.transaction(account, () => {
    zkApp.submitSolution(Sudoku.from(sudoku), Sudoku.from(noSolution));
  });
  await tx.prove();
  await tx.sign([accountKey]).send();
} catch {
  console.log('There was an error submitting the solution, as expected');
}
console.log('Is the sudoku solved?', zkApp.isSolved.get().toBoolean());

// submit the actual solution
console.log('Submitting solution...');
tx = await Mina.transaction(account, () => {
  zkApp.submitSolution(Sudoku.from(sudoku), Sudoku.from(solution!));
});
await tx.prove();
await tx.sign([accountKey]).send();
console.log('Is the sudoku solved?', zkApp.isSolved.get().toBoolean());

// cleanup
await shutdown();
