#!/usr/bin/env node
import minimist from 'minimist';
import { buildAndImport } from './build.mjs';
import { shutdown } from '../index.mjs';

let {
  _: [filePath],
  main,
  default: runDefault,
  keypair: keyPair,
} = minimist(process.argv.slice(2));

if (!filePath) {
  console.log(`Usage:
./run [file]`);
  process.exit(0);
}

let module = await buildAndImport(filePath);
if (main) await module.main();
if (runDefault) await module.default();
if (keyPair) {
  console.log(module.default.generateKeypair());
}
shutdown();
