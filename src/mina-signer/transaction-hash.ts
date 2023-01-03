import { Bool, Field, UInt32, UInt64 } from '../provable/field-bigint.js';
import { Memo } from './memo.js';
import { enumWithArgument, record } from '../provable/binable.js';
import {
  Delegation,
  Payment,
  UserCommand,
  UserCommandEnum,
} from './sign-legacy.js';

// binable

let BinablePublicKey = record({ x: Field, isOdd: Bool }, ['x', 'isOdd']);

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
const Payment = record<Payment>(
  {
    source: BinablePublicKey,
    receiver: BinablePublicKey,
    amount: UInt64,
  },
  ['source', 'receiver', 'amount']
);
const Delegation = record<Delegation>(
  {
    delegator: BinablePublicKey,
    newDelegate: BinablePublicKey,
  },
  ['delegator', 'newDelegate']
);
const Body = enumWithArgument<
  [
    { type: 'Payment'; value: Payment },
    { type: 'StakeDelegation'; value: Delegation }
  ]
>([
  { type: 'Payment', value: Payment },
  { type: 'StakeDelegation', value: Delegation },
]);

const UserCommand = record<UserCommandEnum>(
  {
    common: Common,
    body: Body,
  },
  ['common', 'body']
);
