import {
  DeployArgs,
  Field,
  Permissions,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
  Reducer,
} from 'o1js';
import { VotingAppParams } from './factory.js';

import { Membership_ } from './membership.js';

import { Voting_ } from './voting.js';

class InvalidContract extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.none(),
      editActionState: Permissions.none(),
    });
  }
}

/**
 * Function used to deploy a set of contracts for a given set of preconditions
 * @param feePayer the private key used to pay the fees
 * @param contracts A set of contracts to deploy
 * @param params A set of preconditions and parameters
 * @param voterRoot the initial root of the voter store
 * @param candidateRoot the initial root of the voter store
 * @param votesRoot the initial root of the votes store
 */
export async function deployContracts(
  contracts: {
    voterContract: Membership_;
    candidateContract: Membership_;
    voting: Voting_;
  },
  params: VotingAppParams,
  voterRoot: Field,
  candidateRoot: Field,
  votesRoot: Field,
  proofsEnabled: boolean = false
): Promise<{
  voterContract: Membership_;
  candidateContract: Membership_;
  voting: Voting_;
  Local: any;
  feePayer: PrivateKey;
}> {
  let Local = Mina.LocalBlockchain({
    proofsEnabled,
    enforceTransactionLimits: true,
  });
  Mina.setActiveInstance(Local);

  let feePayerKey = Local.testAccounts[0].privateKey;
  let feePayer = Local.testAccounts[0].publicKey;
  let { voterContract, candidateContract, voting } = contracts;

  console.log('deploying set of 3 contracts');
  let tx = await Mina.transaction(feePayer, () => {
    AccountUpdate.fundNewAccount(feePayer, 3);

    voting.deploy({ zkappKey: params.votingKey });
    voting.committedVotes.set(votesRoot);
    voting.accumulatedVotes.set(Reducer.initialActionState);

    candidateContract.deploy({ zkappKey: params.candidateKey });
    candidateContract.committedMembers.set(candidateRoot);
    candidateContract.accumulatedMembers.set(Reducer.initialActionState);

    voterContract.deploy({ zkappKey: params.voterKey });
    voterContract.committedMembers.set(voterRoot);
    voterContract.accumulatedMembers.set(Reducer.initialActionState);
  });
  await tx.sign([feePayerKey]).send();

  console.log('successfully deployed contracts');
  return {
    voterContract,
    candidateContract,
    voting,
    feePayer: feePayerKey,
    Local,
  };
}

/**
 * Function used to deploy a set of **invalid** membership contracts for a given set of preconditions
 * @param feePayer the private key used to pay the fees
 * @param contracts A set of contracts to deploy
 * @param params A set of preconditions and parameters
 * @param voterRoot the initial root of the voter store
 * @param candidateRoot the initial root of the voter store
 * @param votesRoot the initial root of the votes store
 */
export async function deployInvalidContracts(
  contracts: {
    voterContract: Membership_;
    candidateContract: Membership_;
    voting: Voting_;
  },
  params: VotingAppParams,
  voterRoot: Field,
  candidateRoot: Field,
  votesRoot: Field
): Promise<{
  voterContract: Membership_;
  candidateContract: Membership_;
  voting: Voting_;
  Local: any;
  feePayer: PrivateKey;
}> {
  let Local = Mina.LocalBlockchain({
    proofsEnabled: false,
    enforceTransactionLimits: false,
  });
  Mina.setActiveInstance(Local);

  let feePayerKey = Local.testAccounts[0].privateKey;
  let feePayer = Local.testAccounts[0].publicKey;
  let { voterContract, candidateContract, voting } = contracts;

  console.log('deploying set of 3 contracts');
  let tx = await Mina.transaction(feePayer, () => {
    AccountUpdate.fundNewAccount(feePayer, 3);

    voting.deploy({ zkappKey: params.votingKey });
    voting.committedVotes.set(votesRoot);
    voting.accumulatedVotes.set(Reducer.initialActionState);

    // invalid contracts

    let invalidCandidateContract = new InvalidContract(
      params.candidateKey.toPublicKey()
    );

    invalidCandidateContract.deploy({ zkappKey: params.candidateKey });

    candidateContract = invalidCandidateContract as Membership_;

    let invalidVoterContract = new InvalidContract(
      params.voterKey.toPublicKey()
    );

    invalidVoterContract.deploy({ zkappKey: params.voterKey });

    voterContract = invalidVoterContract as Membership_;
  });
  await tx.sign([feePayerKey]).send();

  console.log('successfully deployed contracts');
  return {
    voterContract,
    candidateContract,
    voting,
    feePayer: feePayerKey,
    Local,
  };
}
