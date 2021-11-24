import { Field, Poseidon, isReady, AsFieldElements } from '../snarky';
import { CircuitValue } from './circuit_value';
import { AccountPredicate, ProtocolStatePredicate, Body, State, Party } from './party';
import { PublicKey } from './signature';
import * as Mina from './mina';
import { FullAccountPredicate } from 'src';

export function state<A>(ty: AsFieldElements<A>) {
  return function (
    this: any,
    target: any,
    key: string,
    _descriptor?: PropertyDescriptor): any {
      const fieldType = Reflect.getMetadata('design:type', target, key);
      if (fieldType != State) {
        throw new Error('@state fields must have type State<A> for some type A');
      }

      if (target._states === undefined || target._states === null) {
        target._states = [];
      }

      const i = target
      target._states.push([key, ty]);
    }
}

export function method(
  target: any,
  propertyName: string,
  _descriptor?: PropertyDescriptor
): any {}
export function init(
  target: any,
  propertyName: string,
  _descriptor?: PropertyDescriptor
): any {}

type ExecutionState = {
  transactionId: number,
  partyIndex: number,
  body: Body,
  predicate: AccountPredicate,
  protocolStatePredicate: ProtocolStatePredicate,
};

export class SmartContract {
  // protocolState: ProtocolStatePredicate;
  address: PublicKey;

  state: Array<State<Field>>;

  // private _self: { body: Body, predicate: AccountPredicate } | undefined;
  
  private _executionState: ExecutionState | undefined;

  constructor(address: PublicKey) {
    this.address = address;
    // this.self = null as unknown as Body;
    this.state = [];
  }
  
  private executionState(): ExecutionState {
    if (this._executionState !== undefined) {
      return this._executionState;
    } else {
      if (Mina.currentTransaction === undefined) {
        throw new Error("Cannot execute outside of a Mina.transaction() block.");
      } else {
        const id = Mina.nextTransactionId.value++;
        const index = Mina.currentTransaction.nextPartyIndex++;
        const body = Body.keepAll(this.address);
        const predicate = AccountPredicate.ignoreAll();
        const party: Party<FullAccountPredicate> = { body, predicate };
        Mina.currentTransaction.parties.push(party);

        const s = {
          transactionId: id,
          partyIndex: index,
          body,
          predicate,
          protocolStatePredicate: Mina.currentTransaction.protocolState,
        };
        this._executionState = s;
        return s;
      }
    }
  }
  
  get protocolState(): ProtocolStatePredicate {
    return this.executionState().protocolStatePredicate;
  }

  get self(): Body {
    return this.executionState().body;
  }

  static fromAddress(address: PublicKey): SmartContract {
    throw 'fromaddress';
  }

  party(i: number): Body {
    throw 'party';
  }

  transactionHash(): Field {
    throw 'txn hash';
  }

  emitEvent<T extends CircuitValue>(x: T): void {
    // TODO: Get the current party object, pull out the events field, and
    // hash this together with what's there
    Poseidon.hash(x.toFieldElements());
  }
}
