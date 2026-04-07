import fs from 'node:fs/promises';
import path from 'node:path';

import { Experimental, Field, Gadgets, assert } from 'o1js';
import { initializeBindings, Pickles, wasm } from '../bindings.js';
import { getRustConversion } from '../bindings/crypto/bindings.js';
import { OrInfinity, OrInfinityJson } from '../bindings/crypto/bindings/curve.js';
import { MlArray } from '../lib/ml/base.js';

const { ZkFunction } = Experimental;

type ZkFunctionKimchiBundle = {
  circuit: string;
  proof: Experimental.KimchiJsonProof;
  verificationKey: string;
  srs: OrInfinityJson[];
};

const outPath = process.argv[3] ?? '.tmp-zkfunction-kimchi-bundle.json';

const cubeRoot64 = ZkFunction({
  name: 'cube-root-64',
  publicInputType: Field,
  privateInputTypes: [Field],
  main: (x: Field, y: Field) => {
    Gadgets.rangeCheck64(y);
    y.square().mul(y).assertEquals(x);
  },
});

async function main() {
  await initializeBindings();

  console.log('Compiling ZkFunction...');
  const { verificationKey } = await cubeRoot64.compile();

  const x = Field(8);
  const y = Field(2);

  console.log('Proving...');
  const proof = await cubeRoot64.prove(x, y);

  console.log('Verifying in o1js...');
  const ok = await cubeRoot64.verify(proof, verificationKey);
  assert(ok, 'o1js verification failed');

  const rustConversion = getRustConversion(wasm);
  const wasmSrs = wasm.caml_fp_srs_get(Pickles.loadSrsFp());
  const mlSrs = rustConversion.fp.pointsFromRust(wasmSrs);
  const srs = MlArray.mapFrom(mlSrs, OrInfinity.toJSON);

  const bundle: ZkFunctionKimchiBundle = {
    circuit: 'cube-root-64',
    proof: proof.toJSON(),
    verificationKey: verificationKey.toString(),
    srs,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(bundle, null, 2)}\n`);

  console.log(`Wrote bundle to ${outPath}`);
}

await main();
