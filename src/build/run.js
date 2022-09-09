#!/usr/bin/env node
import minimist from 'minimist';
import { buildAndImport } from './buildExample.js';
import { shutdown } from '../../dist/node/index.js';

let {
  _: [filePath],
  main,
  default: runDefault,
  keypair: keyPair,
  keep,
} = minimist(process.argv.slice(2));

if (!filePath) {
  console.log(`Usage:
npx snarky-run [file]`);
  process.exit(0);
}

let module = await buildAndImport(filePath, { keepFile: !!keep });
if (main) await module.main();
if (runDefault) await module.default();
if (keyPair) {
  console.log(module.default.generateKeypair());
}
shutdown();
