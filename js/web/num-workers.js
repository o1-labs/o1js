import { getGPUTier } from 'detect-gpu';

export { getEfficientNumWorkers };

// Return the most efficient number of workers for the platform we're running
// on. This is required because of an issue with Apple silicon that's outlined
// here: https://bugs.chromium.org/p/chromium/issues/detail?id=1228686
async function getEfficientNumWorkers() {
  let gpuTier = await getGPUTier();
  let numCpus = navigator.hardwareConcurrency;
  // gpuTier.gpu is undefined if page was rendered server side
  let gpuModel = gpuTier.gpu;

  let numWorkers =
    {
      'apple m1': 2,
      'apple m1 pro': numCpus === 10 ? 3 : 2,
      'apple m1 max': 3,
      'apple m1 ultra': 7,
      'apple m2': 2,
    }[gpuModel] || numCpus - 1;

  return numWorkers;
}
