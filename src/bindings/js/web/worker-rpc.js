export {
  cancelWorkerRpcRequest,
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
};

/**
 * Internal synchronous RPC protocol used by the browser bindings.
 *
 * Header layout (four i32/u32 words):
 *   0: state (PREPARING, READY, SUCCESS, ERROR, CANCELLED)
 *   1: successful u32 result
 *   2: UTF-8 error payload length
 *   3: reserved
 */
function createWorkerRpcControl() {
  return new SharedArrayBuffer(64 * 1024);
}

function prepareWorkerRpcRequest(control) {
  let header = new Int32Array(control, 0, 4);
  Atomics.store(header, 1, 0);
  Atomics.store(header, 2, 0);
  Atomics.store(header, 3, 0);
  Atomics.store(header, 0, 0); // PREPARING
}

function markWorkerRpcReady(control) {
  let header = new Int32Array(control, 0, 4);
  Atomics.store(header, 0, 1); // READY
  Atomics.notify(header, 0);
}

function cancelWorkerRpcRequest(control) {
  let header = new Int32Array(control, 0, 4);
  Atomics.store(header, 0, 4); // CANCELLED
  Atomics.notify(header, 0);
}

function waitForWorkerRpcReady(control) {
  let header = new Int32Array(control, 0, 4);
  let state = Atomics.load(header, 0);
  while (state === 0) {
    Atomics.wait(header, 0, 0);
    state = Atomics.load(header, 0);
  }
  if (state === 4) return false;
  if (state !== 1) throw Error(`Invalid o1js worker RPC state before execution: ${state}`);
  return true;
}

function writeWorkerRpcSuccess(control, result) {
  let header = new Int32Array(control, 0, 4);
  let unsignedHeader = new Uint32Array(control, 0, 4);
  Atomics.store(unsignedHeader, 1, result >>> 0);
  Atomics.store(header, 0, 2); // SUCCESS
  Atomics.notify(header, 0);
}

function writeWorkerRpcError(control, error) {
  let header = new Int32Array(control, 0, 4);
  let payload = new Uint8Array(control, 16);
  let message = String(error?.stack ?? error);
  let encoded = new TextEncoder().encode(message);
  if (encoded.length > payload.length) {
    let marker = new TextEncoder().encode('\n[o1js worker error truncated]');
    let prefixLength = Math.max(0, payload.length - marker.length);
    payload.set(encoded.subarray(0, prefixLength));
    payload.set(marker.subarray(0, payload.length - prefixLength), prefixLength);
    Atomics.store(header, 2, payload.length);
  } else {
    payload.set(encoded);
    Atomics.store(header, 2, encoded.length);
  }
  Atomics.store(header, 0, 3); // ERROR
  Atomics.notify(header, 0);
}

/**
 * Watchdog/crash path: only fail in-flight RPCs still waiting on PREPARING/READY.
 * Never overwrite a completed SUCCESS/ERROR/CANCELLED state.
 */
function writeWorkerRpcErrorIfPending(control, error) {
  if (control == null) return false;
  let header = new Int32Array(control, 0, 4);
  let state = Atomics.load(header, 0);
  if (state !== 0 && state !== 1) return false;
  writeWorkerRpcError(control, error);
  return true;
}
writeWorkerRpcErrorIfPending.deps = [writeWorkerRpcError];

function waitForWorkerRpcResult(control) {
  let header = new Int32Array(control, 0, 4);
  let pause = typeof Atomics.pause === 'function' ? Atomics.pause : () => {};
  let state = Atomics.load(header, 0);
  while (state === 0 || state === 1) {
    pause();
    state = Atomics.load(header, 0);
  }
  if (state === 2) return Atomics.load(new Uint32Array(control, 0, 4), 1);
  if (state === 3) {
    let length = Atomics.load(header, 2);
    let remoteStack = new TextDecoder().decode(new Uint8Array(control, 16, length));
    let firstLine = remoteStack.split('\n', 1)[0].replace(/^Error:\s*/, '');
    let error = new Error(firstLine || 'o1js web worker call failed');
    error.stack = remoteStack;
    throw error;
  }
  if (state === 4) throw Error('o1js web worker call was cancelled');
  throw Error(`Invalid o1js worker RPC result state: ${state}`);
}

