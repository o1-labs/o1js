import { Types } from '../bindings/mina-transaction/types.js';
import { TokenId } from './account_update.js';
import { Int64 } from './int.js';

export { invalidTransactionError, Bug, assert, prettifyStacktrace };

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

  // handle errors for fee payer
  let errorsForFeePayer = errors[0];
  for (let [error] of errorsForFeePayer) {
    let message = ErrorHandlers[error as keyof typeof ErrorHandlers]?.({
      transaction,
      accountUpdateIndex: NaN,
      isFeePayer: true,
      ...additionalContext,
    });
    if (message) errorMessages.push(message);
  }

  // handle errors for each account update
  let n = transaction.accountUpdates.length;
  for (let i = 0; i < n; i++) {
    let errorsForUpdate = errors[i + 1];
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

/**
 * An error that was assumed cannot happen, and communicates to users that it's not their fault but an internal bug.
 */
function Bug(message: string) {
  return Error(
    `${message}\nThis shouldn't have happened and indicates an internal bug.`
  );
}
/**
 * Make an assertion. When failing, this will communicate to users it's not their fault but indicates an internal bug.
 */
function assert(condition: boolean, message = 'Failed assertion.') {
  if (!condition) throw Bug(message);
}

const lineRemovalKeywords = ['snarky_js_node.bc.cjs', '/builtin/'] as const;
function prettifyStacktrace(error: unknown) {
  if (!(error instanceof Error) || !error.stack) return error;

  const stacktrace = error.stack;
  const stacktraceLines = stacktrace.split('\n');
  const newStacktrace: string[] = [];

  for (let i = 0; i < stacktraceLines.length; i++) {
    if (
      lineRemovalKeywords.some((lineToRemove) =>
        stacktraceLines[i].includes(lineToRemove)
      )
    ) {
      continue;
    }
    const trimmedLine = trimPaths(stacktraceLines[i]);
    newStacktrace.push(trimmedLine);
  }

  return newStacktrace.join('\n');
}

function trimPaths(stacktracePath: string) {
  const includesSnarkyJS = stacktracePath.includes('snarkyjs');
  if (includesSnarkyJS) {
    return trimSnarkyJSPath(stacktracePath);
  }

  const includesOpam = stacktracePath.includes('opam');
  if (includesOpam) {
    return trimOpamPath(stacktracePath);
  }
  return stacktracePath;
}

function trimSnarkyJSPath(stacktraceLine: string) {
  // Regex to match the path inside the parentheses (e.g. (/home/../snarkyjs/../*.ts))
  const fullPathRegex = /\(([^)]+)\)/;
  const matchedPaths = stacktraceLine.match(fullPathRegex);
  if (!matchedPaths) {
    return stacktraceLine;
  }

  const fullPath = matchedPaths[1];
  const snarkyJSIndex = fullPath.indexOf('snarkyjs');
  if (snarkyJSIndex === -1) {
    return stacktraceLine;
  }

  // Grab the text before the parentheses as the prefix
  const prefix = stacktraceLine.slice(0, stacktraceLine.indexOf('(') + 1);
  // Grab the text including and after the snarkyjs path
  const updatedPath = fullPath.slice(snarkyJSIndex);
  return `${prefix}${updatedPath})`;
}

function trimOpamPath(stacktraceLine: string) {
  // Regex to match the path inside the parentheses (e.g. (/home/../snarkyjs/../*.ts))
  const fullPathRegex = /\(([^)]+)\)/;
  const matchedPaths = stacktraceLine.match(fullPathRegex);
  if (!matchedPaths) {
    return stacktraceLine;
  }

  const fullPath = matchedPaths[1];
  const opamIndex = fullPath.indexOf('opam');
  if (opamIndex === -1) {
    return stacktraceLine;
  }

  const updatedPathArray = fullPath.slice(opamIndex).split('/');
  const libIndex = updatedPathArray.lastIndexOf('lib');
  if (libIndex === -1) {
    return stacktraceLine;
  }

  // Grab the text before the parentheses as the prefix
  const prefix = stacktraceLine.slice(0, stacktraceLine.indexOf('(') + 1);
  // Grab the text including and after the opam path, removing the lib directory
  const trimmedPath = updatedPathArray.slice(libIndex + 1);
  // Add the ocaml directory to the beginning of the path
  trimmedPath.unshift('ocaml');
  return `${prefix}${trimmedPath.join('/')})`;
}
