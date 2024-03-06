import { SignatureJson } from './signature.js';
import type {
  Payment,
  StakeDelegation,
  ZkappCommand,
  Signed,
  SignedAny,
  SignedLegacy,
  SignableData,
} from './types.js';

function hasCommonProperties(data: SignableData | ZkappCommand) {
  return (
    data.hasOwnProperty('to') &&
    data.hasOwnProperty('from') &&
    data.hasOwnProperty('fee') &&
    data.hasOwnProperty('nonce')
  );
}

export function isZkappCommand(
  p: SignableData | ZkappCommand
): p is ZkappCommand {
  return p.hasOwnProperty('zkappCommand') && p.hasOwnProperty('feePayer');
}

export function isPayment(p: SignableData | ZkappCommand): p is Payment {
  return hasCommonProperties(p) && p.hasOwnProperty('amount');
}

export function isStakeDelegation(
  p: SignableData | ZkappCommand
): p is StakeDelegation {
  return hasCommonProperties(p) && !p.hasOwnProperty('amount');
}

function isLegacySignature(s: string | SignatureJson): s is SignatureJson {
  return typeof s === 'object' && 'field' in s && 'scalar' in s;
}

export function isSignedZkappCommand(p: SignedAny): p is Signed<ZkappCommand> {
  return (
    p.data.hasOwnProperty('zkappCommand') &&
    p.data.hasOwnProperty('feePayer') &&
    typeof p.signature === 'string'
  );
}

export function isSignedPayment(p: SignedAny): p is SignedLegacy<Payment> {
  return (
    hasCommonProperties(p.data) &&
    isLegacySignature(p.signature) &&
    p.data.hasOwnProperty('amount')
  );
}

export function isSignedDelegation(
  p: SignedAny
): p is SignedLegacy<StakeDelegation> {
  return (
    hasCommonProperties(p.data) &&
    isLegacySignature(p.signature) &&
    !p.data.hasOwnProperty('amount')
  );
}

export function isSignedString(p: SignedAny): p is SignedLegacy<string> {
  return typeof p.data === 'string' && isLegacySignature(p.signature);
}
