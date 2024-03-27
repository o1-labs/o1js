import { Types } from '../../bindings/mina-transaction/types.js';
import { TokenId } from './account-update.js';
import { Int64 } from '../provable/int.js';

export { invalidTransactionError };

const ErrorHandlers = {
  Invalid_fee_excess({
    transaction: { accountUpdates },
    isFeePayer,
    accountCreationFee,
  }: ErrorHandlerArgs) {
    // TODO: handle fee payer for Invalid_fee_excess?
    if (isFeePayer) return;

    let balances = accountUpdates.map(({ body }) => {
      if (body.tokenId.equals(TokenId.default).toBoolean()) {
        return Number(Int64.fromObject(body.balanceChange).toString()) * 1e-9;
      }
    });
    let sum = balances.reduce((a = 0, b = 0) => a + b) ?? 0;
    return `Invalid fee excess.
This means that balance changes in your transaction do not sum up to the amount of fees needed.
Here's the list of balance changes:

${balances
  .map((balance, i) => {
    return `Account update #${i + 1}) ${
      balance === undefined
        ? 'not a MINA account'
        : `${balance.toFixed(2)} MINA`
    }`;
  })
  .join(`\n`)}

Total change: ${sum.toFixed(2)} MINA

If there are no new accounts created in your transaction, then this sum should be equal to 0.00 MINA.
If you are creating new accounts -- by updating accounts that didn't exist yet --
then keep in mind the ${(Number(accountCreationFee) * 1e-9).toFixed(
      2
    )} MINA account creation fee, and make sure that the sum equals
${(-Number(accountCreationFee) * 1e-9).toFixed(
  2
)} times the number of newly created accounts.`;
  },
};

type ErrorHandlerArgs = {
  transaction: Types.ZkappCommand;
  accountUpdateIndex: number;
  isFeePayer: boolean;
  accountCreationFee: string | number;
};

function invalidTransactionError(
  transaction: Types.ZkappCommand,
  errors: string[][][],
  additionalContext: { accountCreationFee: string | number }
): string {
  let errorMessages = [];
  let rawErrors = JSON.stringify(errors);
  let n = transaction.accountUpdates.length;

  // Check if the number of errors match the number of account updates. If there are more, then the fee payer has an error.
  // We do this check because the fee payer error is not included in network transaction errors and is always present (even if empty) in the local transaction errors.
  if (errors.length > n) {
    let errorsForFeePayer = errors.shift() ?? [];
    for (let [error] of errorsForFeePayer) {
      let message = ErrorHandlers[error as keyof typeof ErrorHandlers]?.({
        transaction,
        accountUpdateIndex: NaN,
        isFeePayer: true,
        ...additionalContext,
      });
      if (message) errorMessages.push(message);
    }
  }

  for (let i = 0; i < errors.length; i++) {
    let errorsForUpdate = errors[i];
    for (let [error] of errorsForUpdate) {
      let message = ErrorHandlers[error as keyof typeof ErrorHandlers]?.({
        transaction,
        accountUpdateIndex: i,
        isFeePayer: false,
        ...additionalContext,
      });
      if (message) errorMessages.push(message);
    }
  }

  if (errorMessages.length > 1) {
    return [
      'There were multiple errors when applying your transaction:',
      ...errorMessages.map((msg, i) => `${i + 1}.) ${msg}`),
      `Raw list of errors: ${rawErrors}`,
    ].join('\n\n');
  }
  if (errorMessages.length === 1) {
    return `${errorMessages[0]}\n\nRaw list of errors: ${rawErrors}`;
  }
  // fallback if we don't have a good error message yet
  return rawErrors;
}
