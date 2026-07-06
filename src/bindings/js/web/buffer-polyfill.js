// emnapi needs a `Buffer` to implement napi_create_buffer & friends (kimchi
// exposes Buffer-typed values, e.g. verifier-index shifts). browsers don't
// have one; emnapi only uses `from`, `alloc` and instanceof checks, so a thin
// Uint8Array subclass is enough.
//
// @emnapi/runtime captures `Buffer` at module evaluation time, so this module
// must be imported (for its side effect) BEFORE @napi-rs/wasm-runtime.
// TEMP CI diagnosis (remove): first evaluated statement in the ffi worker
// host's import graph — proves the worker script started evaluating.
try {
  if (typeof WorkerGlobalScope !== 'undefined')
    void fetch('/__o1js_boot_stage/worker-evaluating');
} catch {}

class BufferPolyfill extends Uint8Array {
  static alloc(size) {
    return new BufferPolyfill(size);
  }
  static from(value, offset, length) {
    if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
      return offset === undefined
        ? new BufferPolyfill(value)
        : new BufferPolyfill(value, offset, length);
    }
    // typed array / array-like: copy
    return new BufferPolyfill(value);
  }
  static isBuffer(value) {
    return value instanceof BufferPolyfill;
  }
}
if (globalThis.Buffer === undefined) globalThis.Buffer = BufferPolyfill;
