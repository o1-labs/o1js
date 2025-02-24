import { AccountId } from './account.js';
import { TokenId } from './core.js';
import StackTrace from 'stacktrace-js';

// TODO: We currently accumulate full errors with stack traces pointing to the internal code that
//       performs the checks. This is nice for debugging, but undesirable for performance reasons,
//       and we won't want to show this information to developers using the API, only to ones
//       working on it. We should improve this in the future.

import StackFrame = StackTrace.StackFrame;

export function getCallerFrame(): StackFrame {
  const frames = StackTrace.getSync();
  if (frames.length < 3)
    throw new Error('cannot call getCallerFrame when the stack has less than 2 frames');
  return frames[2];
}

export class ZkappCommandErrorTrace {
  constructor(
    public generalErrors: Error[],
    public feePaymentErrors: Error[],
    public accountUpdateForestTrace: AccountUpdateErrorTrace[]
  ) {}

  hasErrors(): boolean {
    function accountUpdateForestHasErrors(forestTrace: AccountUpdateErrorTrace[]): boolean {
      for (const trace of forestTrace)
        if (trace.errors.length > 0 || accountUpdateForestHasErrors(trace.childTraces)) return true;
      return false;
    }

    return (
      this.feePaymentErrors.length > 0 ||
      accountUpdateForestHasErrors(this.accountUpdateForestTrace)
    );
  }

  generateReport(): string {
    const makeIndent = (depth: number) => ' '.repeat(2 * depth);
    const renderAccountId = (accountId: AccountId) => {
      const isMinaAccount = accountId.tokenId.equals(TokenId.MINA).toBoolean();
      const pubkeyString = accountId.publicKey.toBase58();
      return isMinaAccount ? pubkeyString : `${pubkeyString}[token ${accountId.tokenId}]`;
    };
    const renderCallSite = (callSite: StackFrame) =>
      `${callSite.getFileName()}:${callSite.getLineNumber()}`;

    let out = '';

    function writeErrors(depth: number, errors: Error[]): void {
      if (errors.length === 0) {
        out += 'ok\n';
      } else {
        const indent = makeIndent(depth + 1);

        // out += 'error';
        // if(callSite !== null) out += ` (${callSite})`;
        // out += '\n';
        out += 'error\n';

        errors.forEach((error) => {
          out += `${indent}* ${error.message}\n`;
        });
      }
    }

    function writeAccountUpdateTrace(depth: number, trace: AccountUpdateErrorTrace): void {
      const indent = makeIndent(depth);
      out += `${indent}${renderAccountId(trace.accountId)} (${renderCallSite(trace.callSite)}): `;
      writeErrors(depth, trace.errors);
      trace.childTraces.forEach((accountUpdateTrace) =>
        writeAccountUpdateTrace(depth + 1, accountUpdateTrace)
      );
    }

    out += 'ZKAPP COMMAND ERROR TRACE\n';
    out += '=========================\n';
    writeErrors(0, this.generalErrors);
    out += '  feePayment: ';
    writeErrors(1, this.feePaymentErrors);
    out += '  accountUpdates:\n';
    this.accountUpdateForestTrace.forEach((accountUpdateTrace) =>
      writeAccountUpdateTrace(2, accountUpdateTrace)
    );
    out += '=========================\n';

    return out;
  }
}

export interface AccountUpdateErrorTrace {
  accountId: AccountId;
  callSite: StackFrame;
  // TODO: methodSite: StackFrame | null;
  errors: Error[];
  childTraces: AccountUpdateErrorTrace[];
}

//  interface TransactionErrors {
//   warnings: Error[];
//   errors: Error[];
// }
