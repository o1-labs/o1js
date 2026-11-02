// Provenance + non-tautology check for ./mesa.ts
//
// The golden vectors in mesa.ts were produced by the REAL published
// `mina-signer@4.1.0` (the Mesa signer, o1js main at bb34e65e7). This script
// re-derives every vector from `@4.1.0` and asserts it reproduces the committed
// output, proving that mesa.unit-test.ts checks against an independent oracle.
//
// HOW TO RUN (needs the published signer, which must NOT resolve to this repo's
// own mina-signer, or the check becomes meaningless):
//   mkdir /tmp/ms410 && cd /tmp/ms410
//   npm init -y && npm install mina-signer@4.1.0
//   MINA_SIGNER_410="$PWD/node_modules/mina-signer/dist/node/mina-signer/mina-signer.js" \
//     node /path/to/o1js/src/mina-signer/src/test-vectors/verify-mesa-vectors.mjs
//
// Expect "ALL VECTORS REPRODUCED BY mina-signer@4.1.0" and exit 0.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let specifier = process.env.MINA_SIGNER_410;
if (!specifier) {
  console.error('set MINA_SIGNER_410 to the mina-signer@4.1.0 entry file (see header)');
  process.exit(2);
}
let Client = (await import(pathToFileURL(specifier).href)).default;

let here = path.dirname(fileURLToPath(import.meta.url));
let src = fs.readFileSync(path.join(here, 'mesa.ts'), 'utf8');
// mesa.ts is `export { mesaVectors }; let mesaVectors = { ...JSON... };`
let start = src.indexOf('= {') + 2;
let end = src.lastIndexOf('};') + 1;
let V = JSON.parse(src.slice(start, end));

let pk = V.keypair.privateKey;
let client = new Client({ network: V.network });
let fails = 0;
function eq(name, got, want) {
  let ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) {
    fails++;
    console.log('   got :', JSON.stringify(got));
    console.log('   want:', JSON.stringify(want));
  }
}

function signZk(data) {
  return client.signTransaction({ zkappCommand: data.zkappCommand, feePayer: data.feePayer }, pk).signature;
}
eq('zkapp1 feePayer signature', signZk(V.zkapp1.output.data), V.zkapp1.output.signature);
eq('zkapp2 feePayer signature', signZk(V.zkapp2.output.data), V.zkapp2.output.signature);

console.log(fails === 0 ? '\nALL VECTORS REPRODUCED BY mina-signer@4.1.0' : `\n${fails} MISMATCH(es)`);
process.exit(fails === 0 ? 0 : 1);
