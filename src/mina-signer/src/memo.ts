import {
  Binable,
  defineBinable,
  stringFromBytes,
  stringLengthInBytes,
  stringToBytes,
  withBits,
} from '../../bindings/lib/binable.js';
import { base58 } from '../../lib/util/base58.js';
import {
  HashInputLegacy,
  hashWithPrefix,
  packToFieldsLegacy,
  prefixes,
} from './poseidon-bigint.js';
import { versionBytes } from '../../bindings/crypto/constants.js';

export { Memo };

function fromString(memo: string) {
  let length = stringLengthInBytes(memo);
  if (length > 32) throw Error('Memo.fromString: string too long');
  return `\x01${String.fromCharCode(length)}${memo}` + '\x00'.repeat(32 - length);
}
function toString(memo: string) {
  let totalLength = stringLengthInBytes(memo);
  if (totalLength !== 34) {
    throw Error(`Memo.toString: length ${totalLength} does not equal 34`);
  }
  if (memo[0] !== '\x01') {
    throw Error('Memo.toString: expected memo to start with 0x01 byte');
  }
  let length = memo.charCodeAt(1);
  if (length > 32) throw Error('Memo.toString: invalid length encoding');
  let bytes = stringToBytes(memo).slice(2, 2 + length);
  return stringFromBytes(bytes);
}

function hash(memo: string) {
  let bits = Memo.toBits(memo);
  let fields = packToFieldsLegacy(HashInputLegacy.bits(bits));
  return hashWithPrefix(prefixes.zkappMemo, fields);
}

const SIZE = 34;
const Binable: Binable<string> = defineBinable({
  toBytes(memo) {
    return stringToBytes(memo);
  },
  readBytes(bytes, start) {
    let end = start + SIZE;
    let memo = stringFromBytes(bytes.slice(start, end));
    return [memo, end];
  },
});

const Memo = {
  fromString,
  toString,
  hash,
  ...withBits(Binable, SIZE * 8),
  ...base58(Binable, versionBytes.userCommandMemo),
  sizeInBytes: SIZE,
  empty() {
    return Memo.fromString('');
  },
  toValidString(memo = '') {
    if (stringLengthInBytes(memo) > 32) throw Error('Memo: string too long');
    return memo;
  },
};
