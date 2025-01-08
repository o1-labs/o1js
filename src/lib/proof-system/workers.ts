export { workers, setNumberOfWorkers, WithThreadPool };

const workers = {
  numWorkers: undefined as number | undefined,
};

/**
 * Set the number of workers to use for parallelizing the proof generation. By default the number of workers is set to the number of physical CPU cores on your machine, but there may be some instances where you want to set the number of workers manually. Some machines may have a large number of cores, but not enough memory to support that many workers. In that case, you can set the number of workers to a lower number to avoid running out of memory. On the other hand, some machines with heterogeneous cores may benefit from setting the number of workers to a lower number to avoid contention between core types if load-link/store-conditional multithreading is used. Feel free to experiment and see what works best for your use case. Maybe you can squeeze slightly more performance out by tweaking this value :)

 * @example
 * ```typescript
 * setNumberOfWorkers(2); // set the number of workers to 2
 * ```
 */
const setNumberOfWorkers = (numWorkers: number) => {
  workers.numWorkers = numWorkers;
};

type ThreadPoolState =
  | { type: 'none' }
  | { type: 'initializing'; initPromise: Promise<void> }
  | { type: 'running' }
  | { type: 'exiting'; exitPromise: Promise<void> };

function WithThreadPool({
  initThreadPool,
  exitThreadPool,
}: {
  initThreadPool: () => Promise<void>;
  exitThreadPool: () => Promise<void>;
}) {
  // state machine to enable calling multiple functions that need a thread pool at once
  let state: ThreadPoolState = { type: 'none' };
  let isNeededBy = 0;

  return async function withThreadPool<T>(run: () => Promise<T>): Promise<T> {
    isNeededBy++;
    // none, exiting -> initializing
    switch (state.type) {
      case 'none': {
        let initPromise = initThreadPool();
        state = { type: 'initializing', initPromise };
        break;
      }
      case 'initializing':
      case 'running':
        break;
      case 'exiting': {
        let initPromise = state.exitPromise.then(initThreadPool);
        state = { type: 'initializing', initPromise };
        break;
      }
    }
    // initializing -> running
    if (state.type === 'initializing') await state.initPromise;
    state = { type: 'running' };

    let result: T;
    try {
      result = await run();
    } finally {
      // running -> exiting IF we don't need to run longer
      isNeededBy--;

      if (state.type !== 'running') {
        throw Error('bug in ThreadPool state machine');
      }

      if (isNeededBy < 1) {
        let exitPromise = exitThreadPool();
        state = { type: 'exiting', exitPromise };

        // exiting -> none IF we didn't move exiting -> initializing
        await exitPromise;
        if (state.type === 'exiting') {
          state = { type: 'none' };
        }
      }
    }
    return result;
  };
}
