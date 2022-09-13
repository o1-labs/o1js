import { Types } from '../snarky/types.js';
import { TokenId } from './account_update.js';
import { Int64 } from './int.js';

export { invalidTransactionError };

function invalidTransactionError(
  transaction: Types.ZkappCommand,
  errors: string[][][],
  { accountCreationFee }: { accountCreationFee: string | number }
) {
  let lastUpdate = errors[errors.length - 1];

  if (lastUpdate.some(([msg]) => msg === 'Invalid_fee_excess')) {
    let balances = transaction.accountUpdates.map(({ body }) => {
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
    )} MINA account creation fee, and make sure that the sum equals ${(
      -Number(accountCreationFee) * 1e-9
    ).toFixed(2)}
times the number of newly created accounts.

Raw list of errors: ${JSON.stringify(errors)}`;
  }

  // fallback if we don't have a good error message yet
  return JSON.stringify(errors);
}
