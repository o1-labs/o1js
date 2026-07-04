// worker side of the worker-hosted kimchi FFI (web "Option B").
//
// this worker owns the real napi-wasm module. blocking is allowed here, so
// rayon runs with a real thread pool (nested workers, sized via the
// ?threads= query on this module's URL). FFI objects never leave this
// worker: they live in a handle table and cross to the main thread as
// handle ids.
//
// IMPORTANT: nested workers cannot finish loading while this worker is
// blocked inside a wasm call, so the rayon pool is spawned NOW — while the
// event loop is idle — and we poll until all threads are running before
// signaling readiness.
//
// protocol (see ffi-proxy.js for the main-thread side):
//  in:  {type:'call', target, args, sab} | {type:'resend', sab} | {type:'free', ids}
//  out: results are serialized to JSON and written into the SharedArrayBuffer,
//       then the state flag is set — the main thread is spinning on it and
//       cannot receive messages.

// the polyfill must be evaluated before @emnapi/runtime (imported by the
// loader below), which captures `Buffer` at module load
import './buffer-polyfill.js';
import * as kimchiNapi from '../../compiled/web_bindings/kimchi_napi.wasi-browser.js';

const STATE_DONE = 1;
const STATE_ERROR = 2;
const STATE_GROW = 3;
const HEADER_BYTES = 12;

let ffi = kimchiNapi.default ?? kimchiNapi;

// handle table
let nextHandle = 1;
let handles = new Map();

function registerHandle(value) {
  let id = nextHandle++;
  handles.set(id, value);
  return id;
}

