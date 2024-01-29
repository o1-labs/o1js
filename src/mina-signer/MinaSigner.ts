import { PrivateKey, PublicKey } from '../provable/curve-bigint.js';
import * as Json from './src/TSTypes.js';
import type { SignedLegacy, Signed, NetworkId } from './src/TSTypes.js';

import {
  isPayment,
  isSignedDelegation,
  isSignedPayment,
  isSignedString,
  isSignedZkappCommand,
  isStakeDelegation,
  isZkappCommand,
} from './src/Utils.js';
import * as TransactionJson from '../bindings/mina-transaction/gen/transaction-json.js';
import { ZkappCommand } from '../bindings/mina-transaction/gen/transaction-bigint.js';
import {
  signZkappCommand,
  verifyZkappCommandSignature,
} from './src/sign-zkapp-command.js';
import {
  signPayment,
  signStakeDelegation,
  signString,
  verifyPayment,
  verifyStakeDelegation,
  verifyStringSignature,
} from './src/sign-legacy.js';
import { hashPayment, hashStakeDelegation } from './src/transaction-hash.js';
import { Memo } from './src/memo.js';
import {
  publicKeyToHex,
  rosettaTransactionToSignedCommand,
} from './src/rosetta.js';
import { sign, Signature, verify } from './src/signature.js';
import { createNullifier } from './src/nullifier.js';

export { Client as default };

const defaultValidUntil = '4294967295';

class Client {
  private network: NetworkId; // TODO: Rename to "networkId" for consistency with remaining codebase.

  constructor(options: { network: NetworkId }) {
    if (!options?.network) {
      throw Error('Invalid Specified Network');
    }
    const specifiedNetwork = options.network.toLowerCase();
    if (specifiedNetwork !== 'mainnet' && specifiedNetwork !== 'testnet') {
      throw Error('Invalid Specified Network');
    }
    this.network = specifiedNetwork;
  }

  /**
   * Generates a public/private key pair
   *
   * @returns A Mina key pair
   */
  genKeys(): Json.Keypair {
    let privateKey = PrivateKey.random();
    let publicKey = PrivateKey.toPublicKey(privateKey);
    return {
      privateKey: PrivateKey.toBase58(privateKey),
      publicKey: PublicKey.toBase58(publicKey),
    };
  }

  /**
   * Verifies if a key pair is valid by checking if the public key can be derived from
   * the private key and additionally checking if we can use the private key to
   * sign a transaction. If the key pair is invalid, an exception is thrown.
   *
   * @param keypair A key pair
   * @returns True if the `keypair` is a verifiable key pair, otherwise throw an exception
   */
  verifyKeypair({ privateKey, publicKey }: Json.Keypair): boolean {
    let derivedPublicKey = PrivateKey.toPublicKey(
      PrivateKey.fromBase58(privateKey)
    );
    let originalPublicKey = PublicKey.fromBase58(publicKey);
    if (
      derivedPublicKey.x !== originalPublicKey.x ||
      derivedPublicKey.isOdd !== originalPublicKey.isOdd
    ) {
      throw Error('Public key not derivable from private key');
    }
    let dummy = ZkappCommand.toJSON(ZkappCommand.empty());
    dummy.feePayer.body.publicKey = publicKey;
    dummy.memo = Memo.toBase58(Memo.empty());
    let signed = signZkappCommand(dummy, privateKey, this.network);
    let ok = verifyZkappCommandSignature(signed, publicKey, this.network);
    if (!ok) throw Error('Could not sign a transaction with private key');
    return true;
  }

  /**
   * Derives the public key of the corresponding private key
   *
   * @param privateKey The private key used to get the corresponding public key
   * @returns A public key
   */
  derivePublicKey(privateKeyBase58: Json.PrivateKey): Json.PublicKey {
    let privateKey = PrivateKey.fromBase58(privateKeyBase58);
    let publicKey = PrivateKey.toPublicKey(privateKey);
    return PublicKey.toBase58(publicKey);
  }

