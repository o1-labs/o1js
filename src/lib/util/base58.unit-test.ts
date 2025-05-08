import { fromBase58Check, toBase58Check } from './base58.js';
import { Test } from '../../snarky.js';
import { expect } from 'expect';
import { test, Random, withHardCoded } from '../testing/property.js';

let mlTest = await Test();

let bytes = withHardCoded(
  Random.bytes(Random.nat(100)),
  [0, 0, 0, 0] // definitely test some zero bytes
);
let version = Random.nat(100);

test(bytes, version, (bytes, version, assert) => {
  let binaryString = String.fromCharCode(...bytes);
  let ocamlBytes = { t: 9, c: binaryString, l: bytes.length };
  let base58Ocaml = mlTest.encoding.toBase58(ocamlBytes, version);

  // check consistency with OCaml result
  let base58 = toBase58Check(bytes, version);
  assert(base58 === base58Ocaml, 'base58 agrees with ocaml');

  // check roundtrip
  let recoveredBytes = fromBase58Check(base58, version);
  expect(recoveredBytes).toEqual(bytes);
});

let goodExample = 'AhgX24Hr3v';
expect(toBase58Check([0, 1, 2], 1)).toEqual(goodExample);

// negative tests

// throws on invalid character
expect(() => fromBase58Check('@hgX24Hr3v', 1)).toThrow('invalid character');

// throws on invalid checksum
expect(() => fromBase58Check('AhgX24Hr3u', 1)).toThrow('invalid checksum');

// throws on invalid version byte
expect(() => fromBase58Check('AhgX24Hr3v', 2)).toThrow('2 does not match encoded version byte 1');