// classify a runtime value coming out of the FFI:
// - emnapi externals have a null prototype -> handle
// - class instances (non-plain prototype) -> handle, with class name
// - everything else is data (primitives, typed arrays, arrays, plain objects)
function encodeResult(value) {
  if (value === undefined) return { $: 'undef' };
  if (value === null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'bigint') return { $: 'big', v: value.toString() };
  if (value instanceof Uint8Array) return { $: 'ta', t: 'u8', b: bytesToBase64(value) };
  if (value instanceof Int32Array) {
    return { $: 'ta', t: 'i32', b: bytesToBase64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  }
  if (value instanceof Uint32Array) {
    return { $: 'ta', t: 'u32', b: bytesToBase64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  }
  if (value instanceof Float64Array) {
    return { $: 'ta', t: 'f64', b: bytesToBase64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  }
  if (Array.isArray(value)) return value.map(encodeResult);
  let proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype) {
    let out = {};
    for (let k of Object.keys(value)) out[k] = encodeResult(value[k]);
    return out;
  }
  // external (proto === null) or napi class instance
  let cls = proto === null ? null : (proto.constructor?.name ?? null);
  return { $: 'h', id: registerHandle(value), cls };
}

function decodeArg(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value.$ === 'h') {
    let real = handles.get(value.id);
    if (real === undefined) throw Error(`ffi-worker-host: unknown handle ${value.id}`);
    return real;
  }
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
  if (Array.isArray(value)) return value.map(decodeArg);
  let out = {};
  for (let k of Object.keys(value)) out[k] = decodeArg(value[k]);
  return out;
}

function execute(target, args) {
  switch (target.kind) {
    case 'fn':
      return ffi[target.name](...args);
    case 'construct':
      // the constructed instance goes straight into the handle table; the
      // stub on the main thread adopts the handle
      return new ffi[target.name](...args);
    case 'method': {
      let self = handles.get(target.id);
      return self[target.member](...args);
    }
    case 'get': {
      let self = handles.get(target.id);
      return self[target.member];
    }
    case 'set': {
      let self = handles.get(target.id);
      self[target.member] = args[0];
      return undefined;
    }
    case 'static':
      return ffi[target.name][target.member](...args);
    case 'static-get':
      return ffi[target.name][target.member];
    default:
      throw Error(`ffi-worker-host: unknown call kind '${target.kind}'`);
  }
}

let textEncoder = new TextEncoder();
let lastPayload = null; // kept for the grow/resend protocol

function respond(sab, state, payloadBytes) {
  let i32 = new Int32Array(sab, 0, 3);
  if (payloadBytes.byteLength > sab.byteLength - HEADER_BYTES) {
    lastPayload = { state, bytes: payloadBytes };
    Atomics.store(i32, 2, payloadBytes.byteLength);
    Atomics.store(i32, 0, STATE_GROW);
    return;
  }
  new Uint8Array(sab, HEADER_BYTES, payloadBytes.byteLength).set(payloadBytes);
  Atomics.store(i32, 1, payloadBytes.byteLength);
  Atomics.store(i32, 0, state);
}

onmessage = ({ data }) => {
  if (data.type === 'init') {
    spawnRayonPool(data.threads)
      .then((threads) => postMessage({ type: 'ready', spec: buildSpec(), threads }))
      .catch((e) => postMessage({ type: 'init-error', message: e?.message ?? String(e) }));
    return;
  }
  if (data.type === 'free') {
    for (let id of data.ids) handles.delete(id);
    return;
  }
  if (data.type === 'resend') {
    let { state, bytes } = lastPayload;
    lastPayload = null;
    respond(data.sab, state, bytes);
    return;
  }
  if (data.type !== 'call') return;
  let state, payload;
  try {
    let result = execute(data.target, data.args.map(decodeArg));
    state = STATE_DONE;
    payload = encodeResult(result);
  } catch (e) {
    state = STATE_ERROR;
    payload = { message: e?.message ?? String(e), stack: e?.stack };
  }
  respond(data.sab, state, textEncoder.encode(JSON.stringify(payload)));
};

function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// nested workers only start while THIS worker's event loop is responsive:
// their script evaluation is scheduled by their owner, and their own spawn
// requests arrive here as messages. so camlRayonSpawnPool builds the pool on
// a helper wasi thread (never blocking us) and we poll until the threads are
// actually up.
async function spawnRayonPool(threads) {
  if (!(threads > 0)) threads = Math.max(1, (globalThis.navigator?.hardwareConcurrency ?? 4) - 1);
  ffi.camlRayonSpawnPool(threads);
  let deadline = Date.now() + 30_000;
  let started;
  while ((started = ffi.camlRayonStartedThreads()) < threads) {
    if (Date.now() > deadline) {
      console.warn(`o1js ffi-worker-host: only ${started}/${threads} rayon threads started`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return started;
}

// introspect the module and send the api spec to the main thread
function buildSpec() {
  let functions = [];
  let classes = {};
  let constants = {};
  for (let [name, value] of Object.entries(ffi)) {
    if (name === 'default') continue;
    if (typeof value === 'function') {
      if (value.prototype && Object.getOwnPropertyNames(value.prototype).length > 1) {
        // a napi class: enumerate prototype + static members
        let methods = [];
        let getters = [];
        let setters = [];
        for (let [member, d] of Object.entries(Object.getOwnPropertyDescriptors(value.prototype))) {
          if (member === 'constructor') continue;
          if (typeof d.value === 'function') methods.push(member);
          if (d.get) getters.push(member);
          if (d.set) setters.push(member);
        }
        let statics = { methods: [], getters: [] };
        for (let [member, d] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
          if (['length', 'name', 'prototype'].includes(member)) continue;
          if (typeof d.value === 'function') statics.methods.push(member);
          if (d.get) statics.getters.push(member);
        }
        classes[name] = { methods, getters, setters, statics };
      } else {
        functions.push(name);
      }
    } else if (typeof value !== 'object' || value === null) {
      constants[name] = value;
    }
  }
  return { functions, classes, constants };
}

// the module body only runs after the (imported) loader finished its
// top-level await; messages sent before that are lost — so announce
// readiness-to-init and let the main thread send 'init' only now
postMessage({ type: 'boot' });
