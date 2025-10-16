/**
 * Precondition validation for account updates.
 */
import type { AccountUpdate } from '../account-update.js';
import type { Account } from '../account.js';
import { UInt64, UInt32 } from '../../../provable/int.js';
import { Field } from '../../../provable/wrapped.js';

export { checkPreconditions };

/**
 * Check that all preconditions are satisfied for an account update.
 * Throws an error if any precondition fails.
 */
function checkPreconditions(account: Account, update: AccountUpdate): void {
  const preconditions = update.body.preconditions;
  const errors: string[] = [];

  // account
  const accountPrec = preconditions.account;

  // nonce
  if (accountPrec.nonce.isSome.toBoolean()) {
    const nonceLower = accountPrec.nonce.value.lower;
    const nonceUpper = accountPrec.nonce.value.upper;
    const accountNonce = account.nonce;

    const inRange =
      accountNonce.greaterThanOrEqual(nonceLower).and(accountNonce.lessThanOrEqual(nonceUpper));

    if (!inRange.toBoolean()) {
      errors.push('Account_nonce_precondition_unsatisfied');
    }
  }

  // balance
  if (accountPrec.balance.isSome.toBoolean()) {
    const balanceLower = accountPrec.balance.value.lower;
    const balanceUpper = accountPrec.balance.value.upper;
    const accountBalance = account.balance;

    const inRange =
      accountBalance
        .greaterThanOrEqual(balanceLower)
        .and(accountBalance.lessThanOrEqual(balanceUpper));

    if (!inRange.toBoolean()) {
      errors.push('Account_balance_precondition_unsatisfied');
    }
  }

  // receiptChainHash
  if (accountPrec.receiptChainHash.isSome.toBoolean()) {
    const expectedHash = accountPrec.receiptChainHash.value;
    const actualHash = account.receiptChainHash;

    if (!expectedHash.equals(actualHash).toBoolean()) {
      errors.push('Account_receipt_chain_hash_precondition_unsatisfied');
    }
  }

  // delegate
  if (accountPrec.delegate.isSome.toBoolean()) {
    const expectedDelegate = accountPrec.delegate.value;
    const actualDelegate = account.delegate;

    if (actualDelegate === undefined) {
      errors.push('Account_delegate_precondition_unsatisfied');
    } else if (!expectedDelegate.equals(actualDelegate).toBoolean()) {
      errors.push('Account_delegate_precondition_unsatisfied');
    }
  }

  // appState
  for (let i = 0; i < accountPrec.state.length; i++) {
    const statePrec = accountPrec.state[i];
    if (statePrec.isSome.toBoolean()) {
      const expectedValue = statePrec.value;
      const actualValue = account.zkapp?.appState[i] ?? Field(0);

      if (!expectedValue.equals(actualValue).toBoolean()) {
        errors.push(`Account_state_precondition_unsatisfied[${i}]`);
      }
    }
  }

  // actionState
  if (accountPrec.actionState.isSome.toBoolean()) {
    const expectedActionState = accountPrec.actionState.value;
    const actualActionState =
      account.zkapp?.actionState && account.zkapp.actionState.length > 0
        ? account.zkapp.actionState[account.zkapp.actionState.length - 1]
        : Field(0);

    if (!expectedActionState.equals(actualActionState).toBoolean()) {
      errors.push('Account_actionState_precondition_unsatisfied');
    }
  }

  // provedState
  if (accountPrec.provedState.isSome.toBoolean()) {
    const expectedProvedState = accountPrec.provedState.value;
    const actualProvedState = account.zkapp?.provedState ?? false;

    // convert boolean to Bool for comparison
    const actualBool =
      typeof actualProvedState === 'boolean'
        ? actualProvedState
        : actualProvedState.toBoolean();

    if (expectedProvedState.toBoolean() !== actualBool) {
      errors.push('Account_proved_state_precondition_unsatisfied');
    }
  }

  // isNew
  if (accountPrec.isNew.isSome.toBoolean()) {
    // an account is "new" if it doesn't exist or has never been used
    // for now just consider an account new if it has nonce 0 and zero balance
    const isNew = account.nonce.equals(UInt32.zero).and(account.balance.equals(UInt64.zero));

    if (accountPrec.isNew.value.toBoolean() !== isNew.toBoolean()) {
      errors.push('Account_is_new_precondition_unsatisfied');
    }
  }

  // TODO: Network preconditions (network state parameter)
  // TODO: validWhile precondition (current slot parameter)
  
  if (errors.length > 0) {
    throw new Error(JSON.stringify(errors));
  }
}
