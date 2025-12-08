import { expect } from 'expect';
import { AccountUpdate, Field, Mina, PrivateKey, Provable, UInt8 } from 'o1js';
import { MastermindZkApp } from './mastermind.js';
import { compressCombinationDigits, deserializeClue } from './utils.js';

let proofsEnabled = false;

async function localDeploy(
  zkapp: MastermindZkApp,
  deployerKey: PrivateKey,
  zkappPrivateKey: PrivateKey
) {
  const deployerAccount = deployerKey.toPublicKey();
  const tx = await Mina.transaction(deployerAccount, async () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    await zkapp.deploy();
  });

  await tx.prove();
  await tx.sign([deployerKey, zkappPrivateKey]).send();
}

async function initializeGame(zkapp: MastermindZkApp, deployerKey: PrivateKey, rounds: number) {
  const deployerAccount = deployerKey.toPublicKey();

  // The deployer initializes the Mastermind zkapp
  const initTx = await Mina.transaction(deployerAccount, async () => {
    await zkapp.initGame(UInt8.from(rounds));
  });

  await initTx.prove();
  await initTx.sign([deployerKey]).send();
}

if (proofsEnabled) await MastermindZkApp.compile();

// Set up the Mina local blockchain
const Local = await Mina.LocalBlockchain({ proofsEnabled, enforceTransactionLimits: true });
Mina.setActiveInstance(Local);

// Local.testAccounts is an array of 10 test accounts that have been pre-filled with Mina
let codemasterKey = Local.testAccounts[0].key;
let codemasterPubKey = codemasterKey.toPublicKey();

// Generate random field as salt for the codemaster
let codemasterSalt = Field.random();

let codebreakerKey = Local.testAccounts[1].key;
let codebreakerPubKey = codebreakerKey.toPublicKey();

// Set up the zkapp account
let zkappPrivateKey = PrivateKey.random();
let zkappAddress = zkappPrivateKey.toPublicKey();
let zkapp = new MastermindZkApp(zkappAddress);

await localDeploy(zkapp, codemasterKey, zkappPrivateKey);

Provable.log('guess history: ', zkapp.guessHistory.get());

// Should reject calling `createGame` method before `initGame`
const createGameTxInvalid = async () => {
  const tx = await Mina.transaction(codemasterPubKey, async () => {
    await zkapp.createGame(Field(1234), codemasterSalt);
  });

  await tx.prove();
  await tx.sign([codemasterKey]).send();
};

const expectedErrorMessage = 'The game has not been initialized yet!';
await expect(createGameTxInvalid()).rejects.toThrowError(expectedErrorMessage);

// Initialize game
const maxAttempts = 5;
await initializeGame(zkapp, codemasterKey, maxAttempts);

// Initialized with `super.init()`
const turnCount = zkapp.turnCount.get();
expect(turnCount).toEqual(new UInt8(0));

const codemasterId = zkapp.codemasterId.get();
expect(codemasterId).toEqual(Field(0));

const codebreakerId = zkapp.codebreakerId.get();
expect(codebreakerId).toEqual(Field(0));

const solutionHash = zkapp.solutionHash.get();
expect(solutionHash).toEqual(Field(0));

const firstEmptyGuess = zkapp.guessHistory.get()[0];
expect(firstEmptyGuess).toEqual(Field(0));

const firstClue = zkapp.clueHistory.get()[0];
expect(firstClue).toEqual(Field(0));

// Initialized manually
const rounds = zkapp.maxAttempts.get();
expect(rounds).toEqual(UInt8.from(maxAttempts));

const isSolved = zkapp.isSolved.get().toBoolean();
expect(isSolved).toEqual(false);

// secretCombination = [1, 2, 3, 4]
// should create a game and update codemasterId & turnCount on-chain
const secretCombination = Field(1234);

const createGameTx = await Mina.transaction(codemasterKey.toPublicKey(), async () => {
  zkapp.createGame(secretCombination, codemasterSalt);
});

await createGameTx.prove();
await createGameTx.sign([codemasterKey]).send();

// Test that the on-chain states are updated
const codemasterIdUpdated = zkapp.codemasterId.get();
expect(codemasterIdUpdated).not.toEqual(Field(0));

const turnCountUpdated = zkapp.turnCount.get().toNumber();
expect(turnCountUpdated).toEqual(1);

// validGuess = [1, 5, 6, 2]
// should accept codebreaker valid guess & update on-chain state
// Test that the codebreakerId is not updated yet
expect(zkapp.codebreakerId.get()).toEqual(Field(0));

const firstGuess = [1, 5, 6, 2];
const unseparatedGuess = compressCombinationDigits(firstGuess.map(Field));

