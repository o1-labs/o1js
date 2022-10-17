import {
  DeployArgs,
  Experimental,
  Field,
  Permissions,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
} from 'snarkyjs';
import { VotingAppParams } from './factory.js';

import { Membership_ } from './membership.js';

import { Voting_ } from './voting.js';

class InvalidContract extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.none(),
      editSequenceState: Permissions.none(),
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
  votesRoot: Field
): Promise<{
  voterContract: Membership_;
  candidateContract: Membership_;
  voting: Voting_;
  Local: any;
  feePayer: PrivateKey;
}> {
  let Local = Mina.LocalBlockchain({
    proofsEnabled: true,
  });
  Mina.setActiveInstance(Local);

  let feePayer = Local.testAccounts[0].privateKey;
  let { voterContract, candidateContract, voting } = contracts;

  console.log('deploying set of 3 contracts');
  try {
    let tx = await Mina.transaction(feePayer, () => {
      AccountUpdate.fundNewAccount(feePayer, {
        initialBalance: Mina.accountCreationFee().add(
          Mina.accountCreationFee()
        ),
      });

      voting.deploy({ zkappKey: params.votingKey });
      voting.committedVotes.set(votesRoot);
      voting.accumulatedVotes.set(Experimental.Reducer.initialActionsHash);

      candidateContract.deploy({ zkappKey: params.candidateKey });
      candidateContract.committedMembers.set(candidateRoot);
      candidateContract.accumulatedMembers.set(
        Experimental.Reducer.initialActionsHash
      );

      voterContract.deploy({ zkappKey: params.voterKey });
      voterContract.committedMembers.set(voterRoot);
      voterContract.accumulatedMembers.set(
        Experimental.Reducer.initialActionsHash
      );
    });
    await tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  console.log('successfully deployed contracts');
  return { voterContract, candidateContract, voting, feePayer, Local };
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
    proofsEnabled: true,
  });
  Mina.setActiveInstance(Local);

  let feePayer = Local.testAccounts[0].privateKey;
  let { voterContract, candidateContract, voting } = contracts;

  console.log('deploying set of 3 contracts');
  try {
    let tx = await Mina.transaction(feePayer, () => {
      AccountUpdate.fundNewAccount(feePayer, {
        initialBalance: Mina.accountCreationFee().add(
          Mina.accountCreationFee()
        ),
      });

      voting.deploy({ zkappKey: params.votingKey });
      voting.committedVotes.set(votesRoot);
      voting.accumulatedVotes.set(Experimental.Reducer.initialActionsHash);

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
    await tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  console.log('successfully deployed contracts');
  return { voterContract, candidateContract, voting, feePayer, Local };
}

/**
 * Function used to upgrade a Membership contract with slightly modified methods, in order to manipulate the existing verification key
 */
/* export async function upgradeMembershipContract(
  feePayer: PrivateKey,
  contractKey: PrivateKey
): Promise<ModifiedMembership> {
  console.log('deploying an upgraded version to existing membership contract');
  let modifiedContract = new ModifiedMembership(contractKey.toPublicKey());
  await ModifiedMembership.compile();
  try {
    let tx = await Mina.transaction(feePayer, () => {
      modifiedContract.deploy({ zkappKey: contractKey });
      modifiedContract.sign(contractKey);
    });
    tx.send();
  } catch (err: any) {
    throw Error(err);
  }

  console.log('successfully deployed upgraded contract');
  return modifiedContract;
}
 */
