/**
 * copy-to-dist.js - Copy necessary files from /src to /dist/node
 *
 * This script copies files that TypeScript compiler (tsc) doesn't automatically
 * copy to the output directory. This happens typically with .d.ts type definition
 * files and precompiled bindings that need to be available in the distribution.
 *
 * Files copied:
 * - src/snarky.d.ts - TypeScript declarations for the snarky module
 * - src/bindings/compiled/_node_bindings - Node.js native bindings directory
 * - src/bindings/compiled/node_bindings/plonk_wasm.d.cts - Type definitions for 
 *   WASM
 *
 * This script is typically run as part of the build process after TypeScript
 * compilation to ensure all necessary files are available in the dist directory.
 */

import { copyFromTo } from './utils.js';

// Copy files that TypeScript doesn't automatically include in the build
await copyFromTo(
  [
    'src/snarky.d.ts',
    'src/bindings/compiled/_node_bindings',
    'src/bindings/compiled/node_bindings/plonk_wasm.d.cts',
  ],
  'src/',
  'dist/node/'
);
