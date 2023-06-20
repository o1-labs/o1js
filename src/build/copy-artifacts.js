// copy some files from /src to /dist/node that tsc doesn't copy because we have .d.ts files for them
import { copyFromTo } from './utils.js';

await copyFromTo(
  ['src/bindings/compiled/node_bindings/'],
  'node_bindings',
  '_node_bindings'
);
