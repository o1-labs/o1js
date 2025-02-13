import { Types } from '../../../bindings/mina-transaction/types.js';
import { Bool, Field } from '../../provable/wrapped.js';
import { Permissions } from './account-update.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { TokenId, ReceiptChainHash } from './base58-encodings.js';
import { genericLayoutFold } from '../../../bindings/lib/from-layout.js';
import { customTypes, TypeMap } from '../../../bindings/mina-transaction/gen/transaction.js';
import { jsLayout } from '../../../bindings/mina-transaction/gen/js-layout.js';
import { ProvableExtended } from '../../provable/types/struct.js';
import { FetchedAccount } from './graphql.js';

export { Account, PartialAccount };
export { newAccount, parseFetchedAccount, fillPartialAccount };

type Account = Types.Account;
const Account = Types.Account;

function newAccount(accountId: { publicKey: PublicKey; tokenId?: Field }): Account {
  let account = Account.empty();
  account.publicKey = accountId.publicKey;
  account.tokenId = accountId.tokenId ?? Types.TokenId.empty();
  account.permissions = Permissions.initial();
  return account;
}

type PartialAccount = Omit<Partial<Account>, 'zkapp'> & {
  zkapp?: Partial<Account['zkapp']>;
};

// convert FetchedAccount (from graphql) to Account (internal representation both here and in Mina)
function parseFetchedAccount(account: FetchedAccount): Account {
  const {
    publicKey,
    nonce,
    zkappState,
    balance,
    permissions,
    timing: { cliffAmount, cliffTime, initialMinimumBalance, vestingIncrement, vestingPeriod },
    delegateAccount,
    receiptChainHash,
    actionState,
    token,
    tokenSymbol,
    verificationKey,
    provedState,
    zkappUri,
  } = account;

  let hasZkapp =
    zkappState !== null ||
    verificationKey !== null ||
    actionState !== null ||
    zkappUri !== null ||
    provedState;
  let partialAccount: PartialAccount = {
    publicKey: PublicKey.fromBase58(publicKey),
    tokenId: TokenId.fromBase58(token),
    tokenSymbol: tokenSymbol ?? undefined,
    balance: balance && UInt64.from(balance.total),
    nonce: UInt32.from(nonce),
    receiptChainHash:
      (receiptChainHash && ReceiptChainHash.fromBase58(receiptChainHash)) || undefined,
    delegate: (delegateAccount && PublicKey.fromBase58(delegateAccount.publicKey)) ?? undefined,
    votingFor: undefined, // TODO
    timing:
      (cliffAmount &&
        cliffTime &&
        initialMinimumBalance &&
        vestingIncrement &&
        vestingPeriod && {
          isTimed: Bool(true),
          cliffAmount: UInt64.from(cliffAmount),
          cliffTime: UInt32.from(cliffTime),
          initialMinimumBalance: UInt64.from(initialMinimumBalance),
          vestingIncrement: UInt64.from(vestingIncrement),
          vestingPeriod: UInt32.from(vestingPeriod),
        }) ||
      undefined,
    permissions: (permissions && Permissions.fromJSON(permissions)) ?? Permissions.initial(),
    zkapp: hasZkapp
      ? {
          appState: (zkappState && zkappState.map(Field)) ?? undefined,
          verificationKey:
            (verificationKey && {
              data: verificationKey.verificationKey,
              hash: Field(verificationKey.hash),
            }) ??
            undefined,
          zkappVersion: undefined, // TODO
          actionState: (actionState && actionState.map(Field)) ?? undefined,
          lastActionSlot: undefined, // TODO
          provedState: provedState !== null ? Bool(provedState) : undefined,
          zkappUri: zkappUri !== null ? zkappUri : undefined,
        }
      : undefined,
  };
  return fillPartialAccount(partialAccount);
}

function fillPartialAccount(account: PartialAccount): Account {
  return genericLayoutFold<ProvableExtended<any>>(
    TypeMap,
    customTypes,
    {
      map(type, value) {
        // if value exists, use it; otherwise fall back to dummy value
        if (value !== undefined) return value;
        return type.empty();
      },
      reduceArray(array) {
        return array;
      },
      reduceObject(_, record) {
        return record;
      },
      reduceFlaggedOption() {
        // doesn't occur for accounts
        throw Error('not relevant');
      },
      reduceOrUndefined(value) {
        // don't fill in value that's allowed to be undefined
        return value;
      },
    },
    jsLayout.Account as any,
    account as unknown
  );
}
