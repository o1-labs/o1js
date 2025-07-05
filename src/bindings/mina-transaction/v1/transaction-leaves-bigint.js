import { Field, Bool, UInt32, UInt64, Sign } from '../../../mina-signer/src/field-bigint.js';
import { PublicKey } from '../../../mina-signer/src/curve-bigint.js';
import { derivedLeafTypesSignable } from './derived-leaves.js';
import { createEvents } from '../../../lib/mina/v1/events.js';
import { Poseidon, HashHelpers, packToFields } from '../../../mina-signer/src/poseidon-bigint.js';
import { mocks, protocolVersions } from '../../crypto/constants.js';
import { signable } from '../../../mina-signer/src/derivers-bigint.js';
export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, BalanceChange, TokenId, MayUseToken, };
export { Events, Actions, ZkappUri, TokenSymbol, ActionState, VerificationKeyHash, ReceiptChainHash, StateHash, TransactionVersion, };
const { TokenId, StateHash, TokenSymbol, AuthRequired, ZkappUri, MayUseToken } = derivedLeafTypesSignable({ Field, Bool, HashHelpers, packToFields });
const { Events, Actions } = createEvents({ Field, Poseidon });
const ActionState = {
    ...Field,
    empty: Actions.emptyActionState,
};
const VerificationKeyHash = {
    ...Field,
    empty: () => Field(mocks.dummyVerificationKeyHash),
};
const ReceiptChainHash = {
    ...Field,
    empty: () => HashHelpers.emptyHashWithPrefix('CodaReceiptEmpty'),
};
const TransactionVersion = {
    ...UInt32,
    empty: () => UInt32(protocolVersions.txnVersion),
};
const BalanceChange = signable({ magnitude: UInt64, sgn: Sign });
