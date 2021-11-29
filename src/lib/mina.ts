// This is for an account where any of a list of public keys can update the state

import { prop, CircuitValue } from './circuit_value';
import { Circuit, Ledger, Field, Bool, AccountPredicate, FullAccountPredicate, FeePayerParty, Parties, PartyBody as SnarkyBody, Party as SnarkyParty } from '../snarky';
import { Int64, UInt32, UInt64 } from './int';
import { PrivateKey, PublicKey } from './signature';
import { Body, ClosedInterval, DefaultTokenId, EpochDataPredicate, Party, ProtocolStatePredicate, Update } from './party';


class SetOrKeep<_A> extends CircuitValue {}

export interface TransactionId {
  wait(): Promise<void>
}

export interface Transaction {
  send(): TransactionId
}

interface SnappAccount {
  appState: Array<Field>,
}

interface Account {
  balance: UInt64,
  nonce: UInt32,
  snapp: SnappAccount,
}

export let nextTransactionId : { value: number } = { value: 0 };

type PartyPredicate =
  | UInt32
  | FullAccountPredicate

export let currentTransaction : {
  sender: PrivateKey,
  parties: Array<Party<PartyPredicate>>,
  nextPartyIndex: number,
  protocolState: ProtocolStatePredicate,
} | undefined = undefined;

interface Mina {
  transaction(sender: PrivateKey, f : () => void | Promise<void>): Transaction,
  currentSlot(): UInt32,
  getAccount(publicKey: PublicKey): Promise<Account>,
}

export const LocalBlockchain = () => {
  const msPerSlot = 3 * 60 * 1000;
  const startTime = (new Date()).valueOf();
  
  console.log('hi', 0)
  const ledger = Ledger.create([]);

  console.log('hi', 1)
  const currentSlot = () =>
    UInt32.fromNumber(
      Math.ceil(((new Date()).valueOf() - startTime) / msPerSlot));
      
  const addAccount = (pk: PublicKey, balance: number) => {
  console.log('hi', 2)
    ledger.addAccount(pk, balance);
  console.log('hi', 33)
  };

  const getAccount = (pk: PublicKey) : Promise<Account> => {
    const r = ledger.getAccount(pk);
    if (r == null) {
      throw new Error(`getAccount: Could not find account for ${JSON.stringify(pk.toJSON())}`);
    } else {
      console.log('res r', r);
      console.log('balance is', r.balance.value);
      const a = {
        balance: new UInt64(r.balance.value),
        nonce: new UInt32(r.nonce.value),
        snapp: r.snapp,
      };
      return new Promise((r) => r(a));
    }
  };

  const transaction = (sender: PrivateKey, f: () => void | Promise<void>): Transaction => {
    if (currentTransaction !== undefined) {
      throw new Error("Cannot start new transaction within another transaction");
    }
    
    function epochData(d: EpochDataPredicate) {
      return {
        ledger: {
          hash: d.ledger.hash_,
          totalCurrency: d.ledger.totalCurrency
        },
        seed: d.seed_,
        startCheckpoint: d.startCheckpoint_,
        lockCheckpoint: d.lockCheckpoint_,
        epochLength: d.epochLength
      }
    }

    const body = (b: Body): SnarkyBody => {
      return {
        publicKey: b.publicKey,
        update: b.update,
        tokenId: b.tokenId,
        delta: b.delta,
        // TODO: events
        events: [],
        sequenceEvents: [],
        // TODO: calldata
        callData: Field.zero,
        // TODO
        depth: 0,
      }
    };

    currentTransaction = {
      sender,
      parties: [],
      nextPartyIndex: 0,
      protocolState: ProtocolStatePredicate.ignoreAll()
    }

    const result = Circuit.runAndCheck(() => {
      const res = f ();
      if (res instanceof Promise) {
        return res.then(() => {
          return () => {}
        })
      } else {
        const r: Promise<() => void> =
          new Promise((k) => k(() => {}));
        return r;
      }
    });

    const senderPubkey = sender.toPublicKey();
    const txn = result.then(() => getAccount(senderPubkey)).then(senderAccount => {
      if (currentTransaction === undefined) { throw new Error("Transaction is undefined"); }

      const otherParties: Array<SnarkyParty> =
        currentTransaction.parties.map((p) => {
          let predicate : AccountPredicate;
          if (p.predicate instanceof UInt32) {
            predicate = { type: 'nonce', value: p.predicate };
          } else {
            predicate = { type: 'full', value: p.predicate };
          }

          return {
            body: body(p.body),
            predicate
          }
        });

      const feePayer : FeePayerParty = {
        body: body(Body.keepAll(senderPubkey)),
        predicate: senderAccount.nonce,
      }

      const ps = currentTransaction.protocolState;

      const txn : Parties = {
        protocolState: {
          snarkedLedgerHash:
            ps.snarkedLedgerHash_,
          snarkedNextAvailableToken: ps.snarkedNextAvailableToken,
          timestamp: ps.timestamp,
          blockchainLength: ps.blockchainLength,
          minWindowDensity: ps.minWindowDensity,
          lastVrfOutput: ps.lastVrfOutput_,
          totalCurrency: ps.totalCurrency,
          globalSlotSinceGenesis: ps.globalSlotSinceGenesis,
          globalSlotSinceHardFork: ps.globalSlotSinceHardFork,
          nextEpochData: epochData(ps.nextEpochData),
          stakingEpochData: epochData(ps.stakingEpochData)
        },
        otherParties,
        feePayer,
      };
      
      console.log(JSON.stringify(txn));

      nextTransactionId.value += 1;
      currentTransaction = undefined;
      return txn
    });

    console.log('transaction', 10)
    return {
      send: () => {
        const res = txn.then(txn => ledger.applyPartiesTransaction(txn));
  console.log('transacion', 11)
  /*
        console.log(txn);
        console.log(JSON.stringify(txn)) */
  console.log('transacion', 12)
        return {
          wait:() => res
        }
      }
    }
  };

  return {
    currentSlot,
    getAccount,
    transaction,
    addAccount,
  }
};

let activeInstance: Mina = {
  currentSlot: (() => { throw new Error('must call Mina.setActiveInstance first')}),
  getAccount: (() => { throw new Error('must call Mina.setActiveInstance first')}),
  transaction: (() => { throw new Error('must call Mina.setActiveInstance first')}),
};

export function setActiveInstance(m: Mina) {
  activeInstance = m;
}

export function transaction(sender: PrivateKey, f : () => void | Promise<void>): Transaction {
  return activeInstance.transaction(sender, f)
}

export function sendPendingTransactions(): TransactionId {
  throw 'sendpending';
}

export function currentSlot(): UInt32 {
  return activeInstance.currentSlot();
}

export function getBalance(pubkey: PublicKey): Promise<UInt64> {
  return activeInstance.getAccount(pubkey).then((a) => a.balance);
}

export function getAccount(pubkey: PublicKey): Promise<Account> {
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
