import {
  AuthorizationLevel,
  AuthorizationLevelIdentifier,
  VerificationKeyAuthorizationLevel,
} from './authorization.js';
import { Field } from '../../provable/field.js';
import { Provable } from '../../provable/provable.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/js-layout-v2.js';

// TODO: rename some of these to make them clearer (eg editActionState, timing)
// TODO: consider only allowing the identifiers to be specified to some special Permissions.constant function (to avoid people breaking the DSL pattern accidentally)
export type PermissionsDescription = {
  editState: AuthorizationLevelIdentifier | AuthorizationLevel;
  access: AuthorizationLevelIdentifier | AuthorizationLevel;
  send: AuthorizationLevelIdentifier | AuthorizationLevel;
  receive: AuthorizationLevelIdentifier | AuthorizationLevel;
  setDelegate: AuthorizationLevelIdentifier | AuthorizationLevel;
  setPermissions: AuthorizationLevelIdentifier | AuthorizationLevel;
  // IMPORTANT TODO: we should be using special auth level identifiers here
  setVerificationKey:
    | AuthorizationLevelIdentifier
    | AuthorizationLevel
    | VerificationKeyAuthorizationLevel;
  setZkappUri: AuthorizationLevelIdentifier | AuthorizationLevel;
  editActionState: AuthorizationLevelIdentifier | AuthorizationLevel;
  setTokenSymbol: AuthorizationLevelIdentifier | AuthorizationLevel;
  incrementNonce: AuthorizationLevelIdentifier | AuthorizationLevel;
  setVotingFor: AuthorizationLevelIdentifier | AuthorizationLevel;
  setTiming: AuthorizationLevelIdentifier | AuthorizationLevel;
};

export class Permissions {
  editState: AuthorizationLevel;
  access: AuthorizationLevel;
  send: AuthorizationLevel;
  receive: AuthorizationLevel;
  setDelegate: AuthorizationLevel;
  setPermissions: AuthorizationLevel;
  setVerificationKey: VerificationKeyAuthorizationLevel;
  setZkappUri: AuthorizationLevel;
  editActionState: AuthorizationLevel;
  setTokenSymbol: AuthorizationLevel;
  incrementNonce: AuthorizationLevel;
  setVotingFor: AuthorizationLevel;
  setTiming: AuthorizationLevel;

  constructor(descr: PermissionsDescription) {
    this.editState = AuthorizationLevel.from(descr.editState);
    this.access = AuthorizationLevel.from(descr.access);
    this.send = AuthorizationLevel.from(descr.send);
    this.receive = AuthorizationLevel.from(descr.receive);
    this.setDelegate = AuthorizationLevel.from(descr.setDelegate);
    this.setPermissions = AuthorizationLevel.from(descr.setPermissions);
    this.setVerificationKey = VerificationKeyAuthorizationLevel.from(
      descr.setVerificationKey
    );
    this.setZkappUri = AuthorizationLevel.from(descr.setZkappUri);
    this.editActionState = AuthorizationLevel.from(descr.editActionState);
    this.setTokenSymbol = AuthorizationLevel.from(descr.setTokenSymbol);
    this.incrementNonce = AuthorizationLevel.from(descr.incrementNonce);
    this.setVotingFor = AuthorizationLevel.from(descr.setVotingFor);
    this.setTiming = AuthorizationLevel.from(descr.setTiming);
  }

  toJSON(): any {
    return Permissions.toJSON(this);
  }

  static defaults(): Permissions {
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

  static empty(): Permissions {
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

  static sizeInFields(): number {
    return BindingsLayout.Permissions.sizeInFields();
  }

  static toJSON(p: Permissions): any {
    return BindingsLayout.Permissions.toJSON(p);
  }

  static toFields(p: Permissions): Field[] {
    return BindingsLayout.Permissions.toFields(p);
  }

  static fromFields(fields: Field[], aux: any[]): Permissions {
    return Permissions.fromInternalRepr(
      BindingsLayout.Permissions.fromFields(fields, aux)
    );
  }

  static toAuxiliary(x?: Permissions): any[] {
    return BindingsLayout.Permissions.toAuxiliary(x);
  }

  static toValue(x: Permissions): Permissions {
    return x;
  }

  static fromValue(x: Permissions): Permissions {
    return x;
  }

  static check(_x: Permissions) {
    throw new Error('TODO');
  }

  static fromInternalRepr(x: BindingsLayout.Permissions): Permissions {
    return new Permissions({
      editState: new AuthorizationLevel(x.editState),
      send: new AuthorizationLevel(x.send),
      receive: new AuthorizationLevel(x.receive),
      setDelegate: new AuthorizationLevel(x.setDelegate),
      setPermissions: new AuthorizationLevel(x.setPermissions),
      setVerificationKey: new VerificationKeyAuthorizationLevel(
        new AuthorizationLevel(x.setVerificationKey.auth),
        x.setVerificationKey.txnVersion
      ),
      setZkappUri: new AuthorizationLevel(x.setZkappUri),
      editActionState: new AuthorizationLevel(x.editActionState),
      setTokenSymbol: new AuthorizationLevel(x.setTokenSymbol),
      incrementNonce: new AuthorizationLevel(x.incrementNonce),
      setVotingFor: new AuthorizationLevel(x.setVotingFor),
      setTiming: new AuthorizationLevel(x.setTiming),
      access: new AuthorizationLevel(x.access),
    });
  }

  static from(x: PermissionsDescription | Permissions): Permissions {
    return x instanceof Permissions ? x : new Permissions(x);
  }
}

AuthorizationLevel satisfies Provable<AuthorizationLevel>;
VerificationKeyAuthorizationLevel satisfies Provable<VerificationKeyAuthorizationLevel>;
Permissions satisfies Provable<Permissions>;
