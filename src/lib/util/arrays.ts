import { assert } from './errors.js';

export { chunk, chunkString };

function chunk<T>(array: T[], size: number): T[][] {
  assert(array.length % size === 0, 'invalid input length');
  return Array.from({ length: array.length / size }, (_, i) =>
    array.slice(size * i, size * (i + 1))
  );
}

function chunkString(str: string, size: number): string[] {
  return chunk([...str], size).map((c) => c.join(''));
}
