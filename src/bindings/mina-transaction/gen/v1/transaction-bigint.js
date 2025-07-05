// @generated this file is auto-generated - don't edit it directly
import { PublicKey, UInt64, UInt32, TokenId, Field, AuthRequired, BalanceChange, Sign, Bool, TransactionVersion, ZkappUri, TokenSymbol, StateHash, Events, Actions, ActionState, MayUseToken, VerificationKeyHash, ReceiptChainHash, } from '../../v1/transaction-leaves-bigint.js';
import { SignableFromLayout } from '../../../lib/from-layout.js';
import * as Json from './transaction-json.js';
import { jsLayout } from './js-layout.js';
export { customTypes, ZkappCommand, AccountUpdate, Account };
export { Json };
export * from '../../v1/transaction-leaves-bigint.js';
export { signableFromLayout, toJSONEssential, empty, TypeMap };
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
let { signableFromLayout, toJSONEssential, empty } = SignableFromLayout(TypeMap, customTypes);
let ZkappCommand = signableFromLayout(jsLayout.ZkappCommand);
let AccountUpdate = signableFromLayout(jsLayout.AccountUpdate);
let Account = signableFromLayout(jsLayout.Account);
