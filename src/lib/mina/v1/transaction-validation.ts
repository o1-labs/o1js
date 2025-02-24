/**
 * This module holds the global Mina instance and its interface.
 */
import {
  ZkappCommand,
  TokenId,
  Events,
  ZkappPublicInput,
  AccountUpdate,
  dummySignature,
} from './account-update.js';
import { Field } from '../../provable/wrapped.js';
import { UInt64, UInt32 } from '../../provable/int.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { JsonProof, verify } from '../../proof-system/zkprogram.js';
import { verifyAccountUpdateSignature } from '../../../mina-signer/src/sign-zkapp-command.js';
import { TransactionCost, TransactionLimits } from './constants.js';
import { cloneCircuitValue } from '../../provable/types/struct.js';
import { assert } from '../../provable/gadgets/common.js';
import { Types, TypesBigint } from '../../../bindings/mina-transaction/types.js';
import type { NetworkId } from '../../../mina-signer/src/types.js';
import type { Account } from './account.js';
import type { NetworkValue } from './precondition.js';

export {
  reportGetAccountError,
  defaultNetworkState,
  verifyTransactionLimits,
  getTotalTimeRequired,
  verifyAccountUpdate,
  filterGroups,
};

function reportGetAccountError(publicKey: string, tokenId: string) {
  if (tokenId === TokenId.toBase58(TokenId.default)) {
    return `getAccount: Could not find account for public key ${publicKey}`;
  } else {
    return `getAccount: Could not find account for public key ${publicKey} with the tokenId ${tokenId}`;
  }
}

function defaultNetworkState(): NetworkValue {
  let epochData: NetworkValue['stakingEpochData'] = {
    ledger: { hash: Field(0), totalCurrency: UInt64.zero },
    seed: Field(0),
    startCheckpoint: Field(0),
    lockCheckpoint: Field(0),
    epochLength: UInt32.zero,
  };
  return {
    snarkedLedgerHash: Field(0),
    blockchainLength: UInt32.zero,
    minWindowDensity: UInt32.zero,
    totalCurrency: UInt64.zero,
    globalSlotSinceGenesis: UInt32.zero,
    stakingEpochData: epochData,
    nextEpochData: cloneCircuitValue(epochData),
  };
}

function verifyTransactionLimits({ accountUpdates }: ZkappCommand) {
  let { totalTimeRequired, eventElements, authTypes } = getTotalTimeRequired(accountUpdates);

  let isWithinCostLimit = totalTimeRequired < TransactionCost.COST_LIMIT;

  let isWithinEventsLimit = eventElements.events <= TransactionLimits.MAX_EVENT_ELEMENTS;
  let isWithinActionsLimit = eventElements.actions <= TransactionLimits.MAX_ACTION_ELEMENTS;

  let error = '';

  if (!isWithinCostLimit) {
    // TODO: we should add a link to the docs explaining the reasoning behind it once we have such an explainer
    error += `Error: The transaction is too expensive, try reducing the number of AccountUpdates that are attached to the transaction.
Each transaction needs to be processed by the snark workers on the network.
Certain layouts of AccountUpdates require more proving time than others, and therefore are too expensive.

${JSON.stringify(authTypes)}
\n\n`;
  }

  if (!isWithinEventsLimit) {
    error += `Error: The account updates in your transaction are trying to emit too much event data. The maximum allowed number of field elements in events is ${TransactionLimits.MAX_EVENT_ELEMENTS}, but you tried to emit ${eventElements.events}.\n\n`;
  }

  if (!isWithinActionsLimit) {
    error += `Error: The account updates in your transaction are trying to emit too much action data. The maximum allowed number of field elements in actions is ${TransactionLimits.MAX_ACTION_ELEMENTS}, but you tried to emit ${eventElements.actions}.\n\n`;
  }

  if (error) throw Error('Error during transaction sending:\n\n' + error);
}