function encodeMainThreadArguments(args, specArgs) {
  let encodedArgs = args.slice();
  let moves = [];
  for (let i = 0; i < specArgs.length; i++) {
    let argSpec = specArgs[i];
    if (argSpec?.kind !== 'wasm-object') continue;
    if (argSpec.ownership !== 'borrow' && argSpec.ownership !== 'move') {
      throw Error(`Invalid main-thread wasm ownership '${argSpec.ownership}' in argument ${i}`);
    }
    let argument = args[i];
    let ptr = argument?.__wbg_ptr;
    if (!Number.isInteger(ptr) || ptr === 0) {
      throw Error(`Invalid wasm object in worker argument ${i}`);
    }
    encodedArgs[i] = ptr;
    if (argSpec.ownership === 'move') {
      if (typeof argument.__destroy_into_raw !== 'function') {
        throw Error(`Cannot move wasm object in worker argument ${i}`);
      }
      moves.push({ argument, ptr, index: i });
    }
  }
  return { encodedArgs, moves };
}

function commitMainThreadMoves(moves) {
  for (let { argument, ptr, index } of moves) {
    let movedPtr = argument.__destroy_into_raw();
    if (movedPtr !== ptr) {
      throw Error(`Wasm ownership transfer changed pointer in worker argument ${index}`);
    }
  }
}

function decodeWorkerArguments(encodedArgs, specArgs) {
  let args = encodedArgs.slice();
  let wrappers = [];
  for (let i = 0; i < specArgs.length; i++) {
    let argSpec = specArgs[i];
    if (argSpec?.kind !== 'wasm-object') continue;
    let ptr = encodedArgs[i];
    if (!Number.isInteger(ptr) || ptr === 0) {
      throw Error(`Invalid wasm pointer in worker argument ${i}`);
    }
    if (argSpec.ownership !== 'borrow' && argSpec.ownership !== 'move') {
      throw Error(`Unknown wasm ownership '${argSpec.ownership}' in worker argument ${i}`);
    }
  }
  for (let i = 0; i < specArgs.length; i++) {
    let argSpec = specArgs[i];
    if (argSpec?.kind !== 'wasm-object') continue;
    let ptr = encodedArgs[i];
    let object;
    if (argSpec.ownership === 'move') {
      object = argSpec.type.__wrap(ptr);
    } else if (argSpec.ownership === 'borrow') {
      object = Object.create(argSpec.type.prototype);
      object.__wbg_ptr = ptr;
      Object.defineProperty(object, '__destroy_into_raw', {
        value() {
          throw Error(`Worker binding attempted to consume borrowed argument ${i}`);
        },
      });
    } else {
      throw Error(`Unknown wasm ownership '${argSpec.ownership}' in worker argument ${i}`);
    }
    args[i] = object;
    wrappers.push({ object, ptr, index: i, ownership: argSpec.ownership });
  }
  return { args, wrappers };
}

function cleanupWorkerArguments(wrappers, callSucceeded) {
  let mismatch;
  for (let { object, ptr, index, ownership } of wrappers) {
    if (ownership === 'borrow') {
      object.__wbg_ptr = 0;
      continue;
    }
    if (object.__wbg_ptr !== 0) {
      object.free();
      if (callSucceeded) {
        mismatch ??= Error(
          `Worker binding did not consume moved argument ${index} (pointer ${ptr})`
        );
      }
    }
  }
  if (mismatch !== undefined) throw mismatch;
}

function transferWorkerResult(result, resultSpec) {
  if (resultSpec?.kind === 'wasm-object') {
    if (resultSpec.ownership !== 'transfer') {
      throw Error(`Invalid worker result ownership '${resultSpec.ownership}'`);
    }
    if (typeof result?.__destroy_into_raw !== 'function') {
      throw Error('Worker binding returned an invalid owned wasm object');
    }
    return result.__destroy_into_raw();
  }
  if (resultSpec?.kind === 'boolean') return result ? 1 : 0;
  if (result === undefined) return 0;
  if (!Number.isInteger(result) || result < 0 || result > 0xffffffff) {
    throw Error('Worker binding returned a value that does not fit in the RPC u32 result');
  }
  return result;
}

function decodeMainThreadResult(result, resultSpec) {
  if (resultSpec?.kind === 'wasm-object') {
    if (resultSpec.ownership !== 'transfer') {
      throw Error(`Invalid main-thread result ownership '${resultSpec.ownership}'`);
    }
    return resultSpec.type.__wrap(result);
  }
  if (resultSpec?.kind === 'boolean') return result !== 0;
  return result;
}
