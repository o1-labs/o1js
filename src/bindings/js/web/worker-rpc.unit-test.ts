import { expect } from 'expect';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import {
  cleanupWorkerArguments,
  commitMainThreadMoves,
  createWorkerRpcControl,
  decodeMainThreadResult,
  decodeWorkerArguments,
  encodeMainThreadArguments,
  markWorkerRpcReady,
  prepareWorkerRpcRequest,
  transferWorkerResult,
  waitForWorkerRpcReady,
  waitForWorkerRpcResult,
  writeWorkerRpcError,
  writeWorkerRpcErrorIfPending,
  writeWorkerRpcSuccess,
} from './worker-rpc.js';
import { workerSpec } from './worker-spec.js';

type Ownership = 'borrow' | 'move' | 'transfer';
type ObjectSpec = {
  kind: 'wasm-object';
  type: typeof FakeWasmObject;
  ownership: Ownership;
};
type FunctionSpec = {
  disabled?: boolean;
  args: (ObjectSpec | undefined)[];
  res: ObjectSpec | { kind: 'boolean' } | undefined;
};

class FakeWasmObject {
  static wrapped: number[] = [];
  static freed: number[] = [];
  __wbg_ptr = 0;

  static __wrap(ptr: number) {
    let object = new this();
    object.__wbg_ptr = ptr;
    this.wrapped.push(ptr);
    return object;
  }

  __destroy_into_raw() {
    let ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    return ptr;
  }

  free() {
    (this.constructor as typeof FakeWasmObject).freed.push(this.__wbg_ptr);
    this.__wbg_ptr = 0;
  }
}

let borrowed = { kind: 'wasm-object', type: FakeWasmObject, ownership: 'borrow' } as const;
let moved = { kind: 'wasm-object', type: FakeWasmObject, ownership: 'move' } as const;
let transferred = {
  kind: 'wasm-object',
  type: FakeWasmObject,
  ownership: 'transfer',
} as const;

// A move is committed on the main thread before the worker is released, while
// borrowed wrappers never acquire ownership in the worker.
let mainBorrowed = FakeWasmObject.__wrap(11);
let mainMoved = FakeWasmObject.__wrap(22);
let { encodedArgs, moves } = encodeMainThreadArguments(
  [mainBorrowed, mainMoved, 7],
  [borrowed, moved, undefined]
);
expect(encodedArgs).toEqual([11, 22, 7]);
commitMainThreadMoves(moves);
expect(mainBorrowed.__wbg_ptr).toBe(11);
expect(mainMoved.__wbg_ptr).toBe(0);

let decoded = decodeWorkerArguments(encodedArgs, [borrowed, moved, undefined]);
expect(decoded.args[0]).toMatchObject({ __wbg_ptr: 11 });
expect(decoded.args[1]).toMatchObject({ __wbg_ptr: 22 });
expect(() => decoded.args[0].__destroy_into_raw()).toThrow(
  'Worker binding attempted to consume borrowed argument 0'
);
decoded.args[1].__destroy_into_raw();
cleanupWorkerArguments(decoded.wrappers, true);
expect(decoded.args[0].__wbg_ptr).toBe(0);

// If generated glue stops consuming an argument declared as moved, fail loudly
// and free the worker wrapper instead of leaving duplicate finalizer ownership.
let mismatch = decodeWorkerArguments([33], [moved]);
expect(() => cleanupWorkerArguments(mismatch.wrappers, true)).toThrow(
  'Worker binding did not consume moved argument 0'
);
expect(FakeWasmObject.freed).toContain(33);

// Zero is a valid result now, including boolean false.
let control = createWorkerRpcControl();
prepareWorkerRpcRequest(control);
markWorkerRpcReady(control);
expect(waitForWorkerRpcReady(control)).toBe(true);
writeWorkerRpcSuccess(control, transferWorkerResult(false, { kind: 'boolean' }));
expect(waitForWorkerRpcResult(control)).toBe(0);
expect(decodeMainThreadResult(0, { kind: 'boolean' })).toBe(false);

// Worker exceptions cross the synchronous boundary instead of stranding the
// main thread in an unobservable polling loop.
prepareWorkerRpcRequest(control);
writeWorkerRpcError(control, new Error('worker exploded'));
expect(() => waitForWorkerRpcResult(control)).toThrow('worker exploded');

