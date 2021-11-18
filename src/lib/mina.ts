// This is for an account where any of a list of public keys can update the state

import { prop, CircuitValue } from './circuit_value';
import { Field, Bool } from '../snarky';
import { UInt32, UInt64 } from './int';
import { PublicKey } from './signature';


class SetOrKeep<_A> extends CircuitValue {}

export interface TransactionId {
  wait(): Promise<void>
}

export interface Transaction {
  send(): TransactionId
}

interface SnappAccount {
  app_state: Array<Field>,
}

interface Account {
  balance: UInt64,
  nonce: UInt32,
  snapp: SnappAccount,
}

interface Mina {
  transaction(f : () => void): Transaction,
  currentSlot(): UInt32,
  getAccount(publicKey: PublicKey): Account,
}

const Local: Mina = (() => {
  const msPerSlot = 3 * 60 * 1000;
  const startTime = (new Date()).valueOf();

  const currentSlot = () =>
    UInt32.fromNumber(
      Math.ceil(((new Date()).valueOf() - startTime) / msPerSlot));
    
  const getAccount = (pk: PublicKey) => {
    throw 'todo'
  };

  const transaction = (f: () => void) => {
    throw 'todo'
  };

  return {
    currentSlot,
    getAccount,
    transaction
  }
})();

let activeInstance: Mina = Local;

export function transaction(f : () => void): Transaction {
  return activeInstance.transaction(f)
}

export function sendPendingTransactions(): TransactionId {
  throw 'todo';
}

export function currentSlot(): UInt32 {
  return activeInstance.currentSlot();
}

export function getBalance(pubkey: PublicKey): UInt64 {
  return activeInstance.getAccount(pubkey).balance;
}

export function getAccount(pubkey: PublicKey): Account {
  return activeInstance.getAccount(pubkey);
}

/*
export class OrIgnore<A> extends CircuitValue {
  @prop value: A;
  @prop shouldIgnore: Field;

  assertEqual(x: A) {
    this.shouldIgnore.assertEqual(false);
    this.shouldIgnore.fillValue(() => false);
    Circuit.assertEqual(this.value, x);
    (this.value as any).assertEqual(x);
  }

  ignore() {
    this.shouldIgnore.assertEquals(true);
    this.shouldIgnore.fillValue(() => true);
  }

  constructor(value: A, ignore: Field) {
    super();
    this.value = value;
    this.shouldIgnore = ignore;
  }
}
*/

/*
function Signed_<T extends Constructor<T>>(T : T) {
  console.log(T);
  return class SignedT {
    magnitude: T;
    sign: Bool;
    constructor(sign: Bool, magnitude: T) {
      this.sign = sign;
      this.magnitude = magnitude;
    }
  } ;
}

const SignedBool_ = Signed_(Bool);
type SignedBool = InstanceType<typeof Signed>;
const x : SignedBool = new SignedBool_(new Bool(true), new Bool(true));

console.log(x);
*/
/*
class Signed<A> extends CircuitValue {
  @prop sign: Bool;
  @prop magnitude: A;

  constructor(sign: Bool, magnitude: A) {
    super();
    this.sign = sign;
    this.magnitude = magnitude;
  }
}

class Delta<A> extends CircuitValue {
  @prop value: Signed<A>;

  constructor(value: Signed<A>) {
    super();
    this.value = value;
  }

  addInPlace(this: this, x: A) {
    const prev = this.value;
    this.value = (prev as any).add(x);
  }

  subInPlace(this: this, x: A) {
    const prev = this.value;
    this.value = (prev as any).sub(x);
  }
}

class TokenId extends CircuitValue {}

class Predicate extends CircuitValue {}

class Party extends CircuitValue {
  @prop publicKey: PublicKey;
  @prop state: Array<SetOrKeep<Field>>;
  @prop delegate: SetOrKeep<PublicKey>;
  @prop verificationKey: SetOrKeep<VerificationKey>;
  @prop permissions: SetOrKeep<Permissions>;
  @prop tokenId: TokenId;
  @prop balance: Delta<Amount>;
  @prop predicate: Predicate;

  constructor(
    publicKey: PublicKey,
    state: Array<SetOrKeep<Field>>,
    delegate: SetOrKeep<PublicKey>,
    verificationKey: SetOrKeep<VerificationKey>,
    permissions: SetOrKeep<Permissions>,
    tokenId: TokenId,
    balance: Delta<Amount>,
    predicate: Predicate
  ) {
    super();
    this.publicKey = publicKey;
    this.state = state;
    this.delegate = delegate;
    this.verificationKey = verificationKey;
    this.permissions = permissions;
    this.tokenId = tokenId;
    this.balance = balance;
    this.predicate = predicate;
  }
}

class Parties {
  get(this: this, _index: number): Party {
    throw 'unimplemented';
  }
}

class Transaction {
  parties: Parties = undefined as any;

  commitment(): Field {
    throw 'unimplemented';
  }

  self(): Party {
    throw 'unimplemented';
  }
}

export class UInt32 extends CircuitValue {
  sub(this: UInt32, _other: UInt32): UInt32 {
    throw 'unimplemented';
  }
}

export type Amount = UInt32;
export type Nonce = UInt32;

export class MerkleProof extends CircuitValue {}

export class MerkleCollection<T extends CircuitValue> {
  get(_p: MerkleProof): T {
    throw 'unimplemented';
  }

  constructor(xs: () => T[]) {
    console.log(xs);
  }
}

export enum Permission {
  NoAuthRequired,
  Signature,
  Proof,
}

export type Permissions = {
  receive: Permission;
  send: Permission;
  setDelegate: Permission;
  modifyState: Permission;
};

export class StateSlot extends CircuitValue {
  @prop isSet: Field;
  @prop value: Field;

  set(this: this, x: Field) {
    (this.isSet as any).fillValue(true);
    (this.value as any).fillValue(() => (x as any)._value());
    (this.value as any).assertEqual(x);
  }

  constructor(isSet: Field, value: Field) {
    super();
    this.isSet = isSet;
    this.value = value;
  }
}

export class VerificationKey extends CircuitValue {}

export abstract class Snapp {
  state: StateSlot[] = [];

  permissions: Permissions = {
    receive: Permission.Proof,
    send: Permission.Proof,
    setDelegate: Permission.Proof,
    modifyState: Permission.Proof,
  };

  self(): VerificationKey {
    throw 'unimplemented';
  }

  transaction(): Transaction {
    throw 'unimplemented';
  }
}

export function method(this: any, target: any, key: string) {
  // TODO: init method is special
  console.log(this, target, key);
}*/
