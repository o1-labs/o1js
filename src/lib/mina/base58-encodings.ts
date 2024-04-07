import { fieldEncodings } from '../util/base58.js';
import { Field } from '../provable/wrapped.js';

export { TokenId, ReceiptChainHash, LedgerHash, EpochSeed, StateHash };

const { TokenId, ReceiptChainHash, EpochSeed, LedgerHash, StateHash } =
  fieldEncodings(Field);
