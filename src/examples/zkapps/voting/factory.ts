/**
 * Produces a set of three contracts, Voting, Voter Membership and Candidate Membership SCs.
 * Requires a set of preconditions.
 */

import { PublicKey, UInt32, UInt64 } from 'snarkyjs';
import { Membership, Membership_ } from './membership';
import {
  ElectionPreconditions,
  ParticipantPreconditions,
} from './preconditions';
import { Voting, Voting_ } from './voting';

interface VotingAppParams {
  candidatePreconditions: ParticipantPreconditions;
  voterPreconditions: ParticipantPreconditions;
  electionPreconditions: ElectionPreconditions;
}

function defaultParams(): VotingAppParams {
  return {
    candidatePreconditions: ParticipantPreconditions.default,
    voterPreconditions: ParticipantPreconditions.default,
    electionPreconditions: ElectionPreconditions.default,
  };
}

/**
 * This function takes a set of preconditions and produces a set of contracts.
 * @param params {@link VotingAppParams}
 * @returns
 */
export function VotingApp(params: VotingAppParams = defaultParams()): {
  voterContract: typeof Membership_;
  candidateContract: typeof Membership_;
  voting: typeof Voting_;
} {
  let Voter = Membership({
    participantPreconditions: params.voterPreconditions,
  });

  let Candidate = Membership({
    participantPreconditions: params.candidatePreconditions,
  });

  let VotingContract = Voting({
    electionPreconditions: params.electionPreconditions,
    voterPreconditions: params.voterPreconditions,
    candidatePreconditions: params.candidatePreconditions,
    candidateAddress: PublicKey.empty(), // TODO: insert real address
    voterAddress: PublicKey.empty(), // TODO: insert real address
  });

  return {
    voterContract: Voter,
    candidateContract: Candidate,
    voting: VotingContract,
  };
}
