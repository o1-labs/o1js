// copy some files from /src to /dist/node that tsc doesn't copy because we have .d.ts files for them
import { copyFromTo } from './utils.js';

await copyFromTo(
  [
    'src/bindings.d.ts',
    'src/bindings/compiled/_node_bindings',
    'src/bindings/compiled/node_bindings/plonk_wasm.d.cts',
  ],
  'src/',
  'dist/node/'
);

// Copy Sparky bindings if they exist
try {
  await copyFromTo(
    [
      'src/bindings/compiled/sparky_node',
      'src/bindings/compiled/sparky_web',
      'src/bindings/sparky-adapter.js',
    ],
    'src/',
    'dist/node/'
  );
} catch (error) {
  console.log('Some Sparky files not found, continuing without them...');
}