function getTotalTimeRequired(accountUpdates: AccountUpdate[]) {
  let eventElements = { events: 0, actions: 0 };

  let authKinds = accountUpdates.map((update) => {
    eventElements.events += countEventElements(update.body.events);
    eventElements.actions += countEventElements(update.body.actions);
    let { isSigned, isProved, verificationKeyHash } = update.body.authorizationKind;
    return {
      isSigned: isSigned.toBoolean(),
      isProved: isProved.toBoolean(),
      verificationKeyHash: verificationKeyHash.toString(),
    };
  });
  // insert entry for the fee payer
  authKinds.unshift({
    isSigned: true,
    isProved: false,
    verificationKeyHash: '',
  });
  let authTypes = filterGroups(authKinds);

  /*
  np := proof
  n2 := signedPair
  n1 := signedSingle

  formula used to calculate how expensive a zkapp transaction is

  10.26*np + 10.08*n2 + 9.14*n1 < 69.45
  */
  let totalTimeRequired =
    TransactionCost.PROOF_COST * authTypes.proof +
    TransactionCost.SIGNED_PAIR_COST * authTypes.signedPair +
    TransactionCost.SIGNED_SINGLE_COST * authTypes.signedSingle;
  // returns totalTimeRequired and additional data used by verifyTransactionLimits
  return { totalTimeRequired, eventElements, authTypes };
}

function countEventElements({ data }: Events) {
  return data.reduce((acc, ev) => acc + ev.length, 0);
}

function filterGroups(xs: AuthorizationKind[]) {
  let pairs = filterPairs(xs);
  xs = pairs.xs;

  let singleCount = 0;
  let proofCount = 0;

  xs.forEach((t) => {
    if (t.isProved) proofCount++;
    else singleCount++;
  });

  return {
    signedPair: pairs.pairs,
    signedSingle: singleCount,
    proof: proofCount,
  };
}

