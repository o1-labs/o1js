import { createRequire } from 'node:module';
import { WithThreadPool } from '../../../lib/proof-system/workers.js';

const { platform, arch } = process;
const slug = `@o1js/native-${platform}-${arch}`;

let wasm;
try {
  const require_ = createRequire(import.meta.url);
  wasm = require_(slug);
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
