#!/usr/bin/env node
import Client from './dist/node/mina-signer/MinaSigner.js';

let client = new Client({ network: 'testnet' });

console.log(client.genKeys());
