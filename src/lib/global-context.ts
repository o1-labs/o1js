import { Party } from './party';

export {
  mainContext,
  withContext,
  withContextAsync,
  getContext,
  inProver,
  inCompile,
  inCheckedComputation,
};

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
  let result: T;
  try {
    result = f();
  } finally {
    mainContext = undefined;
  }
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
  let result: T;
  try {
    result = await f();
    if (mainContext.actualAccesses !== mainContext.expectedAccesses)
      throw Error(contextConflictMessage);
  } finally {
    mainContext = undefined;
  }
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
