import { fromBase58Check, toBase58Check } from './base58.js';
import { Ledger, isReady, shutdown } from '../snarky.js';
import { expect } from 'expect';

await isReady;

function check(bytes: number[], version: number) {
  let binaryString = String.fromCharCode(...bytes);
  let ocamlBytes = { t: 9, c: binaryString, l: bytes.length };
  let base58Ocaml = Ledger.encoding.toBase58(ocamlBytes, version);

  // check consistency with OCaml result
  let base58 = toBase58Check(bytes, version);
  expect(base58).toEqual(base58Ocaml);

  // check roundtrip
  let recoveredBytes = fromBase58Check(base58, version);
  expect(recoveredBytes).toEqual(bytes);
}

check([0, 1, 2, 3, 4, 5], 10);
check([250, 200, 150, 100, 50, 0], 1);
check([0, 0], 0);
check([1], 100);
check([], 0x01);

let goodExample = 'AhgX24Hr3v';
expect(toBase58Check([0, 1, 2], 1)).toEqual(goodExample);

// negative tests

// throws on invalid character
expect(() => fromBase58Check('@hgX24Hr3v', 1)).toThrow('invalid character');

// throws on invalid checksum
expect(() => fromBase58Check('AhgX24Hr3u', 1)).toThrow('invalid checksum');

// throws on invalid version byte
expect(() => fromBase58Check('AhgX24Hr3v', 2)).toThrow(
  '2 does not match encoded version byte 1'
);

shutdown();
