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
  voterAddress: PublicKey;
  candidateAddress: PublicKey;
  votingAddress: PublicKey;
}

function defaultParams(): VotingAppParams {
  return {
    candidatePreconditions: ParticipantPreconditions.default,
    voterPreconditions: ParticipantPreconditions.default,
    electionPreconditions: ElectionPreconditions.default,
    candidateAddress: PublicKey.empty(),
    voterAddress: PublicKey.empty(),
    votingAddress: PublicKey.empty(),
  };
}

/**
 * ! This is the only workaround that I found works with how our contracts compiled
 * ! Maybe we can figure out a more elegant factory pattern for our integration tests
 * This function takes a set of preconditions and produces a set of contract instances.
 * @param params {@link VotingAppParams}
 * @returns
 */
export async function VotingApp(
  params: VotingAppParams = defaultParams()
): Promise<{
  voterContract: Membership_;
  candidateContract: Membership_;
  voting: Voting_;
}> {
  let Voter = await Membership({
    participantPreconditions: params.voterPreconditions,
    contractAddress: params.voterAddress,
  });

  let Candidate = await Membership({
    participantPreconditions: params.candidatePreconditions,
    contractAddress: params.voterAddress,
  });

  let VotingContract = await Voting({
    electionPreconditions: params.electionPreconditions,
    voterPreconditions: params.voterPreconditions,
    candidatePreconditions: params.candidatePreconditions,
    candidateAddress: params.candidateAddress,
    voterAddress: params.voterAddress,
    contractAddress: params.votingAddress,
  });

  return {
    voterContract: Voter,
    candidateContract: Candidate,
    voting: VotingContract,
  };
}
