import { isReady, PrivateKey, shutdown, compile } from 'snarkyjs';
import SimpleZkapp from './simple_zkapp';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

await isReady;

let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let { verificationKey } = await compile(SimpleZkapp, zkappAddress);
storeArtifact(SimpleZkapp, { verificationKey });

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
