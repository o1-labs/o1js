import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt32 } from '../../provable/int.js';
import { PrivateKey, PublicKey } from '../../provable/crypto/signature.js';
import { HashInput } from '../../provable/types/provable-derivers.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';
import { NetworkId } from '../../../mina-signer/src/types.js';
import { protocolVersions } from 'src/bindings/crypto/constants.js';

export type AuthorizationLevelIdentifier = Bindings.Leaves.AuthRequiredIdentifier;

export class AuthorizationLevel {
  // TODO: it would be nice if these could be private, but then the subtyping doesn't work... maybe we can do a trick here with object splats?
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;

  constructor({
    constant,
    signatureNecessary,
    signatureSufficient,
  }: {
    constant: Bool;
    signatureNecessary: Bool;
    signatureSufficient: Bool;
  }) {
    this.constant = constant;
    this.signatureNecessary = signatureNecessary;
    this.signatureSufficient = signatureSufficient;
  }

  toInternalRepr(): Bindings.Leaves.AuthRequired {
    return this;
  }

  static fromInternalRepr(x: Bindings.Leaves.AuthRequired): AuthorizationLevel {
    return new AuthorizationLevel(x);
  }

  toJSON(): any {
    return AuthorizationLevel.toJSON(this);
  }

  toInput(): HashInput {
    return AuthorizationLevel.toInput(this);
  }

  toFields(): Field[] {
    return AuthorizationLevel.toFields(this);
  }

  isImpossible(): Bool {
    return Bindings.Leaves.AuthRequired.isImpossible(this);
  }

  isNone(): Bool {
    return Bindings.Leaves.AuthRequired.isNone(this);
  }

  isProof(): Bool {
    return Bindings.Leaves.AuthRequired.isProof(this);
  }

  isSignature(): Bool {
    return Bindings.Leaves.AuthRequired.isSignature(this);
  }

  isProofOrSignature(): Bool {
    return Bindings.Leaves.AuthRequired.isEither(this);
  }

  requiresProof(): Bool {
    return this.isProof().or(this.isProofOrSignature());
  }

  requiresSignature(): Bool {
    return this.isSignature().or(this.isProofOrSignature());
  }

  isSatisfied(authKind: AccountUpdateAuthorizationKind): Bool {
    return Bool.allTrue([
      this.requiresProof().implies(authKind.isProved),
      this.requiresSignature().implies(authKind.isSigned),
    ]);
  }

  // TODO: property test that this is the inverse of `from` identifier
  identifier(): AuthorizationLevelIdentifier {
    if (this.isImpossible().toBoolean()) {
      return 'Impossible';
    } else if (this.isNone().toBoolean()) {
      return 'None';
    } else if (this.isProof().toBoolean()) {
      return 'Proof';
    } else if (this.isSignature().toBoolean()) {
      return 'Signature';
    } else if (this.isProofOrSignature().toBoolean()) {
      return 'Either';
    } else {
      throw new Error('internal error: invalid authorization level');
    }
  }

  static Impossible(): AuthorizationLevel {
    return new AuthorizationLevel({
      constant: new Bool(true),
      signatureNecessary: new Bool(true),
      signatureSufficient: new Bool(false),
    });
  }

  static None(): AuthorizationLevel {
    return new AuthorizationLevel({
      constant: new Bool(true),
      signatureNecessary: new Bool(false),
      signatureSufficient: new Bool(true),
    });
  }

  static Proof(): AuthorizationLevel {
    return new AuthorizationLevel({
      constant: new Bool(false),
      signatureNecessary: new Bool(false),
      signatureSufficient: new Bool(false),
    });
  }

  static Signature(): AuthorizationLevel {
    return new AuthorizationLevel({
      constant: new Bool(false),
      signatureNecessary: new Bool(true),
      signatureSufficient: new Bool(true),
    });
  }

  static ProofOrSignature(): AuthorizationLevel {
    return new AuthorizationLevel({
      constant: new Bool(false),
      signatureNecessary: new Bool(false),
      signatureSufficient: new Bool(true),
    });
  }