  /**
   * Signs an arbitrary list of field elements in a SNARK-compatible way.
   * The resulting signature can be verified in o1js as follows:
   * ```ts
   * // sign field elements with mina-signer
   * let signed = client.signFields(fields, privateKey);
   *
   * // read signature in o1js and verify
   * let signature = Signature.fromBase58(signed.signature);
   * let isValid: Bool = signature.verify(publicKey, fields.map(Field));
   * ```
   *
   * @param fields An arbitrary list of field elements
   * @param privateKey The private key used for signing
   * @returns The signed field elements
   */
  signFields(fields: bigint[], privateKey: Json.PrivateKey): Signed<bigint[]> {
    let privateKey_ = PrivateKey.fromBase58(privateKey);
    let signature = sign({ fields }, privateKey_, 'testnet');
    return {
      signature: Signature.toBase58(signature),
      publicKey: PublicKey.toBase58(PrivateKey.toPublicKey(privateKey_)),
      data: fields,
    };
  }

  /**
   * Verifies a signature created by {@link signFields}.
   *
   * @param signedFields The signed field elements
   * @returns True if the `signedFields` contains a valid signature matching
   * the fields and publicKey.
   */
  verifyFields({ data, signature, publicKey }: Signed<bigint[]>) {
    return verify(
      Signature.fromBase58(signature),
      { fields: data },
      PublicKey.fromBase58(publicKey),
      'testnet'
    );
  }

  /**
   * Signs an arbitrary message
   *
   * @param message An arbitrary string message to be signed
   * @param privateKey The private key used to sign the message
   * @returns A signed message
   */
  signMessage(
    message: string,
    privateKey: Json.PrivateKey
  ): SignedLegacy<string> {
    let privateKey_ = PrivateKey.fromBase58(privateKey);
    let publicKey = PublicKey.toBase58(PrivateKey.toPublicKey(privateKey_));
    return {
      signature: signString(message, privateKey, this.network),
      publicKey,
      data: message,
    };
  }

  /**
   * Verifies a signature created by {@link signMessage}.
   *
   * @param signedMessage A signed message
   * @returns True if the `signedMessage` contains a valid signature matching
   * the message and publicKey.
   */
  verifyMessage({ data, signature, publicKey }: SignedLegacy<string>): boolean {
    return verifyStringSignature(data, signature, publicKey, this.network);
  }

  /**
   * Signs a payment transaction using a private key.
   *
   * This type of transaction allows a user to transfer funds from one account
   * to another over the network.
   *
   * @param payment An object describing the payment
   * @param privateKey The private key used to sign the transaction
   * @returns A signed payment transaction
   */
  signPayment(
    payment: Json.Payment,
    privateKey: Json.PrivateKey
  ): SignedLegacy<Json.Payment> {
    let { fee, to, from, nonce, validUntil, memo } = validCommon(payment);
    let amount = String(payment.amount);
    let signature = signPayment(
      {
        common: { fee, feePayer: from, nonce, validUntil, memo },
        body: { receiver: to, amount },
      },
      privateKey,
      this.network
    );
    return {
      signature,
      publicKey: from,
      data: { to, from, fee, amount, nonce, memo, validUntil },
    };
  }

  /**
   * Verifies a signed payment.
   *
   * @param signedPayment A signed payment transaction
   * @returns True if the `signedPayment` is a verifiable payment
   */
  verifyPayment({
    data,
    signature,
    publicKey,
  }: SignedLegacy<Json.Payment>): boolean {
    let { fee, to, from, nonce, validUntil, memo } = validCommon(data);
    let amount = validNonNegative(data.amount);
    return verifyPayment(
      {
        common: { fee, feePayer: from, nonce, validUntil, memo },
        body: { receiver: to, amount },
      },
      signature,
      publicKey,
      this.network
    );
  }

  /**
   * Signs a stake delegation transaction using a private key.
   *
   * This type of transaction allows a user to delegate their
   * funds from one account to another for use in staking. The
   * account that is delegated to is then considered as having these
   * funds when determining whether it can produce a block in a given slot.
   *
   * @param delegation An object describing the stake delegation
   * @param privateKey The private key used to sign the transaction
   * @returns A signed stake delegation
   */
  signStakeDelegation(
    delegation: Json.StakeDelegation,
    privateKey: Json.PrivateKey
  ): SignedLegacy<Json.StakeDelegation> {
    let { fee, to, from, nonce, validUntil, memo } = validCommon(delegation);
    let signature = signStakeDelegation(
      {
        common: { fee, feePayer: from, nonce, validUntil, memo },
        body: { newDelegate: to },
      },
      privateKey,
      this.network
    );
    return {
      signature,
      publicKey: from,
      data: { to, from, fee, nonce, memo, validUntil },
    };
  }

