import {
  Binable,
  defineBinable,
  stringToBytes,
  withBits,
} from '../../provable/binable.js';
import { base58 } from '../../provable/base58.js';
import {
  HashInputLegacy,
  hashWithPrefix,
  packToFieldsLegacy,
  prefixes,
} from '../../provable/poseidon-bigint.js';
import { versionBytes } from '../../js_crypto/constants.js';

export { Memo };

function fromString(memo: string) {
  if (memo.length > 32) throw Error('Memo.fromString: string too long');
  return (
    `\x01${String.fromCharCode(memo.length)}${memo}` +
    '\x00'.repeat(32 - memo.length)
  );
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
    let memo = String.fromCharCode(...bytes.slice(start, end));
    return [memo, end];
  },
});

const Memo = {
  fromString,
  hash,
  ...withBits(Binable, SIZE * 8),
  ...base58(Binable, versionBytes.userCommandMemo),
  sizeInBytes() {
    return SIZE;
  },
  emptyValue() {
    return Memo.fromString('');
  },
};