  // TODO: ProofAndSignature

  static sizeInFields(): number {
    return Bindings.Leaves.AuthRequired.sizeInFields();
  }

  static empty(): AuthorizationLevel {
    return new AuthorizationLevel(Bindings.Leaves.AuthRequired.empty());
  }

  static toJSON(x: AuthorizationLevel): any {
    return Bindings.Leaves.AuthRequired.toJSON(x);
  }

  static toInput(x: AuthorizationLevel): HashInput {
    return Bindings.Leaves.AuthRequired.toInput(x);
  }

  static toFields(x: AuthorizationLevel): Field[] {
    return Bindings.Leaves.AuthRequired.toFields(x);
  }

  static toAuxiliary(x?: AuthorizationLevel): any[] {
    return Bindings.Leaves.AuthRequired.toAuxiliary(x);
  }

  static fromFields(fields: Field[], aux: any[]): AuthorizationLevel {
    return new AuthorizationLevel(Bindings.Leaves.AuthRequired.fromFields(fields, aux));
  }

  static check(x: AuthorizationLevel) {
    Bindings.Leaves.AuthRequired.check(x);
  }

  static toValue(x: AuthorizationLevel): AuthorizationLevel {
    return x;
  }

  static fromValue(x: AuthorizationLevel): AuthorizationLevel {
    return x;
  }

  static from(x: AuthorizationLevelIdentifier | AuthorizationLevel): AuthorizationLevel {
    switch (x) {
      case 'Signature':
        return AuthorizationLevel.Signature();
      case 'Proof':
        return AuthorizationLevel.Proof();
      // TODO: rename this
      case 'Either':
        return AuthorizationLevel.ProofOrSignature();
      case 'None':
        return AuthorizationLevel.None();
      case 'Impossible':
        return AuthorizationLevel.Impossible();
      default:
        return x;
    }
  }
}

export class VerificationKeyAuthorizationLevel {
  auth: AuthorizationLevel;
  txnVersion: UInt32;

  constructor(
    auth: AuthorizationLevel,
    txnVersion: UInt32 = UInt32.from(protocolVersions.txnVersion)
  ) {
    this.auth = auth;
    this.txnVersion = txnVersion;
  }

  toJSON(): { auth: AuthorizationLevelIdentifier; txnVersion: string } {
    return {
      auth: this.auth.toJSON(),
      txnVersion: this.txnVersion.toString(),
    };
  }

  // private static get layout(): BindingsLayout {
  //   return bindingsLayout.AccountUpdate
  //     .get('body', 'update', 'permissions')
  //     .unwrapOption()
  //     .inner
  //     .get('setVerificationKey')
  //     .unwrapObject();
  // }

  static sizeInFields(): number {
    return Bindings.Leaves.AuthRequired.sizeInFields();
  }

  static empty(): VerificationKeyAuthorizationLevel {
    return new VerificationKeyAuthorizationLevel(AuthorizationLevel.empty(), UInt32.zero);
  }

  static toFields(_x: VerificationKeyAuthorizationLevel): Field[] {
    throw new Error('TODO');
    // return Bindings.AuthRequired.toFields(x);
  }

  static toAuxiliary(_x?: VerificationKeyAuthorizationLevel): any[] {
    throw new Error('TODO');
    // return Bindings.AuthRequired.toAuxiliary(x);
  }

  static fromFields(_fields: Field[], _aux: any[]): VerificationKeyAuthorizationLevel {
    throw new Error('TODO');
    /*
    BindingsLayout.Object.fromFields(fields, aux)

    const schema = {
      auth: AuthorizationLevel.fromFields,
      txnVersion: UInt32.fromFields,
    };

    return new VerificationKeyAuthorizationLevel(BindingsLayout.fromFields(VerificationKeyAuthorizationLevel.bindingsLayout, this, ));
    */
  }

  static check(_x: VerificationKeyAuthorizationLevel) {
    throw new Error('TODO');
    // Bindings.AuthRequired.check(x);
  }

  static toValue(x: VerificationKeyAuthorizationLevel): VerificationKeyAuthorizationLevel {
    return x;
  }

