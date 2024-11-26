export { workers, setNumberOfWorkers };

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
