import { isReady, PrivateKey, shutdown, Mina } from 'o1js';
import SimpleZkapp from './simple_zkapp.js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

await isReady;

// TODO: get keys from somewhere else; for now we assume the account is already funded
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

// read verification key from disk
let artifact = readArtifact(SimpleZkapp);
if (artifact === undefined)
  throw Error('No verification key found! Use compile.ts first');
let { verificationKey } = artifact;

// produce and log the transaction json; the fee payer is a dummy which has to be added later, by the signing logic
let tx = await Mina.transaction(() => {
  new SimpleZkapp(zkappAddress).deploy({ verificationKey });
});
let transactionJson = tx.sign([zkappKey]).toJSON();

console.log(transactionJson);

shutdown();

function readArtifact(SmartContract: Function) {
  let thisFolder = dirname(fileURLToPath(import.meta.url));
  let jsonFile = `${thisFolder}/build/${SmartContract.name}.json`;
  if (!existsSync(`${thisFolder}/build`) || !existsSync(jsonFile)) {
    return undefined;
  }
  return JSON.parse(readFileSync(jsonFile, 'utf-8'));
}
