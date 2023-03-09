import env from 'env';
import { isMainThread } from 'node:worker_threads';

export { snarky_ready };

let snarky_ready = Promise.resolve();

if (isMainThread) {
  env.memory = new WebAssembly.Memory({
    initial: 20,
    maximum: 65536,
    shared: true,
  });
}
