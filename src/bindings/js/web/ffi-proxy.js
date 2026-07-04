// main-thread side of the worker-hosted kimchi FFI (web "Option B").
//
// the napi-wasm module lives in a dedicated Web Worker where blocking is
// allowed, so rayon gets real threads. JSOO calls the FFI synchronously from
// the main thread, which cannot block in Atomics.wait — so every call is
// posted to the worker and the result is awaited by SPINNING on a
// SharedArrayBuffer flag (same trick the old wasm-bindgen backend used).
//
// FFI objects (napi class instances and externals) cannot cross the worker
// boundary; they stay in the worker's handle table and are represented here
// by stub objects carrying a handle id. stub classes (methods, getters,
// statics) are generated at runtime from a spec the worker introspects off
// the real module, so nothing here needs to track the kimchi API surface.

export { createFfiProxy };

// SAB layout: [0] state (int32), [1] payload length, [2] needed size on grow
const STATE_PENDING = 0;
const STATE_DONE = 1;
const STATE_ERROR = 2;
const STATE_GROW = 3;
const HEADER_BYTES = 12;
const INITIAL_SAB_BYTES = 4 * 1024 * 1024 + HEADER_BYTES;

async function createFfiProxy(workerUrl, threads) {
  let worker = new Worker(workerUrl, { type: 'module', name: 'o1js-kimchi-ffi-host' });

  // 'boot' arrives once the module (incl. the wasm fetch in its imports) has
  // evaluated and its message handler exists — only then send 'init'
  let spec = await new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      if (data?.type === 'boot') worker.postMessage({ type: 'init', threads });
      else if (data?.type === 'ready') resolve(data.spec);
      else if (data?.type === 'init-error') reject(new Error(data.message));
    };
    worker.onerror = (e) => reject(new Error(`kimchi ffi worker failed to load: ${e.message}`));
  });
  worker.onmessage = null;
  worker.onerror = null;

  let sab = new SharedArrayBuffer(INITIAL_SAB_BYTES);

  // collect garbage-collected stubs and free their worker-side handles in
  // batches, so long sessions don't leak the handle table
  let pendingFrees = [];
  let registry = new FinalizationRegistry((id) => {
    pendingFrees.push(id);
    if (pendingFrees.length >= 64) {
      worker.postMessage({ type: 'free', ids: pendingFrees });
      pendingFrees = [];
    }
  });

  let stubClasses = {};

  function makeHandle(id, cls) {
    let stub;
    if (cls && stubClasses[cls]) {
      stub = Object.create(stubClasses[cls].prototype);
      stub.__h = id;
    } else {
      if (cls) console.warn(`o1js ffi-proxy: no stub class for '${cls}', methods unavailable`);
      stub = { __h: id };
    }
    registry.register(stub, id);
    return stub;
  }

  // args go through postMessage (structured clone handles typed arrays and
  // plain data); only handles need replacing with markers
  function encodeArg(value) {
    if (value === null || typeof value !== 'object') return value;
    if (typeof value.__h === 'number') return { $: 'h', id: value.__h };
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
    if (Array.isArray(value)) return value.map(encodeArg);
    if (Object.getPrototypeOf(value) === Object.prototype) {
      let out = {};
      for (let k of Object.keys(value)) out[k] = encodeArg(value[k]);
      return out;
    }
    return value;
  }

  // results come back as JSON with markers (see ffi-worker-host.js)
  function decodeResult(value) {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(decodeResult);
    switch (value.$) {
      case 'h':
        return makeHandle(value.id, value.cls);
      case 'undef':
        return undefined;
      case 'big':
        return BigInt(value.v);
      case 'ta': {
        let bytes = base64ToBytes(value.b);
        if (value.t === 'u8') return bytes;
        if (value.t === 'i32') return new Int32Array(bytes.buffer, 0, bytes.byteLength >> 2);
        if (value.t === 'u32') return new Uint32Array(bytes.buffer, 0, bytes.byteLength >> 2);
        if (value.t === 'f64') return new Float64Array(bytes.buffer, 0, bytes.byteLength >> 3);
        throw Error(`unknown typed array tag '${value.t}'`);
      }
      default: {
        let out = {};
        for (let k of Object.keys(value)) out[k] = decodeResult(value[k]);
        return out;
      }
    }
  }

  let textDecoder = new TextDecoder();

  // Atomics.pause (V8 13+/recent Firefox) hints the CPU during spin-waits —
  // long ffi calls (proving) otherwise burn a full core competing with the
  // rayon workers doing the actual work
  let pause = typeof Atomics.pause === 'function' ? Atomics.pause : () => {};

  function spinUntilNotPending(i32) {
    let state;
    while ((state = Atomics.load(i32, 0)) === STATE_PENDING) pause();
    return state;
  }

  function callSync(target, args) {
    let i32 = new Int32Array(sab, 0, 3);
    Atomics.store(i32, 0, STATE_PENDING);
    worker.postMessage({ type: 'call', target, args: args.map(encodeArg), sab });

    // the worker sets the state flag when the result is in the buffer.
    // Atomics.wait is not allowed here (main thread), so spin.
    let state = spinUntilNotPending(i32);

    if (state === STATE_GROW) {
      // result didn't fit; allocate a bigger buffer and ask for a resend
      let needed = Atomics.load(i32, 2);
      sab = new SharedArrayBuffer(needed + HEADER_BYTES);
      let ni32 = new Int32Array(sab, 0, 3);
      Atomics.store(ni32, 0, STATE_PENDING);
      worker.postMessage({ type: 'resend', sab });
      state = spinUntilNotPending(ni32);
      i32 = ni32;
    }

    let length = Atomics.load(i32, 1);
    let bytes = new Uint8Array(length);
    bytes.set(new Uint8Array(sab, HEADER_BYTES, length));
    let payload = JSON.parse(textDecoder.decode(bytes));

    if (state === STATE_ERROR) {
      let error = new Error(payload.message);
      if (payload.stack) error.stack = payload.stack;
      throw error;
    }
    return decodeResult(payload);
  }

  // build the ffi object: plain functions, constants, and stub classes
  let ffi = {};

  for (let name of spec.functions) {
    ffi[name] = (...args) => callSync({ kind: 'fn', name }, args);
  }
  for (let [name, value] of Object.entries(spec.constants)) {
    ffi[name] = value;
  }
  for (let [name, cls] of Object.entries(spec.classes)) {
    let Stub = function (...args) {
      // the decoded result is already a registered stub of this class;
      // returning it overrides `this` (constructor-return-object semantics)
      return callSync({ kind: 'construct', name }, args);
    };
    for (let member of cls.methods) {
      Stub.prototype[member] = function (...args) {
        return callSync({ kind: 'method', name, member, id: this.__h }, args);
      };
    }
    for (let member of cls.getters) {
      Object.defineProperty(Stub.prototype, member, {
        get() {
          return callSync({ kind: 'get', name, member, id: this.__h }, []);
        },
        configurable: true,
      });
    }
    for (let member of cls.setters) {
      let descriptor = Object.getOwnPropertyDescriptor(Stub.prototype, member) ?? {
        configurable: true,
      };
      descriptor.set = function (value) {
        callSync({ kind: 'set', name, member, id: this.__h }, [value]);
      };
      Object.defineProperty(Stub.prototype, member, descriptor);
    }
    for (let member of cls.statics.methods) {
      Stub[member] = (...args) => callSync({ kind: 'static', name, member }, args);
    }
    for (let member of cls.statics.getters) {
      Object.defineProperty(Stub, member, {
        get: () => callSync({ kind: 'static-get', name, member }, []),
        configurable: true,
      });
    }
    stubClasses[name] = Stub;
    ffi[name] = Stub;
  }

  return ffi;
}

function base64ToBytes(b64) {
  let bin = atob(b64);
  let bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
