/**
 * Build script for creating the browser-compatible version of o1js
 *
 * This module handles the complex process of packaging o1js for web 
 * environments, including preparing WebAssembly bindings, bundling 
 * dependencies, and optimizing for browser compatibility. It performs 
 * several key tasks:
 *
 * 1. Prepares and bundles the WebAssembly bindings with proper browser loading
 * 2. Compiles TypeScript using the web-specific configuration
 * 3. Copies necessary files to the distribution directory
 * 4. Handles minification of code in production builds
 * 5. Processes WASM files for browser compatibility
 * 6. Creates the final bundled ESM output for web usage
 *
 * @module build-web
 */

import esbuild from 'esbuild';
import fse, { move } from 'fs-extra';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import glob from 'glob';

export { buildWeb };

const entry = './src/index.ts';
const target = 'es2022';

// Determine if this script is being run directly
let nodePath = path.resolve(process.argv[1]);
let modulePath = path.resolve(fileURLToPath(import.meta.url));
let isMain = nodePath === modulePath;

if (isMain) {
  console.log('building', entry);
  await buildWeb({ production: process.env.NODE_ENV === 'production' });
  console.log('finished build');
}

/**
 * Builds the web (browser) version of o1js
 *
 * This function orchestrates the entire build process for the browser-compatible
 * version of the library. It handles WebAssembly integration, TypeScript
 * compilation, file copying, and bundling.
 *
 * @param {Object} options - Build configuration options
 * @param {boolean} options.production - Whether to build in production mode
 *                                       (enables minification)
 * @returns {Promise<void>} Resolves when the build process is complete
 */
async function buildWeb({ production }) {
  let minify = !!production;

  // prepare plonk_wasm.js with bundled wasm in function-wrapped form
  let bindings = await readFile('./src/bindings/compiled/web_bindings/plonk_wasm.js', 'utf8');
  bindings = rewriteWasmBindings(bindings);
  let tmpBindingsPath = 'src/bindings/compiled/web_bindings/plonk_wasm.tmp.js';
  await writeFile(tmpBindingsPath, bindings);
  await esbuild.build({
    entryPoints: [tmpBindingsPath],
    bundle: true,
    format: 'esm',
    outfile: tmpBindingsPath,
    target: 'esnext',
    plugins: [wasmPlugin()],
    allowOverwrite: true,
  });
  bindings = await readFile(tmpBindingsPath, 'utf8');
  bindings = rewriteBundledWasmBindings(bindings);
  await writeFile(tmpBindingsPath, bindings);

  // run typescript
  await execPromise('npx tsc -p tsconfig.web.json');

  // copy over pure js files
  await copy({
    './src/bindings/compiled/web_bindings/': './dist/web/web_bindings/',
    './src/snarky.d.ts': './dist/web/snarky.d.ts',
    './src/snarky.web.js': './dist/web/snarky.js',
    './src/bindings/js/web/': './dist/web/bindings/js/web/',
  });

  if (minify) {
    let o1jsWebPath = './dist/web/web_bindings/o1js_web.bc.js';
    let o1jsWeb = await readFile(o1jsWebPath, 'utf8');
    let { code } = await esbuild.transform(o1jsWeb, {
      target,
      logLevel: 'error',
      minify,
    });
    await writeFile(o1jsWebPath, code);
  }

  // overwrite plonk_wasm with bundled version
  await copy({ [tmpBindingsPath]: './dist/web/web_bindings/plonk_wasm.js' });
  await unlink(tmpBindingsPath);

  // move all .web.js files to their .js counterparts
  let webFiles = glob.sync('./dist/web/**/*.web.js');
  await Promise.all(
    webFiles.map((file) => move(file, file.replace('.web.js', '.js'), { overwrite: true }))
  );

  // run esbuild on the js entrypoint
  let jsEntry = path.basename(entry).replace('.ts', '.js');
  await esbuild.build({
    entryPoints: [`./dist/web/${jsEntry}`],
    bundle: true,
    format: 'esm',
    outfile: 'dist/web/index.js',
    resolveExtensions: ['.js', '.ts'],
    plugins: [wasmPlugin(), srcStringPlugin()],
    dropLabels: ['CJS'],
    external: ['*.bc.js'],
    target,
    allowOverwrite: true,
    logLevel: 'error',
    minify,
  });
}

/**
 * Copies files or directories from source locations to target locations
 *
 * @param {Object} copyMap - Object mapping source paths to target paths
 * @returns {Promise<void>} Resolves when all copy operations are complete
 */
async function copy(copyMap) {
  let promises = [];
  for (let [source, target] of Object.entries(copyMap)) {
    promises.push(
      fse.copy(source, target, {
        recursive: true,
        overwrite: true,
        dereference: true,
      })
    );
  }
  await Promise.all(promises);
}

