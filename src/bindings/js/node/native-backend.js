import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { WithThreadPool } from '../../../lib/proof-system/workers.js';

const { platform, arch } = process;
const slug = `@o1js/native-${platform}-${arch}`;

let wasm;
try {
  // Handle both ESM and CommonJS contexts
  const moduleUrl =
    import.meta.url !== undefined ? import.meta.url : pathToFileURL(__filename).href;
  const require_ = createRequire(moduleUrl);
  wasm = require_(slug);
  wasm.__o1js_backend_preference = 'native';
  if (typeof globalThis !== 'undefined') {
    globalThis.__o1js_backend_preference = 'native';
  }
} catch (e) {
  throw new Error(
    `Native backend requested but '${slug}' is not installed.\n` +
      `Install it with: npm install @o1js/native\n` +
      `Original error: ${e.message}`
  );
}

// noop thread pool, napirs uses native os threads
const withThreadPool = WithThreadPool({
  initThreadPool: async () => {},
  exitThreadPool: async () => {},
});

export { wasm, withThreadPool };
