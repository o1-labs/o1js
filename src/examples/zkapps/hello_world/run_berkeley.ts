// live Berkeley integration test

import { chownSync } from 'fs';
import {
  Field,
  state,
  State,
  method,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  isReady,
  shutdown,
  DeployArgs,
  fetchAccount,
} from 'snarkyjs';
import { adminPrivateKey, HelloWorld } from './hello_world.js';
import http from 'https';
await isReady;

let Berkeley = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
Mina.setActiveInstance(Berkeley);

// address: B62qrLkAoevmde1ZonRLCtkU6BoX3fKwGXkT9BC2wSg8TMBpVdomQwZ
// priv EKEr6V6V5VuyxUvkS8Ugye58ePQq6e8mKKXRvAMSrZKAY7vch8Kd

async function faucet(feePayerAddress: string) {
  let response = await fetch('https://faucet.minaprotocol.com/api/v1/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({
      network: 'berkeley-qanet',
      address: 'B62qo2MyJCSEYDhpfdB2voKeNQ2ZT8DJLnpECjerf5oxXXTZxxzkyCU',
    }),
  });
}

console.log(PrivateKey.random().toPublicKey().toBase58());
let feePayerKey = PrivateKey.fromBase58(
  'EKEr6V6V5VuyxUvkS8Ugye58ePQq6e8mKKXRvAMSrZKAY7vch8Kd'
);

let response = await fetchAccount({ publicKey: feePayerKey.toPublicKey() });
if (response.error) throw Error(response.error.statusText);
let { nonce, balance } = response.account;
console.log(`Using fee payer account with nonce ${nonce}, balance ${balance}`);

let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let transactionFee = 100_000_000;

console.log('Compiling smart contract...');
let { verificationKey } = await HelloWorld.compile();

let zkapp = new HelloWorld(zkappAddress);
let x = await zkapp.x.fetch();
let isDeployed = x?.equals(0).not().toBoolean() ?? false;

if (!isDeployed) {
  console.log(`Deploying zkapp for public key ${zkappAddress.toBase58()}.`);

  let transaction = await Mina.transaction(
    { feePayerKey, fee: transactionFee },
    () => {
      AccountUpdate.fundNewAccount(feePayerKey);
      zkapp.deploy({ zkappKey, verificationKey });
    }
  );

  console.log('Sending the transaction...');
  await (await transaction.send()).wait();
}

await fetchAccount({ publicKey: feePayerKey.toPublicKey() });
await fetchAccount({ publicKey: zkappAddress });

console.log('Trying to update deployed zkApp..');

let transaction = await Mina.transaction(
  { feePayerKey, fee: transactionFee },
  () => {
    zkapp.update(Field(4), adminPrivateKey);
  }
);
await transaction.prove();
console.log('Sending the transaction...');
await (await transaction.send()).wait();

console.log('Checking if the update was valid..');

(await zkapp.x.fetch())?.assertEquals(Field(4));

console.log('success!');
