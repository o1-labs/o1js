import { Bool, Field, UInt32, UInt64 } from '../provable/field-bigint.js';
import { Memo } from './memo.js';
import { Binable, record } from '../provable/binable.js';
import { Tag, UserCommand } from './sign-legacy.js';

// binable

let BinablePublicKey = record({ x: Field, isOdd: Bool }, ['x', 'isOdd']);
let BinableTag: Binable<Tag> = {
  sizeInBytes() {
    return 1;
  },
  toBytes(tag) {
    return [{ Payment: 0, StakeDelegation: 1 }[tag]];
  },
  fromBytes([byte]) {
    return (['Payment', 'StakeDelegation'] as Tag[])[byte];
  },
};

const Common = record<UserCommand['common']>(
  {
    fee: UInt64,
    feePayer: BinablePublicKey,
    nonce: UInt32,
    validUntil: UInt32,
    memo: Memo,
  },
  ['fee', 'feePayer', 'nonce', 'validUntil', 'memo']
);
const Body = record<UserCommand['body']>(
  {
    tag: BinableTag,
    source: BinablePublicKey,
    receiver: BinablePublicKey,
    amount: UInt64,
  },
  ['tag', 'source', 'receiver', 'amount']
);
const UserCommand = record<UserCommand>(
  {
    common: Common,
    body: Body,
  },
  ['common', 'body']
);
