import { Fp, p, inverse } from '../finite-field.js';
import { tic, toc } from '../../../lib/util/tic-toc.js';

const N = 10000;

let fields: bigint[] = Array(N);

bench('inverse', fillRandomFields, () => {
  for (let i = 0; i < N; i++) fields[i] = inverse(fields[i], p)!;
});

bench('fast inverse', fillRandomFields, () => {
  for (let i = 0; i < N; i++) fields[i] = Fp.inverse(fields[i])!;
});

// helpers

function fillRandomFields() {
  for (let i = 0; i < N; i++) fields[i] = Fp.random();
}

function bench(name: string, precompute: () => void, compute: () => void) {
  name = name.padEnd(20, ' ');
  // to warm-up jit compiler
  precompute();
  compute();
  // actual measurement
  precompute();
  tic();
  compute();
  let time = toc();
  console.log(
    `${name} \t ${((time / N) * 1e9).toFixed(0)}ns @ ${(N / time / 1e3)
      .toFixed(0)
      .padStart(4)}K ops/s`
  );
}