// Watchdog crash signaling may only fail in-flight PREPARING/READY calls.
prepareWorkerRpcRequest(control);
markWorkerRpcReady(control);
expect(writeWorkerRpcErrorIfPending(control, new Error('o1js compute worker crashed: boom'))).toBe(
  true
);
expect(() => waitForWorkerRpcResult(control)).toThrow('o1js compute worker crashed: boom');

prepareWorkerRpcRequest(control);
markWorkerRpcReady(control);
writeWorkerRpcSuccess(control, 7);
expect(writeWorkerRpcErrorIfPending(control, new Error('o1js compute worker crashed: late'))).toBe(
  false
);
expect(waitForWorkerRpcResult(control)).toBe(7);

// A side thread can unblock the synchronous spin by writing ERROR into the SAB,
// which is the watchdog's crash-signaling contract.
{
  let crashControl = createWorkerRpcControl();
  prepareWorkerRpcRequest(crashControl);
  markWorkerRpcReady(crashControl);
  let watchdog = new Worker(
    `
    const { workerData } = require('node:worker_threads');
    const header = new Int32Array(workerData.control, 0, 4);
    const payload = new Uint8Array(workerData.control, 16);
    const encoded = new TextEncoder().encode('Error: o1js compute worker crashed: simulated');
    setTimeout(() => {
      payload.set(encoded);
      Atomics.store(header, 2, encoded.length);
      Atomics.store(header, 0, 3);
      Atomics.notify(header, 0);
    }, 20);
    `,
    { eval: true, workerData: { control: crashControl } }
  );
  expect(() => waitForWorkerRpcResult(crashControl)).toThrow(
    'o1js compute worker crashed: simulated'
  );
  watchdog.terminate();
}

let workerResult = FakeWasmObject.__wrap(44);
let rawResult = transferWorkerResult(workerResult, transferred);
expect(workerResult.__wbg_ptr).toBe(0);
let mainResult = decodeMainThreadResult(rawResult, transferred);
expect(mainResult.__wbg_ptr).toBe(44);

// Keep ownership annotations synchronized with the generated wasm-bindgen ABI.
// A generated __destroy_into_raw() consumes an argument; __wbg_ptr only borrows.
let generatedBindings = readFileSync(
  resolve(process.cwd(), 'src/bindings/compiled/web_bindings/kimchi_wasm.js'),
  'utf8'
);
let generatedSpec = workerSpec(fakeWasmTypes()) as Record<string, FunctionSpec>;
for (let [name, functionSpec] of Object.entries(generatedSpec)) {
  let source = generatedFunctionSource(generatedBindings, name);
  let parameters = generatedFunctionParameters(source);
  expect(parameters).toHaveLength(functionSpec.args.length);

  for (let i = 0; i < functionSpec.args.length; i++) {
    let argSpec = functionSpec.args[i];
    if (argSpec?.kind !== 'wasm-object') continue;
    let consumesArgument = source.includes(`${parameters[i]}.__destroy_into_raw()`);
    expect(consumesArgument).toBe(argSpec.ownership === 'move');
  }

  if (functionSpec.res?.kind === 'wasm-object') {
    expect(functionSpec.res.ownership).toBe('transfer');
    expect(source).toMatch(/return \w+\.__wrap\(/);
  }
}

function fakeWasmTypes() {
  return new Proxy<Record<string, typeof FakeWasmObject>>(
    {},
    {
      get(target, property: string) {
        return (target[property] ??= class extends FakeWasmObject {});
      },
    }
  );
}

function generatedFunctionSource(bindings: string, name: string) {
  let start = bindings.indexOf(`export function ${name}(`);
  if (start === -1) throw Error(`Worker spec references missing generated binding '${name}'`);
  let openingBrace = bindings.indexOf('{', start);
  let depth = 0;
  for (let i = openingBrace; i < bindings.length; i++) {
    if (bindings[i] === '{') depth++;
    if (bindings[i] === '}' && --depth === 0) return bindings.slice(start, i + 1);
  }
  throw Error(`Could not parse generated binding '${name}'`);
}

function generatedFunctionParameters(source: string) {
  let start = source.indexOf('(') + 1;
  let end = source.indexOf(')', start);
  let parameters = source.slice(start, end).trim();
  return parameters === '' ? [] : parameters.split(',').map((parameter) => parameter.trim());
}
