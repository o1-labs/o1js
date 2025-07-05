import { TokenId } from './core.js';
import StackTrace from 'stacktrace-js';
export function getCallerFrame() {
    const frames = StackTrace.getSync();
    if (frames.length < 3)
        throw new Error('cannot call getCallerFrame when the stack has less than 2 frames');
    return frames[2];
}
export class ZkappCommandErrorTrace {
    constructor(generalErrors, feePaymentErrors, accountUpdateForestTrace) {
        this.generalErrors = generalErrors;
        this.feePaymentErrors = feePaymentErrors;
        this.accountUpdateForestTrace = accountUpdateForestTrace;
    }
    hasErrors() {
        function accountUpdateForestHasErrors(forestTrace) {
            for (const trace of forestTrace)
                if (trace.errors.length > 0 || accountUpdateForestHasErrors(trace.childTraces))
                    return true;
            return false;
        }
        return (this.feePaymentErrors.length > 0 ||
            accountUpdateForestHasErrors(this.accountUpdateForestTrace));
    }
    generateReport() {
        const makeIndent = (depth) => ' '.repeat(2 * depth);
        const renderAccountId = (accountId) => {
            const isMinaAccount = accountId.tokenId.equals(TokenId.MINA).toBoolean();
            const pubkeyString = accountId.publicKey.toBase58();
            return isMinaAccount ? pubkeyString : `${pubkeyString}[token ${accountId.tokenId}]`;
        };
        const renderCallSite = (callSite) => `${callSite.getFileName()}:${callSite.getLineNumber()}`;
        let out = '';
        function writeErrors(depth, errors) {
            if (errors.length === 0) {
                out += 'ok\n';
            }
            else {
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
        function writeAccountUpdateTrace(depth, trace) {
            const indent = makeIndent(depth);
            out += `${indent}${renderAccountId(trace.accountId)} (${renderCallSite(trace.callSite)}): `;
            writeErrors(depth, trace.errors);
            trace.childTraces.forEach((accountUpdateTrace) => writeAccountUpdateTrace(depth + 1, accountUpdateTrace));
        }
        out += 'ZKAPP COMMAND ERROR TRACE\n';
        out += '=========================\n';
        writeErrors(0, this.generalErrors);
        out += '  feePayment: ';
        writeErrors(1, this.feePaymentErrors);
        out += '  accountUpdates:\n';
        this.accountUpdateForestTrace.forEach((accountUpdateTrace) => writeAccountUpdateTrace(2, accountUpdateTrace));
        out += '=========================\n';
        return out;
    }
}
//  interface TransactionErrors {
//   warnings: Error[];
//   errors: Error[];
// }
