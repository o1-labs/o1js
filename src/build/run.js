#!/usr/bin/env node
/**
 * run.js - Command-line tool for building and running o1js TypeScript examples
 *
 * This script is the entry point for the 'snarky-run' command, which allows users
 * to quickly compile and run TypeScript examples without manual build steps.
 *
 * Usage:
 *   npx snarky-run [options] <file.ts>
 *
 * Options:
 *   --main      Run the main() function from the module
 *   --default   Run the default export from the module
 *   --keep      Keep the temporary compiled file
 *   --bundle    Use bundling mode (buildAndImport)
 *
 * Examples:
 *   npx snarky-run src/examples/hello-world.ts
 *   npx snarky-run --bundle --main src/examples/test.ts
 *
 * The script works in two modes:
 * 1. Non-bundled mode (default): Compiles the file to dist/node and preserves 
 *    imports
 * 2. Bundled mode (--bundle): Bundles the file with its dependencies and runs it
 */

import minimist from 'minimist';
import { buildAndImport, buildOne } from './build-example.js';

// Parse command line arguments
let {
  _: [filePath],
  main,
  default: runDefault,
  keep,
  bundle,
} = minimist(process.argv.slice(2));

// Show usage information if no file path is provided
if (!filePath) {
  console.log(`Usage:
npx snarky-run [options] <file.ts>

Options:
  --main      Run the main() function from the module
  --default   Run the default export from the module
  --keep      Keep the temporary compiled file
  --bundle    Use bundling mode (buildAndImport)

Examples:
  npx snarky-run src/examples/hello-world.ts
  npx snarky-run --bundle --main src/examples/test.ts`);
  process.exit(0);
}

// Run in the appropriate mode
if (!bundle) {
  // Non-bundled mode: Build to dist/node with proper path structure
  let absPath = await buildOne(filePath);
  console.log(`running ${absPath}`);
  let module = await import(absPath);
  if (main) await module.main();
  if (runDefault) await module.default();
} else {
  // Bundled mode: Build and immediately import (with cleanup)
  let module = await buildAndImport(filePath, { keepFile: !!keep });
  if (main) await module.main();
  if (runDefault) await module.default();
}
