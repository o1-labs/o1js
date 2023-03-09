import env from 'env';
import { isMainThread, workerData } from 'worker_threads';

if (isMainThread) {
  env.memory = new WebAssembly.Memory({
    initial: 20,
    maximum: 65536,
    shared: true,
  });
} else {
  env.memory = workerData.memory;
}
