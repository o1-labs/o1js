#!/usr/bin/env node
import Client from './dist/node/mina-signer/mina-signer.js';

let client = new Client({ network: 'devnet' });

console.log(client.genKeys());
