import { isReady, PrivateKey, deploy, shutdown } from 'snarkyjs';
import SimpleSnapp from './simple_snapp';

await isReady;

// TODO: get keys from somewhere else; for now we assume the account is already funded
let snappPrivateKey = PrivateKey.random();
let snappAddress = snappPrivateKey.toPublicKey();

// TODO: find build artifact and extract verification key, which has to be passed to deploy
// in the CLI, deploy could automatically do that if no buid artifact is found

// produce and log the transaction json; the fee payer is a dummy which has to be added later, by the signing logic
let transactionJson = deploy(SimpleSnapp, snappAddress);

console.log(transactionJson);

shutdown();
