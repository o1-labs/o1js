// copy some files from /src to /dist/node that tsc doesn't copy because we have .d.ts files for them
import { copyFromTo } from './utils.js';

await copyFromTo(
  [
    'src/bindings.d.ts',
    'src/bindings/compiled/_node_bindings',
    'src/bindings/compiled/native',
    'src/bindings/compiled/node_bindings/kimchi_wasm.d.cts',
  ],
  'src/',
  'dist/node/'
);
