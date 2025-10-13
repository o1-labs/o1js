import { Bool, Field, Sign, UInt32 } from './field-bigint.js';
import { PrivateKey, PublicKey } from './curve-bigint.js';
import {
  Json,
  AccountUpdate,
  ZkappCommand,
} from '../../bindings/mina-transaction/gen/v1/transaction-bigint.js';
import { hashWithPrefix, packToFields, prefixes } from './poseidon-bigint.js';
import { Memo } from './memo.js';
import { Signature, signFieldElement, verifyFieldElement, zkAppBodyPrefix } from './signature.js';
import { mocks } from '../../bindings/crypto/constants.js';
import { NetworkId } from './types.js';

// external API
export { signZkappCommand, verifyZkappCommandSignature };

// internal API
export {
  transactionCommitments,
  verifyAccountUpdateSignature,
  accountUpdatesToCallForest,
  callForestHash,
  callForestHashGeneric,
  accountUpdateHash,
  feePayerHash,
  createFeePayer,
  accountUpdateFromFeePayer,
  isCallDepthValid,
  CallForest,
};

/**
 * Signs a zkApp command JSON object with the provided private key.
 *
 * This function applies a Schnorr signature to the fee payer and any account
 * updates within the command that require signatures and are owned by the same
 * public key. 
 * 
 * If this method is not called as the fee payer (i.e. the private key provided 
 * does not match the fee payer's public key), the fee payer authorization will 
 * remain unsigned after this method returns. This behavior allows for collaborative
 * construction of zkApp commands where two different users sign the account update
 * and pay the fee.
 *
 * @param zkappCommand_ - The zkApp command in JSON format, before signatures.
 * @param privateKeyBase58 - The Base58-encoded private key used for signing.
 * @param networkId - The network identifier that determines the signature domain.
 * @returns The signed zkApp command in JSON format.
 */
function signZkappCommand(
  zkappCommand_: Json.ZkappCommand,
  privateKeyBase58: string,
  networkId: NetworkId
): Json.ZkappCommand {
  let zkappCommand = ZkappCommand.fromJSON(zkappCommand_);

  let { commitment, fullCommitment } = transactionCommitments(zkappCommand, networkId);
  let privateKey = PrivateKey.fromBase58(privateKeyBase58);
  let publicKey = PrivateKey.toPublicKey(privateKey);

  let signature = signFieldElement(fullCommitment, privateKey, networkId);

  // sign fee payer whenever the public key matches
  if (PublicKey.equal(zkappCommand.feePayer.body.publicKey, publicKey)) {
    zkappCommand.feePayer.authorization = Signature.toBase58(signature);
  }

  // sign other updates with the same public key that require a signature
  for (let update of zkappCommand.accountUpdates) {
    if (!update.body.authorizationKind.isSigned) continue;
    if (!PublicKey.equal(update.body.publicKey, publicKey)) continue;
    let { useFullCommitment } = update.body;
    let usedCommitment = useFullCommitment ? fullCommitment : commitment;
    let signature = signFieldElement(usedCommitment, privateKey, networkId);
    update.authorization = { signature: Signature.toBase58(signature) };
  }
  return ZkappCommand.toJSON(zkappCommand);
}

/**
 * Verifies the signature of a zkApp command JSON object.
 * 
 * This function verifies the signatures of the fee payer and any account
 * updates within the command that require signatures and are owned by the
 * same public key. 
 *
 * @param zkappCommand_ - The zkApp command in JSON format, after signatures.
 * @param publicKeyBase58 - The Base58-encoded public key used for verification.
 * @param networkId - The network identifier that determines the signature domain.
 * @param feePayerPublicKeyBase58 - Optional Base58-encoded public key of the fee
 *                            payer, required if the provided public key does not
 *                            match the fee payer's public key.
 * @returns True if the signature is valid, false otherwise.
 *
 * @warning To verify the zkApp command signature, the public key must match the
 * fee payer's public key, or the parameter `feePayerPublicKey` must be provided.
 */
function verifyZkappCommandSignature(
  zkappCommand_: Json.ZkappCommand,
  publicKeyBase58: string,
  networkId: NetworkId,
  feePayerPublicKeyBase58?: string
) {
  let zkappCommand = ZkappCommand.fromJSON(zkappCommand_);

  let { commitment, fullCommitment } = transactionCommitments(zkappCommand, networkId);
  let publicKey = PublicKey.fromBase58(publicKeyBase58);

  // verify fee payer signature when public keys match
  let feePayerPublicKey = feePayerPublicKeyBase58 ? PublicKey.fromBase58(feePayerPublicKeyBase58) : publicKey;
  let signature = Signature.fromBase58(zkappCommand.feePayer.authorization);
  let ok = verifyFieldElement(signature, fullCommitment, feePayerPublicKey, networkId) && PublicKey.equal(zkappCommand.feePayer.body.publicKey, feePayerPublicKey);
  if (!ok) return false;

  // verify other signatures for the same public key
  for (let update of zkappCommand.accountUpdates) {
    if (!update.body.authorizationKind.isSigned) continue;
    if (!PublicKey.equal(update.body.publicKey, publicKey)) continue;
    let { useFullCommitment } = update.body;
    let usedCommitment = useFullCommitment ? fullCommitment : commitment;
    if (update.authorization.signature === undefined) return false;
    let signature = Signature.fromBase58(update.authorization.signature);
    ok = verifyFieldElement(signature, usedCommitment, publicKey, networkId);
    if (!ok) return false;
  }
  return ok;
}