const makeGuessTx = await Mina.transaction(codebreakerPubKey, async () => {
  await zkapp.makeGuess(unseparatedGuess);
});

await makeGuessTx.prove();
await makeGuessTx.sign([codebreakerKey]).send();

// Test that the on-chain states are updated
const updatedCodebreakerId = zkapp.codebreakerId.get();
expect(updatedCodebreakerId).not.toEqual(Field(0));

expect(zkapp.turnCount.get().toNumber()).toEqual(2);

// should accept codemaster clue and update on-chain state
const solution = [1, 2, 3, 4];
const unseparatedSolution = compressCombinationDigits(solution.map(Field));

const giveClueTx = await Mina.transaction(codemasterKey.toPublicKey(), async () => {
  zkapp.giveClue(unseparatedSolution, codemasterSalt);
});

await giveClueTx.prove();
await giveClueTx.sign([codemasterKey]).send();

// Test that the on-chain states are updated: serializedClue, isSolved, and turnCount
const latestClueIndex = zkapp.turnCount.get().sub(3).div(2).toNumber();
const clueHistory = zkapp.clueHistory.get();
const serializedClue = clueHistory[latestClueIndex];
const clue = deserializeClue(serializedClue);

expect(clue).toEqual([2, 0, 0, 1].map(Field));

expect(zkapp.isSolved.get().toBoolean()).toEqual(false);

expect(zkapp.turnCount.get().toNumber()).toEqual(3);

// validGuess2 = [1, 4, 7, 2]
// should accept another valid guess & update on-chain state
const secondGuess = [1, 4, 7, 2];
const compactGuess = compressCombinationDigits(secondGuess.map(Field));

const makeGuessTx2 = await Mina.transaction(codebreakerKey.toPublicKey(), async () => {
  await zkapp.makeGuess(compactGuess);
});

await makeGuessTx2.prove();
await makeGuessTx2.sign([codebreakerKey]).send();

// Test that the on-chain states are updated
const updatedCodebreakerId2 = zkapp.codebreakerId.get();
expect(updatedCodebreakerId2).not.toEqual(Field(0));

const turnCount2 = zkapp.turnCount.get().toNumber();
expect(turnCount2).toEqual(4);

async function makeGuess(guess: number[]) {
  const unseparatedGuess = compressCombinationDigits(guess.map(Field));

  const makeGuessTx = await Mina.transaction(codebreakerKey.toPublicKey(), async () => {
    await zkapp.makeGuess(unseparatedGuess);
  });

  await makeGuessTx.prove();
  await makeGuessTx.sign([codebreakerKey]).send();
}

async function giveClue(expectedClue: number[]) {
  const solution = [1, 2, 3, 4];
  const unseparatedSolution = compressCombinationDigits(solution.map(Field));

  const giveClueTx = await Mina.transaction(codemasterKey.toPublicKey(), async () => {
    await zkapp.giveClue(unseparatedSolution, codemasterSalt);
  });

  await giveClueTx.prove();
  await giveClueTx.sign([codemasterKey]).send();

  const latestClueIndex = zkapp.turnCount.get().sub(3).div(2).toNumber();
  const clueHistory = zkapp.clueHistory.get();
  const serializedClue = clueHistory[latestClueIndex];
  const clue = deserializeClue(serializedClue);

  expect(clue).toEqual(expectedClue.map(Field));
}

/// Should give clue of second guess and then alternate guess/clue round till roundsLimit=5
await giveClue([2, 1, 0, 1]);

// should make third guess
await makeGuess([1, 3, 4, 8]);

// should give clue of third guess
await giveClue([2, 1, 1, 0]);

// should make fourth guess
await makeGuess([5, 8, 3, 7]);

// should give clue of fourth guess
await giveClue([0, 0, 2, 0]);

// should make fifth guess
await makeGuess([9, 1, 2, 4]);

// should give clue of fifth guess
await giveClue([0, 1, 1, 2]);

// should reject 6th guess: reached limited number of attempts
const expectedErrorMessage6G =
  'You have reached the number limit of attempts to solve the secret combination!';
await expect(makeGuess([1, 2, 3, 4])).rejects.toThrowError(expectedErrorMessage6G);

// should reject giving 6th clue: reached limited number of attempts
const expectedErrorMessage6C =
  'The codebreaker has finished the number of attempts without solving the secret combination!';
await expect(giveClue([2, 2, 2, 2])).rejects.toThrowError(expectedErrorMessage6C);

Provable.log('guess history: ', zkapp.guessHistory.get());
Provable.log('clue history: ', zkapp.clueHistory.get().map(deserializeClue));
