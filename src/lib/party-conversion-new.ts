import { Field, Ledger, Types } from '../snarky';
import {
  AccountPrecondition,
  Body,
  LazyControl,
  Party,
  Precondition,
} from './party';
import { UInt32 } from './int';

export { toParties, toParty };

type Party_ = Types.Parties['otherParties'][number];
type FeePayer = Types.Parties['feePayer'];
type Control_ = Party_['authorization'];

function toParties({
  feePayer,
  otherParties,
}: {
  feePayer: FeePayer;
  otherParties: Party[];
}): Types.Parties {
  return {
    feePayer,
    otherParties: otherParties.map(toParty),
    // TODO expose to Mina.transaction
    memo: Ledger.memoToBase58(''),
  };
}

function toParty(party: Party): Party_ {
  return {
    body: toPartyBody(party.body),
    authorization: toControl(party.authorization),
  };
}

function toControl<T extends LazyControl>(authorization: T): Control_ {
  if (authorization.kind === 'signature')
    return { signature: authorization.value };
  if (authorization.kind === 'proof') return { proof: authorization.value };
  return {};
}

function toPartyBody(body: Body): Party_['body'] {
  return {
    ...body,
    // TODO
    balanceChange: { magnitude: body.delta, sgn: Field.one },
    callDepth: parseInt(body.depth.toString(), 10),
    accountPrecondition: toAccountPrecondition(body.accountPrecondition),
  };
}

function toAccountPrecondition(
  accountPrecondition: Precondition
): Party_['body']['accountPrecondition'] {
  let full: AccountPrecondition; // TODO make type names better
  if (accountPrecondition === undefined) {
    full = AccountPrecondition.ignoreAll();
  } else if (accountPrecondition instanceof UInt32) {
    full = AccountPrecondition.nonce(accountPrecondition);
  } else {
    full = accountPrecondition;
  }
  return full;
}
