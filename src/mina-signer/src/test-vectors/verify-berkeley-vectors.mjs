// Provenance + non-tautology check for ./berkeley.ts
//
// The golden vectors in berkeley.ts were produced by the REAL published
// `mina-signer@3.0.7` (the signer shipped with o1js v2.9.0 / berkeley). This
// script re-derives every vector from `@3.0.7` and asserts it reproduces the
// committed output, proving (a) the vectors genuinely came from @3.0.7 and
// (b) berkeley.unit-test.ts is not a tautology (the vectors are an independent
// oracle, not produced by this branch).
//
// HOW TO RUN (needs the old signer, which is NOT a repo dependency — and must NOT
// resolve to this repo's own mina-signer@4.0.0, or the check becomes meaningless):
//   mkdir /tmp/ms307 && cd /tmp/ms307
//   npm init -y && npm install mina-signer@3.0.7
//   MINA_SIGNER_307="$PWD/node_modules/mina-signer/dist/node/mina-signer.js" \
//     node /path/to/o1js/src/mina-signer/src/test-vectors/verify-berkeley-vectors.mjs
//
// MINA_SIGNER_307 must point at the @3.0.7 entry (bare 'mina-signer' resolves from
// this script's location = the o1js repo = the wrong version). Expect:
// "ALL VECTORS REPRODUCED BY mina-signer@3.0.7" and exit 0.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let specifier = process.env.MINA_SIGNER_307;
if (!specifier) {
  console.error('set MINA_SIGNER_307 to the mina-signer@3.0.7 entry file (see header)');
  process.exit(2);
}
let Client = (await import(pathToFileURL(specifier).href)).default;

let here = path.dirname(fileURLToPath(import.meta.url));
let src = fs.readFileSync(path.join(here, 'berkeley.ts'), 'utf8');
// berkeley.ts is `export { berkeleyVectors }; let berkeleyVectors = { ...JSON... };`
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

// legacy (era-invariant) surface
eq('payment', client.signPayment(V.payment.input, pk).signature, V.payment.output.signature);
eq('stakeDelegation', client.signStakeDelegation(V.stakeDelegation.input, pk).signature, V.stakeDelegation.output.signature);
eq('message', client.signMessage(V.message.input, pk).signature, V.message.output.signature);
eq('fields', client.signFields(V.fields.input.map(BigInt), pk).signature, V.fields.output.signature);

// zkApp commands. @3.0.7 signTransaction takes the wrapper { zkappCommand, feePayer };
// output.data is exactly that wrapper, with appState in the berkeley [null x 8] form
// (the documented `.input` omits appState; @3.0.7 does not default an omitted array).
function signZk(data) {
  return client.signTransaction({ zkappCommand: data.zkappCommand, feePayer: data.feePayer }, pk).signature;
}
eq('zkapp1 feePayer signature', signZk(V.zkapp1.output.data), V.zkapp1.output.signature);
eq('zkapp2 feePayer signature', signZk(V.zkapp2.output.data), V.zkapp2.output.signature);

console.log(fails === 0 ? '\nALL VECTORS REPRODUCED BY mina-signer@3.0.7' : `\n${fails} MISMATCH(es)`);
process.exit(fails === 0 ? 0 : 1);
