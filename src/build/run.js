#!/usr/bin/env node
import minimist from 'minimist';
import { buildOne } from './buildExample.js';

let {
  _: [filePath],
  main,
  default: runDefault,
} = minimist(process.argv.slice(2));

if (!filePath) {
  console.log(`Usage:
npx snarky-run [file]`);
  process.exit(0);
}

let absPath = await buildOne(filePath);
console.log(`running ${absPath}`);
let module = await import(absPath);
if (main) await module.main();
if (runDefault) await module.default();
let { shutdown } = await import('../../dist/node/index.js');
shutdown();
