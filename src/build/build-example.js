/**
 * build-example.js
 *
 * This module provides utility functions for building and importing o1js 
 * TypeScript examples. It allows compiling and bundling TypeScript files for 
 * either Node.js or web environments, with different levels of bundling and 
 * import capabilities.
 *
 * Main functions:
 * - buildAndImport: Builds a TypeScript file and dynamically imports it
 * - build: Builds and bundles a TypeScript file for Node.js or web
 * - buildOne: Builds a single TypeScript file to a specific output location in 
 *   dist/node
 */

import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import esbuild from 'esbuild';
import { platform } from 'node:process';

export { buildAndImport, build, buildOne };

/**
 * Builds a TypeScript file and dynamically imports it as a module
 *
 * @param {string} srcPath - Path to the TypeScript source file
 * @param {Object} options - Options for the build
 * @param {boolean} options.keepFile - Whether to keep the temporary compiled file
 * @returns {Object} The imported module
 */
async function buildAndImport(srcPath, { keepFile = false }) {
  let absPath = await build(srcPath);
  let importedModule;
  try {
    importedModule = await import(absPath);
  } finally {
    if (!keepFile) await fs.unlink(absPath.replace(/^file:\/\/\/*/, ''));
  }
  return importedModule;
}

/**
 * Builds and bundles a TypeScript file for either Node.js or web environment
 *
 * This function:
 * 1. Finds the TypeScript config or uses a default one
 * 2. Creates a bundled JavaScript file from the TypeScript source
 * 3. Returns the absolute path to the generated file
 *
 * @param {string} srcPath - Path to the TypeScript source file
 * @param {boolean} isWeb - Whether to build for web (true) or Node.js (false)
 * @returns {string} The absolute path to the built file
 */
async function build(srcPath, isWeb = false) {
  let tsConfig = findTsConfig() ?? defaultTsConfig;
  // TODO hack because ts.transpileModule doesn't treat module = 'nodenext' correctly
  // but `tsc` demands it to be `nodenext`
  tsConfig.compilerOptions.module = 'esnext';

  let outfile = srcPath.replace('.ts', '.tmp.js');

  await esbuild.build({
    entryPoints: [srcPath],
    bundle: true,
    format: 'esm',
    platform: isWeb ? 'node' : 'browser', // Note: these seem flipped, but match original code
    outfile,
    target: 'esnext',
    resolveExtensions: ['.node.js', '.ts', '.js'],
    logLevel: 'error',
    plugins: isWeb
      ? [typescriptPlugin(tsConfig), makeO1jsExternal()]
      : [typescriptPlugin(tsConfig), makeNodeModulesExternal(), makeJsooExternal()],
    dropLabels: ['CJS'],
  });

  let absPath = path.resolve('.', outfile);
  if (platform === 'win32') {
    absPath = 'file:///' + absPath;
  }
  return absPath;
}

/**
 * Builds a single TypeScript file to a specific output location in dist/node
 *
 * Unlike the regular build function, this:
 * 1. Outputs to dist/node directory with correct path structure
 * 2. Is not bundled, producing a standalone ES module
 * 3. Maintains path structure relative to src
 *
 * @param {string} srcPath - Path to the TypeScript source file
 * @returns {string} The absolute path to the built file
 */
async function buildOne(srcPath) {
  let tsConfig = findTsConfig() ?? defaultTsConfig;
  // TODO hack because ts.transpileModule doesn't treat module = 'nodenext' correctly
  // but `tsc` demands it to be `nodenext`
  tsConfig.compilerOptions.module = 'esnext';

  let outfile = path.resolve('./dist/node', srcPath.replace('.ts', '.js').replace('src', '.'));

  await esbuild.build({
    entryPoints: [srcPath],
    format: 'esm',
    platform: 'node',
    outfile,
    target: 'esnext',
    resolveExtensions: ['.node.js', '.ts', '.js'],
    logLevel: 'error',
    plugins: [typescriptPlugin(tsConfig)],
  });

  let absPath = path.resolve('.', outfile);
  if (platform === 'win32') {
    absPath = 'file:///' + absPath;
  }
  return absPath;
}

/**
 * Default TypeScript configuration used when no tsconfig.json is found
 * Contains essential compiler options for the o1js project
 */
const defaultTsConfig = {
  compilerOptions: {
    module: 'esnext',
    lib: ['dom', 'esnext'],
    target: 'esnext',
    importHelpers: true,
    strict: true,
    moduleResolution: 'nodenext',
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowSyntheticDefaultImports: true,
  },
};

/**
 * Creates an esbuild plugin to handle TypeScript files
 *
 * @param {Object} tsConfig - TypeScript configuration to use for transpilation
 * @returns {Object} An esbuild plugin for TypeScript
 */
function typescriptPlugin(tsConfig) {
  return {
    name: 'plugin-typescript',
    setup(build) {
      build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
        let src = await fs.readFile(args.path, { encoding: 'utf8' });
        let { outputText: contents } = ts.transpileModule(src, tsConfig);
        return { contents };
      });
    },
  };
}

/**
 * Creates an esbuild plugin that marks node_modules as external
 * This prevents esbuild from bundling them, which is useful for Node.js builds
 *
 * @returns {Object} An esbuild plugin for marking node_modules as external
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
 * Creates an esbuild plugin that marks o1js as external
 * This is useful for web builds that import o1js from a specific path
 *
 * @returns {Object} An esbuild plugin for marking o1js as external
 */
function makeO1jsExternal() {
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: /^o1js$/ }, () => ({
        path: './index.js',
        external: true,
      }));
    },
  };
}

/**
 * Creates an esbuild plugin that marks JSOO/WASM files as external
 * This prevents esbuild from trying to process binary files
 *
 * @returns {Object} An esbuild plugin for marking JSOO/WASM files as external
 */
function makeJsooExternal() {
  let isJsoo = /(bc.cjs|plonk_wasm.cjs)$/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isJsoo }, ({ path: filePath, resolveDir }) => {
        return {
          path: path.resolve(resolveDir, filePath),
          external: true,
        };
      });
    },
  };
}

/**
 * Finds and parses the nearest tsconfig.json file
 *
 * @returns {Object|undefined} The parsed TypeScript configuration, or undefined if
 *                             not found
 */
function findTsConfig() {
  let tsConfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);
  if (tsConfigPath === undefined) return;
  let text = ts.sys.readFile(tsConfigPath);
  if (text === undefined) throw new Error(`failed to read '${tsConfigPath}'`);
  return ts.parseConfigFileTextToJson(tsConfigPath, text).config;
}
