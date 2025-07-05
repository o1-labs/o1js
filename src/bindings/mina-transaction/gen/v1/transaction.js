// @generated this file is auto-generated - don't edit it directly
import { PublicKey, UInt64, UInt32, TokenId, Field, AuthRequired, BalanceChange, Sign, Bool, TransactionVersion, ZkappUri, TokenSymbol, StateHash, Events, Actions, ActionState, MayUseToken, VerificationKeyHash, ReceiptChainHash, } from '../../v1/transaction-leaves.js';
import { ProvableFromLayout } from '../../../lib/from-layout.js';
import * as Json from './transaction-json.js';
import { jsLayout } from './js-layout.js';
export { customTypes, ZkappCommand, AccountUpdate, Account };
export { Json };
export * from '../../v1/transaction-leaves.js';
export { provableFromLayout, toJSONEssential, empty, TypeMap };
const TypeMap = {
    PublicKey,
    UInt64,
    UInt32,
    TokenId,
    Field,
    AuthRequired,
    BalanceChange,
    Sign,
    Bool,
};
let customTypes = {
    TransactionVersion,
    ZkappUri,
    TokenSymbol,
    StateHash,
    BalanceChange,
    Events,
    Actions,
    ActionState,
    MayUseToken,
    VerificationKeyHash,
    ReceiptChainHash,
};
let { provableFromLayout, toJSONEssential, empty } = ProvableFromLayout(TypeMap, customTypes);
let ZkappCommand = provableFromLayout(jsLayout.ZkappCommand);
let AccountUpdate = provableFromLayout(jsLayout.AccountUpdate);
let Account = provableFromLayout(jsLayout.Account);
