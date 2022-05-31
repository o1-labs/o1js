import * as Mina from './mina';
import { Body, Party } from './party';
import { SmartContract } from './zkapp';

export {
  getExecutionState,
  withContext,
  withContextAsync,
  getContext,
  inProver,
  inCompile,
  inCheckedComputation,
};

// per-smart-contract context for transaction construction
type ExecutionState = {
  transactionId: number;
  partyIndex: number;
  party: Party;
};

function getExecutionState(smartContract: SmartContract): ExecutionState {
  // TODO reconcile mainContext with currentTransaction
  if (mainContext !== undefined) {
    return {
      transactionId: 0,
      partyIndex: 0,
      party: mainContext.self,
    };
  }

  if (Mina.currentTransaction === undefined) {
    throw new Error('Cannot execute outside of a Mina.transaction() block.');
  }

  let executionState = executionStates.get(smartContract);
  if (
    executionState !== undefined &&
    executionState.transactionId === Mina.nextTransactionId.value
  ) {
    return executionState;
  }
  let id = Mina.nextTransactionId.value;
  let index = Mina.currentTransaction.nextPartyIndex++;
  let body = Body.keepAll(smartContract.address);
  let party = new Party(body);
  Mina.currentTransaction.parties.push(party);

  executionState = {
    transactionId: id,
    partyIndex: index,
    party,
  };
  executionStates.set(smartContract, executionState);
  return executionState;
}

const executionStates = new WeakMap<SmartContract, ExecutionState>();

// context for compiling / proving
// TODO reconcile mainContext with currentTransaction
let mainContext = undefined as
  | {
      witnesses?: unknown[];
      self: Party;
      expectedAccesses: number | undefined;
      actualAccesses: number;
      inProver?: boolean;
      inCompile?: boolean;
    }
  | undefined;
type PartialContext = {
  witnesses?: unknown[];
  self: Party;
  expectedAccesses?: number;
  actualAccesses?: number;
  inProver?: boolean;
  inCompile?: boolean;
};

function withContext<T>(
  {
    witnesses = undefined,
    expectedAccesses = undefined,
    actualAccesses = 0,
    self,
    ...other
  }: PartialContext,
  f: () => T
) {
  mainContext = { witnesses, expectedAccesses, actualAccesses, self, ...other };
  let result = f();
  mainContext = undefined;
  return [self, result] as [Party, T];
}

// TODO: this is unsafe, the mainContext will be overridden if we invoke this function multiple times concurrently
// at the moment, we solve this by detecting unsafe use and throwing an error
async function withContextAsync<T>(
  {
    witnesses = undefined,
    expectedAccesses = 1,
    actualAccesses = 0,
    self,
    ...other
  }: PartialContext,
  f: () => Promise<T>
) {
  mainContext = { witnesses, expectedAccesses, actualAccesses, self, ...other };
  let result = await f();
  if (mainContext.actualAccesses !== mainContext.expectedAccesses)
    throw Error(contextConflictMessage);
  mainContext = undefined;
  return [self, result] as [Party, T];
}

let contextConflictMessage =
  "It seems you're running multiple provers concurrently within" +
  ' the same JavaScript thread, which, at the moment, is not supported and would lead to bugs.';
function getContext() {
  if (mainContext === undefined) throw Error(contextConflictMessage);
  mainContext.actualAccesses++;
  if (
    mainContext.expectedAccesses !== undefined &&
    mainContext.actualAccesses > mainContext.expectedAccesses
  )
    throw Error(contextConflictMessage);
  return mainContext;
}

function inProver() {
  return !!mainContext?.inProver;
}
function inCompile() {
  return !!mainContext?.inCompile;
}
function inCheckedComputation() {
  return !!mainContext?.inCompile || !!mainContext?.inProver;
}
