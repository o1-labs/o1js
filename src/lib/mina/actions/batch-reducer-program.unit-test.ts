import {
  BatchReducer,
  actionStackProgram,
  proveActionStack,
} from './batch-reducer.js';
import { Field } from '../../../index.js';
import { expect } from 'expect';
import { describe, it } from 'node:test';
import { Actions as ActionsBigint } from '../../../bindings/mina-transaction/transaction-leaves-bigint.js';

// analyze program with different number of actions
for (let actionsPerProof of [10, 30, 100, 300, 1000]) {
  let program = actionStackProgram(actionsPerProof);
  console.log({
    actionsPerProof,
    summary: (await program.analyzeMethods()).proveChunk.summary(),
  });
}

function randomActionHashes(n: number) {
  let actions: bigint[] = [];
  for (let i = 0; i < n; i++) {
    actions[i] = Field.random().toBigInt();
  }
  return actions;
}

function randomActionWitnesses(n: number) {
  let hashes = randomActionHashes(n);
  let witnesses: { hash: bigint; stateBefore: bigint }[] = [];
  let state = BatchReducer.initialActionState.toBigInt();
  for (let hash of hashes) {
    witnesses.push({ hash, stateBefore: state });
    state = ActionsBigint.updateSequenceState(state, hash);
  }
  return { witnesses, endActionState: Field(state) };
}

let stackProgram = actionStackProgram(100);

console.time('compile stack prover');
await stackProgram.compile();
console.timeEnd('compile stack prover');

await describe('action stack prover', async () => {
  let startActionState = BatchReducer.initialActionState;

  await it('does 1 action', async () => {
    let { witnesses, endActionState } = randomActionWitnesses(1);

    console.time('prove');
    let { isEmpty, proof } = await proveActionStack(
      endActionState,
      witnesses,
      stackProgram
    );
    console.timeEnd('prove');

    expect(isEmpty.toBoolean()).toBe(false);
    expect(proof.publicInput).toEqual(endActionState);
    expect(proof.publicOutput.actions).toEqual(startActionState);
  });

  await it('does 250 actions', async () => {
    let { witnesses, endActionState } = randomActionWitnesses(250);
    console.time('prove');
    let { isEmpty, proof } = await proveActionStack(
      endActionState,
      witnesses,
      stackProgram
    );
    console.timeEnd('prove');

    expect(isEmpty.toBoolean()).toBe(false);
    expect(proof.publicInput).toEqual(endActionState);
    expect(proof.publicOutput.actions).toEqual(startActionState);
  });
});
