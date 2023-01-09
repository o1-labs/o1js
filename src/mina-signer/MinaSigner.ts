import { PrivateKey, PublicKey } from '../provable/curve-bigint.js';
import * as Json from './src/TSTypes.js';
import type { Signed, Network } from './src/TSTypes.js';

import {
  isPayment,
  isMessage,
  isStakeDelegation,
  isZkappCommand,
} from './src/Utils.js';
import * as TransactionJson from '../provable/gen/transaction-json.js';
import { ZkappCommand } from '../provable/gen/transaction-bigint.js';
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
import { Signature } from './src/signature.js';
import { Memo } from './src/memo.js';
import {
  publicKeyToHex,
  rosettaTransactionToSignedCommand,
} from './src/rosetta.js';

export { Client as default };

const defaultValidUntil = '4294967295';

class Client {
  private network: Network;

  constructor(options: { network: Network }) {
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
  public genKeys(): Json.Keypair {
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
  public verifyKeypair({ privateKey, publicKey }: Json.Keypair): boolean {
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
    let dummy = ZkappCommand.toJSON(ZkappCommand.emptyValue());
    dummy.feePayer.body.publicKey = publicKey;
    dummy.memo = Memo.toBase58(Memo.emptyValue());
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
  public derivePublicKey(privateKeyBase58: Json.PrivateKey): Json.PublicKey {
    let privateKey = PrivateKey.fromBase58(privateKeyBase58);
    let publicKey = PrivateKey.toPublicKey(privateKey);
    return PublicKey.toBase58(publicKey);
  }

  /**
   * Signs an arbitrary message
   *
   * @param message An arbitrary string message to be signed
   * @param key The key pair used to sign the message
   * @returns A signed message
   */
  public signMessage(message: string, key: Json.Keypair): Signed<Json.Message> {
    return {
      signature: {
        ...signString(message, key.privateKey, this.network),
        signer: key.publicKey,
      },
      // TODO: returning the public key, which is an input, twice seems awfully redundant
      // this should just be `data: message`
      // and do we really need `signer` as part of `Signature`?
      data: { publicKey: key.publicKey, message },
    };
  }

  /**
   * Verifies that a signature matches a message.
   *
   * @param signedMessage A signed message
   * @returns True if the `signedMessage` contains a valid signature matching
   * the message and publicKey.
   */
  public verifyMessage(signedMessage: Signed<Json.Message>): boolean {
    return verifyStringSignature(
      signedMessage.data.message,
      signedMessage.signature,
      signedMessage.data.publicKey,
      this.network
    );
  }

  private normalizeCommon(common: Json.Common): Json.StrictCommon {
    return {
      to: common.to,
      from: common.from,
      fee: String(common.fee),
      nonce: String(common.nonce),
      memo: common.memo ?? '',
      validUntil: String(common.validUntil ?? defaultValidUntil),
    };
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
  public signPayment(
    payment: Json.Payment,
    privateKey: Json.PrivateKey
  ): Signed<Json.Payment> {
    let { fee, to, from, nonce, validUntil, memo } =
      this.normalizeCommon(payment);
    let amount = String(payment.amount);
    let signature = signPayment(
      {
        common: { fee, feePayer: from, nonce, validUntil, memo },
        body: { source: from, receiver: to, amount },
      },
      privateKey,
      this.network
    );
    return {
      signature: { ...signature, signer: from },
      data: { to, from, fee, amount, nonce, memo, validUntil },
    };
  }

  /**
   * Verifies a signed payment.
   *
   * @param signedPayment A signed payment transaction
   * @returns True if the `signed(payment)` is a verifiable payment
   */
  public verifyPayment({ data, signature }: Signed<Json.Payment>): boolean {
    let { fee, to, from, nonce, validUntil, memo } = this.normalizeCommon(data);
    let amount = String(data.amount);
    return verifyPayment(
      {
        common: { fee, feePayer: from, nonce, validUntil, memo },
        body: { source: from, receiver: to, amount },
      },
      signature,
      signature.signer,
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
   * @param stakeDelegation An object describing the stake delegation
   * @param privateKey The private key used to sign the transaction
   * @returns A signed stake delegation
   */
  public signStakeDelegation(
    stakeDelegation: Json.StakeDelegation,
    privateKey: Json.PrivateKey
  ): Signed<Json.StakeDelegation> {
    let { fee, to, from, nonce, validUntil, memo } =
      this.normalizeCommon(stakeDelegation);
    let signature = signStakeDelegation(
      {
        common: { fee, feePayer: from, nonce, validUntil, memo },
        body: { newDelegate: to, delegator: from },
      },
      privateKey,
      this.network
    );
    return {
      signature: { ...signature, signer: from },
      data: { to, from, fee, nonce, memo, validUntil },
    };
  }

  /**
   * Verifies a signed stake delegation.
   *
   * @param signedStakeDelegation A signed stake delegation
   * @returns True if the `signed(stakeDelegation)` is a verifiable stake delegation
   */
  public verifyStakeDelegation({
    data,
    signature,
  }: Signed<Json.StakeDelegation>): boolean {
    let { fee, to, from, nonce, validUntil, memo } = this.normalizeCommon(data);
    return verifyStakeDelegation(
      {
        common: { fee, feePayer: from, nonce, validUntil, memo },
        body: { newDelegate: to, delegator: from },
      },
      signature,
      signature.signer,
      this.network
    );
  }

  /**
   * Compute the hash of a signed payment.
   *
   * @param signedPayment A signed payment transaction
   * @returns A transaction hash
   */
  public hashPayment(
    { data, signature }: Signed<Json.Payment>,
    options?: { berkeley?: boolean }
  ): string {
    let { fee, to, from, nonce, validUntil, memo } = this.normalizeCommon(data);
    let amount = String(data.amount);
    return hashPayment(
      {
        signature,
        data: {
          common: { fee, feePayer: from, nonce, validUntil, memo },
          body: { source: from, receiver: to, amount },
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
  public hashStakeDelegation(
    { data, signature }: Signed<Json.StakeDelegation>,
    options?: { berkeley?: boolean }
  ): string {
    let { fee, to, from, nonce, validUntil, memo } = this.normalizeCommon(data);
    return hashStakeDelegation(
      {
        signature,
        data: {
          common: { fee, feePayer: from, nonce, validUntil, memo },
          body: { newDelegate: to, delegator: from },
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
   * @param zkappCommand A object representing a zkApp command tx
   * @param privateKey The fee payer private key
   * @returns Signed ZkappCommand
   */
  public signZkappCommand(
    { feePayer, zkappCommand }: Json.ZkappCommand,
    privateKey: Json.PrivateKey
  ): Signed<Json.ZkappCommand> {
    let accountUpdates = zkappCommand.accountUpdates;
    let minimumFee = this.getAccountUpdateMinimumFee(accountUpdates);
    let fee_ = Number(feePayer.fee);
    if (Number.isNaN(fee_) || fee_ < minimumFee) {
      throw Error(`Fee must be greater than ${minimumFee}`);
    }
    let publicKey = feePayer.feePayer;
    let fee = String(fee_);
    let nonce = String(feePayer.nonce);
    let validUntil = String(feePayer.validUntil ?? defaultValidUntil);
    let memo = Memo.toBase58(Memo.fromString(feePayer.memo ?? ''));
    let command: TransactionJson.ZkappCommand = {
      feePayer: {
        body: { publicKey, fee, nonce, validUntil },
        authorization: '', // gets filled below
      },
      accountUpdates,
      memo,
    };
    let signed = signZkappCommand(command, privateKey, this.network);
    let signature = Signature.toJSON(
      Signature.fromBase58(signed.feePayer.authorization)
    );
    return {
      signature: { ...signature, signer: publicKey },
      data: {
        zkappCommand: signed,
        feePayer: { feePayer: publicKey, fee, nonce, memo, validUntil },
      },
    };
  }

  /**
   * Converts a Rosetta signed transaction to a JSON string that is
   * compatible with GraphQL. The JSON string is a representation of
   * a `Signed_command` which is what our GraphQL expects.
   *
   * @param signedRosettaTxn A signed Rosetta transaction
   * @returns A string that represents the JSON conversion of a signed Rosetta transaction`.
   */
  public signedRosettaTransactionToSignedCommand(
    signedRosettaTxn: string
  ): string {
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
  public publicKeyToRaw(publicKeyBase58: string): string {
    let publicKey = PublicKey.fromBase58(publicKeyBase58);
    return publicKeyToHex(publicKey);
  }

  /**
   * Signs an arbitrary payload using a private key. This function can sign messages,
   * payments, stake delegations, and zkapp commands. If the payload is unrecognized, an Error
   * is thrown.
   *
   * @param payload A signable payload
   * @param key A valid keypair
   * @returns A signed payload
   */
  public signTransaction(
    payload: Json.SignableData,
    privateKey: Json.PrivateKey
  ): Signed<Json.SignableData> {
    if (isMessage(payload)) {
      return this.signMessage(payload.message, {
        publicKey: payload.publicKey,
        privateKey,
      });
    }
    if (isPayment(payload)) {
      return this.signPayment(payload, privateKey);
    }
    if (isStakeDelegation(payload)) {
      return this.signStakeDelegation(payload, privateKey);
    }
    if (isZkappCommand(payload)) {
      return this.signZkappCommand(payload, privateKey);
    } else {
      throw new Error(`Expected signable payload, got '${payload}'.`);
    }
  }

  /**
   * Calculates the minimum fee of a zkapp command transaction. A fee for a zkapp command transaction is
   * the sum of all account updates plus the specified fee amount. If no fee is passed in, `0.001`
   * is used (according to the Mina spec) by default.
   * @param p An accountUpdates object
   * @param fee The fee per accountUpdate amount
   * @returns  The fee to be paid by the fee payer accountUpdate
   */
  public getAccountUpdateMinimumFee(
    p: TransactionJson.AccountUpdate[],
    fee: number = 0.001
  ) {
    return p.reduce((accumulatedFee, _) => accumulatedFee + fee, 0);
  }
}
