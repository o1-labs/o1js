// copy some files from /src to /dist/node that tsc doesn't copy because we have .d.ts files for them
import { copyFromTo } from './utils.js';

await copyFromTo(
  [
    'src/bindings.d.ts',
    'src/bindings.js',
    'src/bindings/compiled/_node_bindings',
    'src/bindings/compiled/node_bindings/plonk_wasm.d.cts',
  ],
  'src/',
  'dist/node/'
);

// Copy files to dist root for compatibility with some benchmarks
await copyFromTo(
  [
    'src/bindings.js',
  ],
  'src/',
  'dist/'
);

// Copy JS files to the expected bindings/js location
await copyFromTo(
  [
    'src/bindings/js/node/node-backend.js',
    'src/bindings/js/web/web-backend.js',
  ],
  'src/',
  'dist/node/'
).catch(() => {
  console.log('Some JS backend files not found, continuing...');
});

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
  
  // Copy Sparky WASM files to dist root for compatibility
  await copyFromTo(
    [
      'src/bindings/compiled/sparky_node/sparky_wasm_bg.wasm',
    ],
    'src/bindings/compiled/sparky_node/',
    'dist/node/'
  );
} catch (error) {
  console.log('Some Sparky files not found, continuing without them...');
}