function verifyAccountUpdateSignature(
  update: AccountUpdate,
  transactionCommitments: { commitment: bigint; fullCommitment: bigint },
  networkId: NetworkId
) {
  if (update.authorization.signature === undefined) return false;

  let { publicKey, useFullCommitment } = update.body;
  let { commitment, fullCommitment } = transactionCommitments;
  let usedCommitment = useFullCommitment ? fullCommitment : commitment;
  let signature = Signature.fromBase58(update.authorization.signature);

  return verifyFieldElement(signature, usedCommitment, publicKey, networkId);
}

function transactionCommitments(zkappCommand: ZkappCommand, networkId: NetworkId) {
  if (!isCallDepthValid(zkappCommand)) {
    throw Error('zkapp command: invalid call depth');
  }
  let callForest = accountUpdatesToCallForest(zkappCommand.accountUpdates);
  let commitment = callForestHash(callForest, networkId);
  let memoHash = Memo.hash(Memo.fromBase58(zkappCommand.memo));
  let feePayerDigest = feePayerHash(zkappCommand.feePayer, networkId);
  let fullCommitment = hashWithPrefix(prefixes.accountUpdateCons, [
    memoHash,
    feePayerDigest,
    commitment,
  ]);
  return { commitment, fullCommitment };
}

type CallTree<AccountUpdate> = {
  accountUpdate: AccountUpdate;
  children: CallForest<AccountUpdate>;
};
type CallForest<AccountUpdate> = CallTree<AccountUpdate>[];

/**
 * Turn flat list into a hierarchical structure (forest) by letting the callDepth
 * determine parent-child relationships
 */
function accountUpdatesToCallForest<A extends { body: { callDepth: number } }>(
  updates: A[],
  callDepth = 0
) {
  let remainingUpdates = callDepth > 0 ? updates : [...updates];
  let forest: CallForest<A> = [];
  while (remainingUpdates.length > 0) {
    let accountUpdate = remainingUpdates[0];
    if (accountUpdate.body.callDepth < callDepth) return forest;
    remainingUpdates.shift();
    let children = accountUpdatesToCallForest(remainingUpdates, callDepth + 1);
    forest.push({ accountUpdate, children });
  }
  return forest;
}

function accountUpdateHash(update: AccountUpdate, networkId: NetworkId) {
  assertAuthorizationKindValid(update);
  let input = AccountUpdate.toInput(update);
  let fields = packToFields(input);
  return hashWithPrefix(zkAppBodyPrefix(networkId), fields);
}

function callForestHash(forest: CallForest<AccountUpdate>, networkId: NetworkId): bigint {
  return callForestHashGeneric(forest, accountUpdateHash, hashWithPrefix, 0n, networkId);
}

function callForestHashGeneric<A, F>(
  forest: CallForest<A>,
  hash: (a: A, networkId: NetworkId) => F,
  hashWithPrefix: (prefix: string, input: F[]) => F,
  emptyHash: F,
  networkId: NetworkId
): F {
  let stackHash = emptyHash;
  for (let callTree of [...forest].reverse()) {
    let calls = callForestHashGeneric(
      callTree.children,
      hash,
      hashWithPrefix,
      emptyHash,
      networkId
    );
    let treeHash = hash(callTree.accountUpdate, networkId);
    let nodeHash = hashWithPrefix(prefixes.accountUpdateNode, [treeHash, calls]);
    stackHash = hashWithPrefix(prefixes.accountUpdateCons, [nodeHash, stackHash]);
  }
  return stackHash;
}

type FeePayer = ZkappCommand['feePayer'];

function createFeePayer(feePayer: FeePayer['body']): FeePayer {
  return { authorization: '', body: feePayer };
}
function feePayerHash(feePayer: FeePayer, networkId: NetworkId) {
  let accountUpdate = accountUpdateFromFeePayer(feePayer);
  return accountUpdateHash(accountUpdate, networkId);
}

function accountUpdateFromFeePayer({
  body: { fee, nonce, publicKey, validUntil },
  authorization: signature,
}: FeePayer): AccountUpdate {
  let { body } = AccountUpdate.empty();
  body.publicKey = publicKey;
  body.balanceChange = { magnitude: fee, sgn: Sign(-1) };
  body.incrementNonce = Bool(true);
  body.preconditions.network.globalSlotSinceGenesis = {
    isSome: Bool(true),
    value: { lower: UInt32(0), upper: validUntil ?? UInt32.maxValue },
  };
  body.preconditions.account.nonce = {
    isSome: Bool(true),
    value: { lower: nonce, upper: nonce },
  };
  body.useFullCommitment = Bool(true);
  body.implicitAccountCreationFee = Bool(true);
  body.authorizationKind = {
    isProved: Bool(false),
    isSigned: Bool(true),
    verificationKeyHash: Field(mocks.dummyVerificationKeyHash),
  };
  return { body, authorization: { signature } };
}

function isCallDepthValid(zkappCommand: ZkappCommand) {
  let callDepths = zkappCommand.accountUpdates.map((a) => a.body.callDepth);
  let current = callDepths.shift() ?? 0;
  if (current !== 0) return false;
  for (let callDepth of callDepths) {
    if (callDepth < 0) return false;
    if (callDepth - current > 1) return false;
    current = callDepth;
  }
  return true;
}

function assertAuthorizationKindValid(accountUpdate: AccountUpdate) {
  let { isSigned, isProved, verificationKeyHash } = accountUpdate.body.authorizationKind;
  if (isProved && isSigned)
    throw Error('Invalid authorization kind: Only one of `isProved` and `isSigned` may be true.');
  if (!isProved && verificationKeyHash !== Field(mocks.dummyVerificationKeyHash))
    throw Error(
      `Invalid authorization kind: If \`isProved\` is false, verification key hash must be ${mocks.dummyVerificationKeyHash}, got ${verificationKeyHash}`
    );
}
