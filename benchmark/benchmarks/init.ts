/**
 * Initialization benchmark
 */

import { benchmark } from '../benchmark.js';

export { InitBenchmark };

const InitBenchmark = benchmark(
  'init',
  async (tic, toc) => {
    tic('o1js import');
    const { initializeBindings } = await import('o1js');
    toc();

    tic('bindings initialization');
    await initializeBindings();
    toc();
  },
  { numberOfWarmups: 0, numberOfRuns: 1 }
);
