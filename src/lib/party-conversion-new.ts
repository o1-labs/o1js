import { Field, Ledger } from '../snarky';
import { Parties as Parties_ } from '../snarky/parties';
import {
  AccountPrecondition,
  Body,
  FeePayer,
  LazyControl,
  Party,
  Precondition,
} from './party';
import { UInt32 } from './int';

export { toParties, toParty };

type Party_ = Parties_['otherParties'][number];
type FeePayerParty_ = Parties_['feePayer'];
type Control_ = Party_['authorization'];

function toParties({
  feePayer,
  otherParties,
}: {
  feePayer: FeePayer;
  otherParties: Party[];
}): Parties_ {
  return {
    feePayer: toFeePayer(feePayer),
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

function toFeePayer(party: FeePayer): FeePayerParty_ {
  return {
    body: toFeePayerPartyBody(party.body),
    authorization: toFeePayerControl(party.authorization),
  };
}

function toControl<T extends LazyControl>(authorization: T): Control_ {
  if (authorization.kind === 'signature')
    return { signature: authorization.value };
  if (authorization.kind === 'proof') return { proof: authorization.value };
  return {};
}
function toFeePayerControl<T extends LazyControl>(
  authorization: T
): Exclude<Control_['signature'], undefined> {
  if (authorization.kind !== 'signature') {
    // TODO: probably shouldn't hard-code dummy signature
    return '7mWxjLYgbJUkZNcGouvhVj5tJ8yu9hoexb9ntvPK8t5LHqzmrL6QJjjKtf5SgmxB4QWkDw7qoMMbbNGtHVpsbJHPyTy2EzRQ';
  }
  return authorization.value;
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

function toFeePayerPartyBody(
  body: Body & { accountPrecondition: UInt32 }
): FeePayerParty_['body'] {
  return {
    ...body,
    // TODO
    fee: new UInt32(body.delta.value.neg()),
    nonce: body.accountPrecondition,
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