  /**
   * Verifies a signed stake delegation.
   *
   * @param signedStakeDelegation A signed stake delegation
   * @returns True if the `signedStakeDelegation` is a verifiable stake delegation
   */
  verifyStakeDelegation({
    data,
    signature,
    publicKey,
  }: SignedLegacy<Json.StakeDelegation>): boolean {
    let { fee, to, from, nonce, validUntil, memo } = validCommon(data);
    return verifyStakeDelegation(
      {
        common: { fee, feePayer: from, nonce, validUntil, memo },
        body: { newDelegate: to },
      },
      signature,
      publicKey,
      this.network
    );
  }

  /**
   * Compute the hash of a signed payment.
   *
   * @param signedPayment A signed payment transaction
   * @returns A transaction hash
   */
  hashPayment(
    { data, signature }: SignedLegacy<Json.Payment>,
    options?: { berkeley?: boolean }
  ): string {
    let { fee, to, from, nonce, validUntil, memo } = validCommon(data);
    let amount = validNonNegative(data.amount);
    return hashPayment(
      {
        signature,
        data: {
          common: { fee, feePayer: from, nonce, validUntil, memo },
          body: { receiver: to, amount },
        },
      },
      options
    );
  }

  /**
   * Compute the hash of a signed stake delegation.
   *
   * @param signedStakeDelegation A signed stake delegation
   * @returns A transaction hash
   */
  hashStakeDelegation(
    { data, signature }: SignedLegacy<Json.StakeDelegation>,
    options?: { berkeley?: boolean }
  ): string {
    let { fee, to, from, nonce, validUntil, memo } = validCommon(data);
    return hashStakeDelegation(
      {
        signature,
        data: {
          common: { fee, feePayer: from, nonce, validUntil, memo },
          body: { newDelegate: to },
        },
      },
      options
    );
  }

  /**
   * Sign a zkapp command transaction using a private key.
   *
   * This type of transaction allows a user to update state on a given
   * Smart Contract running on Mina.
   *
   * @param zkappCommand An object representing a zkApp transaction
   * @param privateKey The fee payer private key
   * @returns Signed `zkappCommand`
   */
  signZkappCommand(
    { feePayer: feePayer_, zkappCommand }: Json.ZkappCommand,
    privateKey: Json.PrivateKey
  ): Signed<Json.ZkappCommand> {
    let accountUpdates = zkappCommand.accountUpdates;
    let minimumFee = this.getAccountUpdateMinimumFee(accountUpdates);
    let feePayer = validFeePayer(feePayer_, minimumFee);
    let { fee, nonce, validUntil, feePayer: publicKey, memo } = feePayer;
    let command: TransactionJson.ZkappCommand = {
      feePayer: {
        body: { publicKey, fee, nonce, validUntil },
        authorization: '', // gets filled below
      },
      accountUpdates,
      memo: Memo.toBase58(Memo.fromString(memo)),
    };
    let signed = signZkappCommand(command, privateKey, this.network);
    let signature = signed.feePayer.authorization;
    return { signature, publicKey, data: { zkappCommand: signed, feePayer } };
  }

  /**
   * Verifies a signed zkApp transaction.
   *
   * @param signedZkappCommand A signed zkApp transaction
   * @returns True if the signature is valid
   */
  verifyZkappCommand({
    data,
    publicKey,
    signature,
  }: Signed<Json.ZkappCommand>): boolean {
    return (
      signature === data.zkappCommand.feePayer.authorization &&
      verifyZkappCommandSignature(data.zkappCommand, publicKey, this.network)
    );
  }

  /**
   * Converts a Rosetta signed transaction to a JSON string that is
   * compatible with GraphQL. The JSON string is a representation of
   * a `Signed_command` which is what our GraphQL expects.
   *
   * @param signedRosettaTxn A signed Rosetta transaction
   * @returns A string that represents the JSON conversion of a signed Rosetta transaction`.
   */
  signedRosettaTransactionToSignedCommand(signedRosettaTxn: string): string {
    let parsedTx = JSON.parse(signedRosettaTxn);
    let command = rosettaTransactionToSignedCommand(parsedTx);
    return JSON.stringify({ data: command });
  }

  /**
   * Return the hex-encoded format of a valid public key. This will throw an exception if
   * the key is invalid or the conversion fails.
   *
   * @param publicKey A valid public key
   * @returns A string that represents the hex encoding of a public key.
   */
  publicKeyToRaw(publicKeyBase58: string): string {
    let publicKey = PublicKey.fromBase58(publicKeyBase58);
    return publicKeyToHex(publicKey);
  }