  static fromValue(x: VerificationKeyAuthorizationLevel): VerificationKeyAuthorizationLevel {
    return x;
  }

  static from(
    x: AuthorizationLevelIdentifier | AuthorizationLevel | VerificationKeyAuthorizationLevel
  ): VerificationKeyAuthorizationLevel {
    if (x instanceof VerificationKeyAuthorizationLevel) {
      return x;
    } else {
      return new VerificationKeyAuthorizationLevel(AuthorizationLevel.from(x));
    }
  }
}

export interface AccountUpdateAuthorization {
  proof: string | null;
  signature: string | null;
}

export type AccountUpdateAuthorizationKindIdentifier =
  | 'None'
  | 'Signature'
  | 'Proof'
  | 'SignatureAndProof';

export class AccountUpdateAuthorizationKind {
  isSigned: Bool;
  isProved: Bool;

  constructor({ isSigned, isProved }: { isSigned: Bool; isProved: Bool }) {
    this.isSigned = isSigned;
    this.isProved = isProved;
  }

  // NB: only safe to call in prover contexts
  // TODO: we should replace this with a circuit-safe representation using ZkEnum
  identifier(): AccountUpdateAuthorizationKindIdentifier {
    if (this.isSigned.toBoolean()) {
      if (this.isProved.toBoolean()) {
        return 'SignatureAndProof';
      } else {
        return 'Signature';
      }
    } else {
      if (this.isProved.toBoolean()) {
        return 'Proof';
      } else {
        return 'None';
      }
    }
  }

  static from(
    x: AccountUpdateAuthorizationKindIdentifier | AccountUpdateAuthorizationKind
  ): AccountUpdateAuthorizationKind {
    if (x instanceof AccountUpdateAuthorizationKind) return x;

    switch (x) {
      case 'None':
        return AccountUpdateAuthorizationKind.None();
      case 'Signature':
        return AccountUpdateAuthorizationKind.Signature();
      case 'Proof':
        return AccountUpdateAuthorizationKind.Proof();
      case 'SignatureAndProof':
        return AccountUpdateAuthorizationKind.SignatureAndProof();
    }
  }

  static None(): AccountUpdateAuthorizationKind {
    return new AccountUpdateAuthorizationKind({
      isSigned: new Bool(false),
      isProved: new Bool(false),
    });
  }

  static Signature(): AccountUpdateAuthorizationKind {
    return new AccountUpdateAuthorizationKind({
      isSigned: new Bool(true),
      isProved: new Bool(false),
    });
  }

  static Proof(): AccountUpdateAuthorizationKind {
    return new AccountUpdateAuthorizationKind({
      isSigned: new Bool(false),
      isProved: new Bool(true),
    });
  }

  static SignatureAndProof(): AccountUpdateAuthorizationKind {
    return new AccountUpdateAuthorizationKind({
      isSigned: new Bool(true),
      isProved: new Bool(true),
    });
  }
}

export class AccountUpdateAuthorizationKindWithZkappContext {
  isSigned: Bool;
  isProved: Bool;
  verificationKeyHash: Field;

  constructor(kind: AccountUpdateAuthorizationKind, verificationKeyHash: Field) {
    this.isSigned = kind.isSigned;
    this.isProved = kind.isProved;
    this.verificationKeyHash = verificationKeyHash;
  }

  toJSON(): any {
    Bindings.Layout.AuthorizationKindStructured.toJSON(this);
  }
}

export type AccountUpdateAuthorizationEnvironment = ZkappCommandAuthorizationEnvironment & {
  accountUpdateForestCommitment: bigint; // TODO: Field;
  fullTransactionCommitment?: bigint; // TODO: Field;
};

export interface ZkappFeePaymentAuthorizationEnvironment {
  networkId: NetworkId;
  privateKey: PrivateKey;
  fullTransactionCommitment: bigint; // TODO: Field
}

export interface ZkappCommandAuthorizationEnvironment {
  networkId: NetworkId;
  getPrivateKey(publicKey: PublicKey): Promise<PrivateKey>;
}