/**
 * Promisified version of child_process.exec
 *
 * @param {string} cmd - Command to execute
 * @returns {Promise<string>} Resolves with stdout when the command completes
 */
function execPromise(cmd) {
  return new Promise((res, rej) =>
    exec(cmd, (err, stdout) => {
      if (err) {
        console.log(stdout);
        return rej(err);
      }
      res(stdout);
    })
  );
}

/**
 * Rewrites WebAssembly bindings to make them compatible with browser bundling
 *
 * This function modifies the auto-generated WebAssembly bindings to support
 * direct importing of WASM binary data and prepare for worker integration.
 *
 * @param {string} src - Original WebAssembly bindings source code
 * @returns {string} Modified WebAssembly bindings source code
 */
function rewriteWasmBindings(src) {
  src = src
    .replace("new URL('plonk_wasm_bg.wasm', import.meta.url)", 'wasmCode')
    .replace('import.meta.url', '"/"');
  return `import wasmCode from './plonk_wasm_bg.wasm';
  let startWorkers, terminateWorkers;
${src}`;
}

/**
 * Rewrites bundled WebAssembly bindings for better browser compatibility
 *
 * This function transforms the bundled WASM bindings to export a function that
 * initializes the WASM module and integrates with the worker system.
 *
 * @param {string} src - Bundled WebAssembly bindings source code
 * @returns {string} Transformed WebAssembly bindings ready for browser use
 */
function rewriteBundledWasmBindings(src) {
  let i = src.indexOf('export {');
  let exportSlice = src.slice(i);
  let defaultExport = exportSlice.match(/\w* as default/)[0];
  exportSlice = exportSlice
    .replace(defaultExport, `default: __wbg_init`)
    .replace('export', 'return');
  src = src.slice(0, i) + exportSlice;

  src = src.replace('var startWorkers;\n', '');
  src = src.replace('var terminateWorkers;\n', '');
  return `import { startWorkers, terminateWorkers } from '../bindings/js/web/worker-helpers.js'
export {plonkWasm as default};
function plonkWasm() {
  ${src}
}
plonkWasm.deps = [startWorkers, terminateWorkers]`;
}

/**
 * Creates an esbuild plugin to handle WebAssembly imports
 *
 * This plugin allows direct importing of .wasm files by loading them
 * as binary content and making them available to the JavaScript runtime.
 *
 * @returns {Object} esbuild plugin for WebAssembly processing
 */
function wasmPlugin() {
  return {
    name: 'wasm-plugin',
    setup(build) {
      build.onLoad({ filter: /\.wasm$/ }, async ({ path }) => {
        return {
          contents: await readFile(path),
          loader: 'binary',
        };
      });
    },
  };
}

/**
 * Creates an esbuild plugin to load files as strings
 *
 * This plugin enables importing file contents directly as strings by
 * using the `string:` prefix in import paths. Useful for loading
 * templates or other text-based resources.
 *
 * @returns {Object} esbuild plugin for string imports
 */
function srcStringPlugin() {
  return {
    name: 'src-string-plugin',
    setup(build) {
      build.onResolve({ filter: /^string:/ }, async ({ path: importPath, resolveDir }) => {
        let absPath = path.resolve(resolveDir, importPath.replace('string:', ''));
        return {
          path: absPath,
          namespace: 'src-string',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'src-string' }, async ({ path }) => {
        return {
          contents: await readFile(path, 'utf8'),
          loader: 'text',
        };
      });
    },
  };
}

/**
 * Creates an esbuild plugin to defer execution of imported code
 *
 * This plugin allows code to be imported but not executed immediately.
 * It wraps the imported code in a function that can be called later,
 * which is useful for conditional loading or environment-specific code.
 *
 * @returns {Object} esbuild plugin for deferred execution
 */
function deferExecutionPlugin() {
  return {
    name: 'defer-execution-plugin',
    setup(build) {
      build.onResolve({ filter: /^defer:/ }, async ({ path: importPath, resolveDir }) => {
        let absPath = path.resolve(resolveDir, importPath.replace('defer:', ''));
        return {
          path: absPath,
          namespace: 'defer-execution',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'defer-execution' }, async ({ path }) => {
        let code = await readFile(path, 'utf8');
        // replace direct eval, because esbuild refuses to bundle it
        // code = code.replace(/eval\(/g, '(0, eval)(');
        code = code.replace(/function\(\)\s*\{\s*return this\s*\}\(\)/g, 'window');
        code = code.replace(/function\(\)\s*\{\s*return this;\s*\}\(\)/g, 'window');
        let deferedCode = `
        let require = () => {};
        export default () => {\n${code}\n};`;
        return {
          contents: deferedCode,
          loader: 'js',
        };
      });
    },
  };
}
