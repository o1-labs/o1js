import { isReady, PrivateKey, shutdown, compile } from 'snarkyjs';
import SimpleSnapp from './simple_snapp';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

await isReady;

// TODO: get keys from somewhere else; for now we assume the account is already funded
let snappPrivateKey = PrivateKey.random();
let snappAddress = snappPrivateKey.toPublicKey();

let { verificationKey } = compile(SimpleSnapp, snappAddress);
storeArtifact(SimpleSnapp, { verificationKey });

shutdown();

function storeArtifact(SmartContract: Function, json: unknown) {
  let thisFolder = dirname(fileURLToPath(import.meta.url));
  if (!existsSync(`${thisFolder}/build`)) {
    mkdirSync(`${thisFolder}/build`);
  }
  writeFileSync(
    `${thisFolder}/build/${SmartContract.name}.json`,
    JSON.stringify(json)
  );
}
