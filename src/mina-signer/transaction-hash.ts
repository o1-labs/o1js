import { Bool, Field, UInt32, UInt64 } from '../provable/field-bigint.js';
import { Memo } from './memo.js';
import { Binable, tuple } from '../provable/binable.js';
import { Tag, UserCommand } from './sign-legacy.js';

// binable

let BinablePublicKey = tuple([Field, Bool]);
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
const BinableUserCommand_ = tuple([
  UInt64, // fee
  BinablePublicKey, // feePayer
  UInt32, // nonce
  UInt32, // validUntil
  Memo, // memo
  BinableTag, // tag
  BinablePublicKey, // source
  BinablePublicKey, // receiver
  UInt64, // amount
]);

const UserCommand = {
  toBytes({
    common: { fee, feePayer, memo, nonce, validUntil },
    body: { amount, receiver, source, tag },
  }: UserCommand) {
    return BinableUserCommand_.toBytes([
      fee,
      [feePayer.x, feePayer.isOdd],
      nonce,
      validUntil,
      memo,
      tag,
      [source.x, source.isOdd],
      [receiver.x, receiver.isOdd],
      amount,
    ]);
  },
};
