import fs from 'node:fs';
let wasmPath = process.argv[2];

let wasmBytes = await fs.promises.readFile(wasmPath);
let wasmArray = [...new Uint8Array(wasmBytes)];
let jsString = `module.exports = new Uint8Array([
  ${wasmArray.join(',')}
]);`;

let jsPath = wasmPath + '.js';

await fs.promises.writeFile(jsPath, jsString);
