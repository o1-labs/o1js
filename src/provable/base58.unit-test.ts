import { fromBase58Check, toBase58Check } from './base58.js';
import { Ledger, isReady, shutdown } from '../snarky.js';
import { expect } from 'expect';

await isReady;

let bytes = [250, 200, 150, 100, 50, 0];
let version = 0x01;

let binaryString = String.fromCharCode(...bytes);
let ocamlBytes = { t: 9, c: binaryString, l: bytes.length };
let base58Ocaml = Ledger.encoding.toBase58(ocamlBytes, version);

let base58 = toBase58Check(bytes, version);

expect(base58).toEqual(base58Ocaml);

let recoveredBytes = fromBase58Check(base58, version);

expect(recoveredBytes).toEqual(bytes);

shutdown();
