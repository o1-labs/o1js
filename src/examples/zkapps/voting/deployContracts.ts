import { Mina, Party } from 'snarkyjs';
import { VotingAppParams } from './factory';

import { Membership_ } from './membership';

import { Voting_ } from './voting';

/**
 * Function used to deploy a set of contracts for a given set of preconditions
 * @param contracts A set of contracts to deploy
 * @param params A set of preconditions and parameters
 */
export async function deployContracts(
  contracts: {
    voterContract: Membership_;
    candidateContract: Membership_;
    voting: Voting_;
  },
  params: VotingAppParams,
) {}