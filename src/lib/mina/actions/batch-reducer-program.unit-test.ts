import {
  BatchReducer,
  actionBatchProgram,
  proveActionBatch,
} from './batch-reducer.js';
import { Field } from '../../../index.js';
import { expect } from 'expect';
import { describe, it } from 'node:test';

function randomActionHashes(n: number) {
  let actions: bigint[] = [];
  for (let i = 0; i < n; i++) {
    actions[i] = Field.random().toBigInt();
  }
  return actions;
}

// analyze program with different number of actions
for (let actionsPerProof of [1, 3, 10, 30, 100, 300, 1000, 3000]) {
  let program = actionBatchProgram(actionsPerProof);
  console.log({
    actionsPerProof,
    summary: (await program.analyzeMethods()).proveChunk.summary(),
  });
}

const actionsPerProof = 300;

let program = actionBatchProgram(actionsPerProof);

console.time('compile');
await program.compile();
console.timeEnd('compile');

await describe('test action state prover', async () => {
  let state = BatchReducer.initialActionState;

  await it('does 0 actions', async () => {
    let startState = state;

    console.time('prove');
    let proof = await proveActionBatch(startState, [], program);
    console.timeEnd('prove');

    expect(proof.publicInput).toEqual(startState);
    expect(proof.publicOutput).toEqual(startState);
  });

  await it('does 500 actions', async () => {
    let startState = state;

    console.time('prove');
    let proof = await proveActionBatch(
      startState,
      randomActionHashes(500),
      program
    );
    console.timeEnd('prove');

    let endState = proof.publicOutput;
    expect(endState).not.toEqual(startState);
    expect(proof.publicInput).toEqual(startState);
    state = endState;
  });
});
