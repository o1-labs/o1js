import { Field, Ledger, Types } from '../snarky';
import { Body, LazyControl, Party } from './party';

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
    body: party.body,
    authorization: toControl(party.authorization),
  };
}

function toControl<T extends LazyControl>(authorization: T): Control_ {
  if (authorization.kind === 'signature')
    return { signature: authorization.value };
  if (authorization.kind === 'proof') return { proof: authorization.value };
  return {};
}
