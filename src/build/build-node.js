/**
 * build-node.js - Builds the CommonJS version of o1js for Node.js
 *
 * This script builds the CommonJS version of o1js from the compiled ESM 
 * JavaScript. It uses esbuild to convert the ES modules into a CommonJS bundle 
 * that can be used in environments that don't support ES modules directly.
 *
 * The generated file will be dist/node/index.cjs, which is referenced in the
 * package.json "exports" field for CommonJS compatibility.
 *
 * Usage:
 *   node build-node.js [--bindings=<path>]
 *
 * Options:
 *   --bindings  Path to the bindings directory 
 *               (default: ./src/bindings/compiled/node_bindings/)
 *
 * Environment variables:
 *   NODE_ENV=production  Build in production mode
 */

import path from 'node:path';
import { platform } from 'node:process';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import minimist from 'minimist';

// Parse command line arguments
let { bindings = './src/bindings/compiled/node_bindings/' } = minimist(process.argv.slice(2));

export { buildNode };

// Configuration
const entry = './src/index.ts';
const target = 'es2021';

// Determine if script is being run directly or imported
let nodePath = path.resolve(process.argv[1]);
let modulePath = path.resolve(fileURLToPath(import.meta.url));
let isMain = nodePath === modulePath;

// If run directly, execute the build
if (isMain) {
  console.log('building cjs version of', entry);
  console.log('using bindings from', bindings);
  await buildNode({ production: process.env.NODE_ENV === 'production' });
  console.log('finished build');
}

/**
 * Builds the CommonJS version of o1js for Node.js
 *
 * This function:
 * 1. Takes the compiled ESM JavaScript from TypeScript
 * 2. Bundles it into a single file with CommonJS format
 * 3. Excludes node_modules and binary artifacts from the bundle
 * 4. Generates a .cjs file that can be required in CommonJS environments
 *
 * @param {Object} options - Build options
 * @param {boolean} options.production - Whether to build in production mode
 * @returns {Promise<void>} A promise that resolves when the build is complete
 */
async function buildNode({ production }) {
  // bundle the index.js file with esbuild and create a new index.cjs file which conforms to CJS
  let jsEntry = path.resolve('dist/node', path.basename(entry).replace('.ts', '.js'));
  let outfile = jsEntry.replace('.js', '.cjs');
  await esbuild.build({
    entryPoints: [jsEntry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile,
    target,
    resolveExtensions: ['.node.js', '.ts', '.js'],
    allowOverwrite: true,
    plugins: [makeNodeModulesExternal(), makeJsooExternal()],
    dropLabels: ['ESM'],
    minify: false, // Currently not minified even in production
  });
}

/**
 * Creates an esbuild plugin that marks node_modules as external
 *
 * This plugin prevents esbuild from bundling node_modules dependencies,
 * which keeps the output bundle size smaller and avoids compatibility issues.
 *
 * @returns {Object} esbuild plugin configuration
 */
function makeNodeModulesExternal() {
  let isNodeModule = /^[^./\\]|^\.[^./\\]|^\.\.[^/\\]/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isNodeModule }, ({ path }) => ({
        path,
        external: !(platform === 'win32' && path.endsWith('index.js')),
      }));
    },
  };
}

/**
 * Creates an esbuild plugin that marks JSOO/WASM bindings as external
 *
 * This plugin excludes binary artifacts from the bundle and ensures they are
 * correctly referenced with relative paths in the output.
 *
 * @returns {Object} esbuild plugin configuration
 */
function makeJsooExternal() {
  let isJsoo = /(bc.cjs|plonk_wasm.cjs)$/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isJsoo }, ({ path: filePath, resolveDir }) => ({
        path:
          './' + path.relative(path.resolve('.', 'dist/node'), path.resolve(resolveDir, filePath)),
        external: true,
      }));
    },
  };
}
