"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permissions = void 0;
const authorization_js_1 = require("./authorization.js");
const BindingsLayout = require("../../../bindings/mina-transaction/gen/v2/js-layout.js");
class Permissions {
    editState;
    access;
    send;
    receive;
    setDelegate;
    setPermissions;
    setVerificationKey;
    setZkappUri;
    editActionState;
    setTokenSymbol;
    incrementNonce;
    setVotingFor;
    setTiming;
    constructor(descr) {
        this.editState = authorization_js_1.AuthorizationLevel.from(descr.editState);
        this.access = authorization_js_1.AuthorizationLevel.from(descr.access);
        this.send = authorization_js_1.AuthorizationLevel.from(descr.send);
        this.receive = authorization_js_1.AuthorizationLevel.from(descr.receive);
        this.setDelegate = authorization_js_1.AuthorizationLevel.from(descr.setDelegate);
        this.setPermissions = authorization_js_1.AuthorizationLevel.from(descr.setPermissions);
        this.setVerificationKey = authorization_js_1.VerificationKeyAuthorizationLevel.from(descr.setVerificationKey);
        this.setZkappUri = authorization_js_1.AuthorizationLevel.from(descr.setZkappUri);
        this.editActionState = authorization_js_1.AuthorizationLevel.from(descr.editActionState);
        this.setTokenSymbol = authorization_js_1.AuthorizationLevel.from(descr.setTokenSymbol);
        this.incrementNonce = authorization_js_1.AuthorizationLevel.from(descr.incrementNonce);
        this.setVotingFor = authorization_js_1.AuthorizationLevel.from(descr.setVotingFor);
        this.setTiming = authorization_js_1.AuthorizationLevel.from(descr.setTiming);
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
            editState: new authorization_js_1.AuthorizationLevel(x.editState),
            send: new authorization_js_1.AuthorizationLevel(x.send),
            receive: new authorization_js_1.AuthorizationLevel(x.receive),
            setDelegate: new authorization_js_1.AuthorizationLevel(x.setDelegate),
            setPermissions: new authorization_js_1.AuthorizationLevel(x.setPermissions),
            setVerificationKey: new authorization_js_1.VerificationKeyAuthorizationLevel(new authorization_js_1.AuthorizationLevel(x.setVerificationKey.auth), x.setVerificationKey.txnVersion),
            setZkappUri: new authorization_js_1.AuthorizationLevel(x.setZkappUri),
            editActionState: new authorization_js_1.AuthorizationLevel(x.editActionState),
            setTokenSymbol: new authorization_js_1.AuthorizationLevel(x.setTokenSymbol),
            incrementNonce: new authorization_js_1.AuthorizationLevel(x.incrementNonce),
            setVotingFor: new authorization_js_1.AuthorizationLevel(x.setVotingFor),
            setTiming: new authorization_js_1.AuthorizationLevel(x.setTiming),
            access: new authorization_js_1.AuthorizationLevel(x.access),
        });
    }
    static from(x) {
        return x instanceof Permissions ? x : new Permissions(x);
    }
}
exports.Permissions = Permissions;
authorization_js_1.AuthorizationLevel;
authorization_js_1.VerificationKeyAuthorizationLevel;
Permissions;
