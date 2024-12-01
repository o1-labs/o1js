import { assert } from './errors.js';

export { chunk, chunkString, zip, pad };

function chunk<T>(array: T[], size: number): T[][] {
  assert(
    array.length % size === 0,
    `chunk(): invalid input length, it must be a multiple of ${size}`
  );
  return Array.from({ length: array.length / size }, (_, i) =>
    array.slice(size * i, size * (i + 1))
  );
}

function chunkString(str: string, size: number): string[] {
  return chunk([...str], size).map((c) => c.join(''));
}

function zip<T, S>(a: T[], b: S[]) {
  assert(
    a.length <= b.length,
    'zip(): second array must be at least as long as the first array'
  );
  return a.map((a, i): [T, S] => [a, b[i]!]);
}

function pad<T>(array: T[], size: number, value: T): T[] {
  assert(
    array.length <= size,
    `target size ${size} should be greater or equal than the length of the array ${array.length}`
  );
  return array.concat(Array.from({ length: size - array.length }, () => value));
}