async function verifyAccountUpdate(
  account: Account,
  accountUpdate: AccountUpdate,
  publicInput: ZkappPublicInput,
  transactionCommitments: { commitment: bigint; fullCommitment: bigint },
  proofsEnabled: boolean,
  networkId: NetworkId
): Promise<void> {
  // check that that top-level updates have mayUseToken = No
  // (equivalent check exists in the Mina node)
  if (
    accountUpdate.body.callDepth === 0 &&
    !AccountUpdate.MayUseToken.isNo(accountUpdate).toBoolean()
  ) {
    throw Error(
      'Top-level account update can not use or pass on token permissions. Make sure that\n' +
        'accountUpdate.body.mayUseToken = AccountUpdate.MayUseToken.No;'
    );
  }

  let perm = account.permissions;

  // check if addMissingSignatures failed to include a signature
  // due to a missing private key
  if (accountUpdate.authorization === dummySignature()) {
    let pk = PublicKey.toBase58(accountUpdate.body.publicKey);
    throw Error(
      `verifyAccountUpdate: Detected a missing signature for (${pk}), private key was missing.`
    );
  }
  // we are essentially only checking if the update is empty or an actual update
  function includesChange<T extends {}>(val: T | string | null | (string | null)[]): boolean {
    if (Array.isArray(val)) {
      return !val.every((v) => v === null);
    } else {
      return val !== null;
    }
  }

  function permissionForUpdate(key: string): Types.AuthRequired {
    switch (key) {
      case 'appState':
        return perm.editState;
      case 'delegate':
        return perm.setDelegate;
      case 'verificationKey':
        return perm.setVerificationKey.auth;
      case 'permissions':
        return perm.setPermissions;
      case 'zkappUri':
        return perm.setZkappUri;
      case 'tokenSymbol':
        return perm.setTokenSymbol;
      case 'timing':
        return perm.setTiming;
      case 'votingFor':
        return perm.setVotingFor;
      case 'actions':
        return perm.editActionState;
      case 'incrementNonce':
        return perm.incrementNonce;
      case 'send':
        return perm.send;
      case 'receive':
        return perm.receive;
      default:
        throw Error(`Invalid permission for field ${key}: does not exist.`);
    }
  }

  let accountUpdateJson = accountUpdate.toJSON();
  const update = accountUpdateJson.body.update;

  let errorTrace = '';

  let isValidProof = false;
  let isValidSignature = false;

  // we don't check if proofs aren't enabled
  if (!proofsEnabled) isValidProof = true;

  if (accountUpdate.authorization.proof && proofsEnabled) {
    try {
      let publicInputFields = ZkappPublicInput.toFields(publicInput);

      let proof: JsonProof = {
        maxProofsVerified: 2,
        proof: accountUpdate.authorization.proof!,
        publicInput: publicInputFields.map((f) => f.toString()),
        publicOutput: [],
      };

      let verificationKey = account.zkapp?.verificationKey?.data;
      assert(verificationKey !== undefined, 'Account does not have a verification key');

      isValidProof = await verify(proof, verificationKey);
      if (!isValidProof) {
        throw Error(`Invalid proof for account update\n${JSON.stringify(update)}`);
      }
    } catch (error) {
      errorTrace += '\n\n' + (error as Error).stack;
      isValidProof = false;
    }
  }

  if (accountUpdate.authorization.signature) {
    // checking permissions and authorization for each account update individually
    try {
      isValidSignature = verifyAccountUpdateSignature(
        TypesBigint.AccountUpdate.fromJSON(accountUpdateJson),
        transactionCommitments,
        networkId
      );
    } catch (error) {
      errorTrace += '\n\n' + (error as Error).stack;
      isValidSignature = false;
    }
  }

  let verified = false;

  function checkPermission(p0: Types.AuthRequired, field: string) {
    let p = Types.AuthRequired.toJSON(p0);
    if (p === 'None') return;

    if (p === 'Impossible') {
      throw Error(
        `Transaction verification failed: Cannot update field '${field}' because permission for this field is '${p}'`
      );
    }

    if (p === 'Signature' || p === 'Either') {
      verified ||= isValidSignature;
    }

    if (p === 'Proof' || p === 'Either') {
      verified ||= isValidProof;
    }

    if (!verified) {
      throw Error(
        `Transaction verification failed: Cannot update field '${field}' because permission for this field is '${p}', but the required authorization was not provided or is invalid.
        ${errorTrace !== '' ? 'Error trace: ' + errorTrace : ''}\n\n`
      );
    }
  }

  // goes through the update field on a transaction
  Object.entries(update).forEach(([key, value]) => {
    if (includesChange(value)) {
      let p = permissionForUpdate(key);
      checkPermission(p, key);
    }
  });

  // checks the sequence events (which result in an updated sequence state)
  if (accountUpdate.body.actions.data.length > 0) {
    let p = permissionForUpdate('actions');
    checkPermission(p, 'actions');
  }

  if (accountUpdate.body.incrementNonce.toBoolean()) {
    let p = permissionForUpdate('incrementNonce');
    checkPermission(p, 'incrementNonce');
  }

  // this checks for an edge case where an account update can be approved using proofs but
  // a) the proof is invalid (bad verification key)
  // and b) there are no state changes initiate so no permissions will be checked
  // however, if the verification key changes, the proof should still be invalid
  if (errorTrace && !verified) {
    throw Error(
      `One or more proofs were invalid and no other form of authorization was provided.\n${errorTrace}`
    );
  }
}

type AuthorizationKind = { isProved: boolean; isSigned: boolean };

const isPair = (a: AuthorizationKind, b: AuthorizationKind) => !a.isProved && !b.isProved;

function filterPairs(xs: AuthorizationKind[]): {
  xs: { isProved: boolean; isSigned: boolean }[];
  pairs: number;
} {
  if (xs.length <= 1) return { xs, pairs: 0 };
  if (isPair(xs[0], xs[1])) {
    let rec = filterPairs(xs.slice(2));
    return { xs: rec.xs, pairs: rec.pairs + 1 };
  } else {
    let rec = filterPairs(xs.slice(1));
    return { xs: [xs[0]].concat(rec.xs), pairs: rec.pairs };
  }
}
