import { stringToDigits, toBase58Check } from './base58.js';
import { Ledger, isReady, shutdown } from '../snarky.js';

await isReady;

let bytes = [0, 0, 0, 0];
let version = 0x01;

let binaryString = String.fromCharCode(...bytes);
let ocamlBytes = { t: 9, c: binaryString, l: bytes.length };
let base58 = Ledger.encoding.toBase58(ocamlBytes, version);
console.log('digits ocaml', stringToDigits(base58));

let base582 = toBase58Check(bytes, version);

console.log(base58);
console.log(base582);

shutdown();
