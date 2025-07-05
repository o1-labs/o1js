import { Bool } from '../../provable/bool.js';
import { UInt32 } from '../../provable/int.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';
import { protocolVersions } from '../../../bindings/crypto/constants.js';
export { AccountUpdateAuthorizationKind, AccountUpdateAuthorizationKindWithZkappContext, VerificationKeyAuthorizationLevel, };
export class AuthorizationLevel {
    constructor({ constant, signatureNecessary, signatureSufficient, }) {
        this.constant = constant;
        this.signatureNecessary = signatureNecessary;
        this.signatureSufficient = signatureSufficient;
    }
    toInternalRepr() {
        return this;
    }
    static fromInternalRepr(x) {
        return new AuthorizationLevel(x);
    }
    toJSON() {
        return AuthorizationLevel.toJSON(this);
    }
    toInput() {
        return AuthorizationLevel.toInput(this);
    }
    toFields() {
        return AuthorizationLevel.toFields(this);
    }
    isImpossible() {
        return Bindings.Leaves.AuthRequired.isImpossible(this);
    }
    isNone() {
        return Bindings.Leaves.AuthRequired.isNone(this);
    }
    isProof() {
        return Bindings.Leaves.AuthRequired.isProof(this);
    }
    isSignature() {
        return Bindings.Leaves.AuthRequired.isSignature(this);
    }
    isProofOrSignature() {
        return Bindings.Leaves.AuthRequired.isEither(this);
    }
    requiresProof() {
        return this.isProof().or(this.isProofOrSignature());
    }
    requiresSignature() {
        return this.isSignature().or(this.isProofOrSignature());
    }
    isSatisfied(authKind) {
        return Bool.allTrue([
            this.requiresProof().implies(authKind.isProved),
            this.requiresSignature().implies(authKind.isSigned),
        ]);
    }
    // TODO: property test that this is the inverse of `from` identifier
    identifier() {
        if (this.isImpossible().toBoolean()) {
            return 'Impossible';
        }
        else if (this.isNone().toBoolean()) {
            return 'None';
        }
        else if (this.isProof().toBoolean()) {
            return 'Proof';
        }
        else if (this.isSignature().toBoolean()) {
            return 'Signature';
        }
        else if (this.isProofOrSignature().toBoolean()) {
            return 'Either';
        }
        else {
            throw new Error('internal error: invalid authorization level');
        }
    }
    static Impossible() {
        return new AuthorizationLevel({
            constant: new Bool(true),
            signatureNecessary: new Bool(true),
            signatureSufficient: new Bool(false),
        });
    }
    static None() {
        return new AuthorizationLevel({
            constant: new Bool(true),
            signatureNecessary: new Bool(false),
            signatureSufficient: new Bool(true),
        });
    }
    static Proof() {
        return new AuthorizationLevel({
            constant: new Bool(false),
            signatureNecessary: new Bool(false),
            signatureSufficient: new Bool(false),
        });
    }
    static Signature() {
        return new AuthorizationLevel({
            constant: new Bool(false),
            signatureNecessary: new Bool(true),
            signatureSufficient: new Bool(true),
        });
    }
    static ProofOrSignature() {
        return new AuthorizationLevel({
            constant: new Bool(false),
            signatureNecessary: new Bool(false),
            signatureSufficient: new Bool(true),
        });
    }
    // TODO: ProofAndSignature
    static sizeInFields() {
        return Bindings.Leaves.AuthRequired.sizeInFields();
    }
    static empty() {
        return new AuthorizationLevel(Bindings.Leaves.AuthRequired.empty());
    }
    static toJSON(x) {
        return Bindings.Leaves.AuthRequired.toJSON(x);
    }
    static toInput(x) {
        return Bindings.Leaves.AuthRequired.toInput(x);
    }
    static toFields(x) {
        return Bindings.Leaves.AuthRequired.toFields(x);
    }
    static toAuxiliary(x) {
        return Bindings.Leaves.AuthRequired.toAuxiliary(x);
    }
    static fromFields(fields, aux) {
        return new AuthorizationLevel(Bindings.Leaves.AuthRequired.fromFields(fields, aux));
    }
    static check(x) {
        Bindings.Leaves.AuthRequired.check(x);
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static from(x) {
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
class VerificationKeyAuthorizationLevel {
    constructor(auth, txnVersion = UInt32.from(protocolVersions.txnVersion)) {
        this.auth = auth;
        this.txnVersion = txnVersion;
    }
    toJSON() {
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
    static sizeInFields() {
        return Bindings.Leaves.AuthRequired.sizeInFields();
    }
    static empty() {
        return new VerificationKeyAuthorizationLevel(AuthorizationLevel.empty(), UInt32.zero);
    }
    static toFields(_x) {
        throw new Error('TODO');
        // return Bindings.AuthRequired.toFields(x);
    }
    static toAuxiliary(_x) {
        throw new Error('TODO');
        // return Bindings.AuthRequired.toAuxiliary(x);
    }
    static fromFields(_fields, _aux) {
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
    static check(_x) {
        throw new Error('TODO');
        // Bindings.AuthRequired.check(x);
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static from(x) {
        if (x instanceof VerificationKeyAuthorizationLevel) {
            return x;
        }
        else {
            return new VerificationKeyAuthorizationLevel(AuthorizationLevel.from(x));
        }
    }
}
class AccountUpdateAuthorizationKind {
    constructor({ isSigned, isProved }) {
        this.isSigned = isSigned;
        this.isProved = isProved;
    }
    // NB: only safe to call in prover contexts
    // TODO: we should replace this with a circuit-safe representation using ZkEnum
    identifier() {
        if (this.isSigned.toBoolean()) {
            if (this.isProved.toBoolean()) {
                return 'SignatureAndProof';
            }
            else {
                return 'Signature';
            }
        }
        else {
            if (this.isProved.toBoolean()) {
                return 'Proof';
            }
            else {
                return 'None';
            }
        }
    }
    static from(x) {
        if (x instanceof AccountUpdateAuthorizationKind)
            return x;
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
    static None() {
        return new AccountUpdateAuthorizationKind({
            isSigned: new Bool(false),
            isProved: new Bool(false),
        });
    }
    static Signature() {
        return new AccountUpdateAuthorizationKind({
            isSigned: new Bool(true),
            isProved: new Bool(false),
        });
    }
    static Proof() {
        return new AccountUpdateAuthorizationKind({
            isSigned: new Bool(false),
            isProved: new Bool(true),
        });
    }
    static SignatureAndProof() {
        return new AccountUpdateAuthorizationKind({
            isSigned: new Bool(true),
            isProved: new Bool(true),
        });
    }
}
class AccountUpdateAuthorizationKindWithZkappContext {
    constructor(kind, verificationKeyHash) {
        this.isSigned = kind.isSigned;
        this.isProved = kind.isProved;
        this.verificationKeyHash = verificationKeyHash;
    }
    toJSON() {
        Bindings.Layout.AuthorizationKindStructured.toJSON(this);
    }
}
