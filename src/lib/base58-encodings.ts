import { fieldEncodings } from './base58.js';
import { Field } from '../snarky.js';

export { TokenId, ReceiptChainHash, LedgerHash, EpochSeed, StateHash };

const { TokenId, ReceiptChainHash, EpochSeed, LedgerHash, StateHash } =
  fieldEncodings(Field);
