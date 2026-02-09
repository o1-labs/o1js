export { getBackendPreference, lockBackend, setBackend };

type Backend = 'wasm' | 'native';

let locked = false;

/**
 * Set the backend to use for cryptographic operations such as proving.
 *
 * Must be called **before** `initializeBindings()`. The default backend is `'wasm'`.
 *
 * @example
 * ```ts
 * import { setBackend, initializeBindings } from 'o1js';
 *
 * setBackend('native');
 * await initializeBindings();
 * ```
 */
function setBackend(backend: Backend) {
  if (locked) {
    throw new Error(
      'setBackend() must be called before initializeBindings(). ' +
        'The backend has already been locked in!'
    );
  }
  if (backend !== 'wasm' && backend !== 'native') {
    throw new Error(`Invalid backend '${backend}'. Must be 'wasm' or 'native'.`);
  }
  if (backend === 'native' && typeof window !== 'undefined') {
    console.error(
      "No-op: `setBackend()`:The native backend is not available in the browser. Only 'wasm' is supported. Falling back to 'wasm' backend."
    );
    (globalThis as any).__o1js_backend_preference = 'wasm';
  }
  (globalThis as any).__o1js_backend_preference = backend;
}

function getBackendPreference(): Backend {
  return (globalThis as any).__o1js_backend_preference ?? 'wasm';
}

function lockBackend() {
  locked = true;
}
