import minimist from 'minimist';
import { buildAndImport } from './build.mjs';
let {
  _: [filePath],
} = minimist(process.argv.slice(2));

if (!filePath) {
  console.log(`Usage:
node generate-keys.mjs [file]`);
  process.exit(0);
}

let module = await buildAndImport(filePath);
let Class = module.default;
let keypair = Class.generateKeypair();
console.dir(keypair, { depth: null });

// Uint8Array.prototype.toJSON = function () {
//   return `new Uint8Array(${JSON.stringify([...this])})`;
// };
// console.log(JSON.stringify(new Uint8Array([1, 2, 3, 4])));
