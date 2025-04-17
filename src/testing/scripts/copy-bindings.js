import { copyFromTo } from '../../build/utils.js';

await copyFromTo(
  ['../../dist/node/bindings/compiled'],
  '../../dist/node/bindings',
  'dist/node/bindings'
);
