import { AuthorizationLevel, VerificationKeyAuthorizationLevel, } from './authorization.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/v2/js-layout.js';
export class Permissions {
    constructor(descr) {
        this.editState = AuthorizationLevel.from(descr.editState);
        this.access = AuthorizationLevel.from(descr.access);
        this.send = AuthorizationLevel.from(descr.send);
        this.receive = AuthorizationLevel.from(descr.receive);
        this.setDelegate = AuthorizationLevel.from(descr.setDelegate);
        this.setPermissions = AuthorizationLevel.from(descr.setPermissions);
        this.setVerificationKey = VerificationKeyAuthorizationLevel.from(descr.setVerificationKey);
        this.setZkappUri = AuthorizationLevel.from(descr.setZkappUri);
        this.editActionState = AuthorizationLevel.from(descr.editActionState);
        this.setTokenSymbol = AuthorizationLevel.from(descr.setTokenSymbol);
        this.incrementNonce = AuthorizationLevel.from(descr.incrementNonce);
        this.setVotingFor = AuthorizationLevel.from(descr.setVotingFor);
        this.setTiming = AuthorizationLevel.from(descr.setTiming);
    }
    toJSON() {
        return Permissions.toJSON(this);
    }
    static defaults() {
        return new Permissions({
            editState: 'Signature',
            send: 'Signature',
            receive: 'None',
            setDelegate: 'Signature',
            setPermissions: 'Signature',
            setVerificationKey: 'Signature',
            setZkappUri: 'Signature',
            editActionState: 'Proof',
            setTokenSymbol: 'Signature',
            incrementNonce: 'Signature',
            setVotingFor: 'Signature',
            setTiming: 'Signature',
            access: 'None',
        });
    }
    static empty() {
        return new Permissions({
            editState: 'None',
            send: 'None',
            receive: 'None',
            setDelegate: 'None',
            setPermissions: 'None',
            setVerificationKey: 'None',
            setZkappUri: 'None',
            editActionState: 'None',
            setTokenSymbol: 'None',
            incrementNonce: 'None',
            setVotingFor: 'None',
            setTiming: 'None',
            access: 'None',
        });
    }
    // TODO: port these definitions
    // initial: (): Permissions => ({
    //   editState: Permission.signature(),
    //   send: Permission.signature(),
    //   receive: Permission.none(),
    //   setDelegate: Permission.signature(),
    //   setPermissions: Permission.signature(),
    //   setVerificationKey: {
    //     auth: Permission.signature(),
    //     txnVersion: TransactionVersion.current(),
    //   },
    //   setZkappUri: Permission.signature(),
    //   editActionState: Permission.signature(),
    //   setTokenSymbol: Permission.signature(),
    //   incrementNonce: Permission.signature(),
    //   setVotingFor: Permission.signature(),
    //   setTiming: Permission.signature(),
    //   access: Permission.none(),
    // }),
    // dummy: (): Permissions => ({
    //   editState: Permission.none(),
    //   send: Permission.none(),
    //   receive: Permission.none(),
    //   access: Permission.none(),
    //   setDelegate: Permission.none(),
    //   setPermissions: Permission.none(),
    //   setVerificationKey: {
    //     auth: Permission.signature(),
    //     txnVersion: TransactionVersion.current(),
    //   },
    //   setZkappUri: Permission.none(),
    //   editActionState: Permission.none(),
    //   setTokenSymbol: Permission.none(),
    //   incrementNonce: Permission.none(),
    //   setVotingFor: Permission.none(),
    //   setTiming: Permission.none(),
    // }),
    // allImpossible: (): Permissions => ({
    //   editState: Permission.impossible(),
    //   send: Permission.impossible(),
    //   receive: Permission.impossible(),
    //   access: Permission.impossible(),
    //   setDelegate: Permission.impossible(),
    //   setPermissions: Permission.impossible(),
    //   setVerificationKey: {
    //     auth: Permission.signature(),
    //     txnVersion: TransactionVersion.current(),
    //   },
    //   setZkappUri: Permission.impossible(),
    //   editActionState: Permission.impossible(),
    //   setTokenSymbol: Permission.impossible(),
    //   incrementNonce: Permission.impossible(),
    //   setVotingFor: Permission.impossible(),
    //   setTiming: Permission.impossible(),
    // }),
    static sizeInFields() {
        return BindingsLayout.Permissions.sizeInFields();
    }
    static toJSON(p) {
        return BindingsLayout.Permissions.toJSON(p);
    }
    static toFields(p) {
        return BindingsLayout.Permissions.toFields(p);
    }
    static fromFields(fields, aux) {
        return Permissions.fromInternalRepr(BindingsLayout.Permissions.fromFields(fields, aux));
    }
    static toAuxiliary(x) {
        return BindingsLayout.Permissions.toAuxiliary(x);
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static check(_x) {
        throw new Error('TODO');
    }
    static fromInternalRepr(x) {
        return new Permissions({
            editState: new AuthorizationLevel(x.editState),
            send: new AuthorizationLevel(x.send),
            receive: new AuthorizationLevel(x.receive),
            setDelegate: new AuthorizationLevel(x.setDelegate),
            setPermissions: new AuthorizationLevel(x.setPermissions),
            setVerificationKey: new VerificationKeyAuthorizationLevel(new AuthorizationLevel(x.setVerificationKey.auth), x.setVerificationKey.txnVersion),
            setZkappUri: new AuthorizationLevel(x.setZkappUri),
            editActionState: new AuthorizationLevel(x.editActionState),
            setTokenSymbol: new AuthorizationLevel(x.setTokenSymbol),
            incrementNonce: new AuthorizationLevel(x.incrementNonce),
            setVotingFor: new AuthorizationLevel(x.setVotingFor),
            setTiming: new AuthorizationLevel(x.setTiming),
            access: new AuthorizationLevel(x.access),
        });
    }
    static from(x) {
        return x instanceof Permissions ? x : new Permissions(x);
    }
}
AuthorizationLevel;
VerificationKeyAuthorizationLevel;
Permissions;