  /**
   * Signs an arbitrary payload using a private key. This function can sign strings,
   * payments, stake delegations, and zkapp commands. If the payload is unrecognized, an Error
   * is thrown.
   *
   * @param payload A signable payload
   * @param privateKey A private key
   * @returns A signed payload
   */
  signTransaction<T extends Json.SignableData | Json.ZkappCommand>(
    payload: T,
    privateKey: Json.PrivateKey
  ): T extends Json.SignableData ? SignedLegacy<T> : Signed<T> {
    type Return = T extends Json.SignableData ? SignedLegacy<T> : Signed<T>;
    if (typeof payload === 'string') {
      return this.signMessage(payload, privateKey) as Return;
    }
    if (isPayment(payload)) {
      return this.signPayment(payload, privateKey) as Return;
    }
    if (isStakeDelegation(payload)) {
      return this.signStakeDelegation(payload, privateKey) as Return;
    }
    if (isZkappCommand(payload)) {
      return this.signZkappCommand(payload, privateKey) as Return;
    } else {
      throw Error(`Expected signable payload, got '${payload}'.`);
    }
  }

  /**
   * Verifies a signed payload. The payload can be a string, payment, stake delegation or zkApp transaction.
   * If the payload is unrecognized, an Error is thrown.
   *
   * @param signedPayload A signed payload
   * @returns True if the signature is valid
   */
  verifyTransaction(
    signed: SignedLegacy<Json.SignableData> | Signed<Json.ZkappCommand>
  ): boolean {
    if (isSignedString(signed)) {
      return this.verifyMessage(signed);
    }
    if (isSignedPayment(signed)) {
      return this.verifyPayment(signed);
    }
    if (isSignedDelegation(signed)) {
      return this.verifyStakeDelegation(signed);
    }
    if (isSignedZkappCommand(signed)) {
      return this.verifyZkappCommand(signed);
    } else {
      throw Error(
        `Expected signable payload, got '${JSON.stringify(signed.data)}'.`
      );
    }
  }

  /**
   * Calculates the minimum fee of a zkapp command transaction. A fee for a zkapp command transaction is
   * the sum of all account updates plus the specified fee amount. If no fee is passed in, `0.001`
   * is used (according to the Mina spec) by default.
   * @param accountUpdates A list of account updates
   * @returns  The fee to be paid by the fee payer accountUpdate
   */
  getAccountUpdateMinimumFee(accountUpdates: TransactionJson.AccountUpdate[]) {
    return 0.001 * accountUpdates.length;
  }

  /**
   * Creates a nullifier
   *
   * @param message A unique message that belongs to a specific nullifier
   * @param privateKeyBase58 The private key used to create the nullifier
   * @returns A nullifier
   */
  createNullifier(
    message: bigint[],
    privateKeyBase58: Json.PrivateKey
  ): Json.Nullifier {
    let sk = PrivateKey.fromBase58(privateKeyBase58);
    return createNullifier(message, sk);
  }

  /**
   * Returns the network ID.
   * 
   * @returns {NetworkId} The network ID.
   */
  get networkId(): NetworkId {
    return this.network;
  }
}

function validNonNegative(n: number | string | bigint): string {
  let n0 = BigInt(n); // validates that string represents an integer; also throws runtime errors for nullish inputs
  if (n0 < 0) throw Error('input must be non-negative');
  return n0.toString();
}

function validCommon(common: Json.Common): Json.StrictCommon {
  let memo = Memo.toValidString(common.memo);
  return {
    to: common.to,
    from: common.from,
    fee: validNonNegative(common.fee),
    nonce: validNonNegative(common.nonce),
    memo,
    validUntil: validNonNegative(common.validUntil ?? defaultValidUntil),
  };
}

function validFeePayer(
  feePayer: Json.ZkappCommand['feePayer'],
  minimumFee: number
): Json.StrictFeePayer {
  if (feePayer.fee === undefined) throw Error('Missing fee in fee payer');
  let fee = validNonNegative(feePayer.fee);
  if (Number(fee) < minimumFee)
    throw Error(`Fee must be greater than ${minimumFee}`);
  return {
    feePayer: feePayer.feePayer,
    fee,
    nonce: validNonNegative(feePayer.nonce),
    memo: Memo.toValidString(feePayer.memo),
    validUntil:
      feePayer.validUntil === undefined || feePayer.validUntil === null
        ? null
        : validNonNegative(feePayer.validUntil),
  };
}
