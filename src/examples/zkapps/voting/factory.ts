/**
 * Produces a set of three contracts, Voting, Voter Membership and Candidate Membership SCs.
 * Requires a set of preconditions.
 */

import { PrivateKey } from 'o1js';
import { Membership, Membership_ } from './membership.js';
import {
  ElectionPreconditions,
  ParticipantPreconditions,
} from './preconditions.js';
import { Voting, Voting_ } from './voting.js';

export { VotingAppParams };

type VotingAppParams = {
  candidatePreconditions: ParticipantPreconditions;
  voterPreconditions: ParticipantPreconditions;
  electionPreconditions: ElectionPreconditions;
  voterKey: PrivateKey;
  candidateKey: PrivateKey;
  votingKey: PrivateKey;
  doProofs: boolean;
};

function defaultParams(): VotingAppParams {
  return {
    candidatePreconditions: ParticipantPreconditions.default,
    voterPreconditions: ParticipantPreconditions.default,
    electionPreconditions: ElectionPreconditions.default,
    candidateKey: PrivateKey.random(),
    voterKey: PrivateKey.random(),
    votingKey: PrivateKey.random(),
    doProofs: true,
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
    contractAddress: params.voterKey.toPublicKey(),
    doProofs: params.doProofs,
  });

  let Candidate = await Membership({
    participantPreconditions: params.candidatePreconditions,
    contractAddress: params.candidateKey.toPublicKey(),
    doProofs: params.doProofs,
  });

  let VotingContract = await Voting({
    electionPreconditions: params.electionPreconditions,
    voterPreconditions: params.voterPreconditions,
    candidatePreconditions: params.candidatePreconditions,
    candidateAddress: params.candidateKey.toPublicKey(),
    voterAddress: params.voterKey.toPublicKey(),
    contractAddress: params.votingKey.toPublicKey(),
    doProofs: params.doProofs,
  });

  return {
    voterContract: Voter,
    candidateContract: Candidate,
    voting: VotingContract,
  };
}
