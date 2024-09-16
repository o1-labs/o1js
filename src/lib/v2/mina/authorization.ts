import { CURRENT_TRANSACTION_VERSION } from './core.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt32 } from '../../provable/int.js';
import * as BindingsLeaves from '../../../bindings/mina-transaction/v2/leaves.js';

export type AuthorizationLevelIdentifier = BindingsLeaves.AuthRequiredIdentifier;

export class AuthorizationLevel {
  // TODO: it would be nice if these could be private, but then the subtyping doesn't work... maybe we can do a trick here with object splats?
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;

  constructor({constant, signatureNecessary, signatureSufficient}: {
    constant: Bool,
    signatureNecessary: Bool,
    signatureSufficient: Bool
  }) {
    this.constant = constant;
    this.signatureNecessary = signatureNecessary;
    this.signatureSufficient = signatureSufficient;
  }

  toInternalRepr(): BindingsLeaves.AuthRequired {
    return this;
  }

  static fromInternalRepr(x: BindingsLeaves.AuthRequired): AuthorizationLevel {
    return new AuthorizationLevel(x);
  }

  toJSON(): any {
    return AuthorizationLevel.toJSON(this)
  }

  toFields(): Field[] {
    return AuthorizationLevel.toFields(this);
  }

  isImpossible(): Bool {
    return BindingsLeaves.AuthRequired.isImpossible(this);
  }

  isNone(): Bool {
    return BindingsLeaves.AuthRequired.isNone(this);
  }

  isProof(): Bool {
    return BindingsLeaves.AuthRequired.isProof(this);
  }

  isSignature(): Bool {
    return BindingsLeaves.AuthRequired.isSignature(this);
  }

  isProofOrSignature(): Bool {
    return BindingsLeaves.AuthRequired.isEither(this);
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
    return BindingsLeaves.AuthRequired.sizeInFields();
  }

  static empty(): AuthorizationLevel {
    return new AuthorizationLevel(BindingsLeaves.AuthRequired.empty());
  }

  static toJSON(x: AuthorizationLevel): any {
    BindingsLeaves.AuthRequired.toJSON(x);
  }

  static toFields(x: AuthorizationLevel): Field[] {
    return BindingsLeaves.AuthRequired.toFields(x);
  }

  static toAuxiliary(x?: AuthorizationLevel): any[] {
    return BindingsLeaves.AuthRequired.toAuxiliary(x);
  }

  static fromFields(fields: Field[], aux: any[]): AuthorizationLevel {
    return new AuthorizationLevel(BindingsLeaves.AuthRequired.fromFields(fields, aux));
  }

  static check(x: AuthorizationLevel) {
    BindingsLeaves.AuthRequired.check(x);
  }

  static toValue(x: AuthorizationLevel): AuthorizationLevel {
    return x;
  }

  static fromValue(x: AuthorizationLevel): AuthorizationLevel {
    return x;
  }

  static from(x: AuthorizationLevelIdentifier | AuthorizationLevel): AuthorizationLevel {
    switch(x) {
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

  constructor(auth: AuthorizationLevel, txnVersion: UInt32 = CURRENT_TRANSACTION_VERSION) {
    this.auth = auth;
    this.txnVersion = txnVersion;
  }

  toJSON(): {auth: AuthorizationLevelIdentifier, txnVersion: string} {
    return {
      auth: this.auth.toJSON(),
      txnVersion: this.txnVersion.toString()
    }
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
    return BindingsLeaves.AuthRequired.sizeInFields();
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

  static from(x: AuthorizationLevelIdentifier | AuthorizationLevel | VerificationKeyAuthorizationLevel): VerificationKeyAuthorizationLevel {
    if(x instanceof VerificationKeyAuthorizationLevel) {
      return x;
    } else {
      return new VerificationKeyAuthorizationLevel(AuthorizationLevel.from(x));
    }
  }
}

