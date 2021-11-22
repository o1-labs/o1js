import { AsFieldElements } from '..';
import { Field, Poseidon } from '../snarky';
import { CircuitValue } from './circuit_value';
import { ProtocolStatePredicate, Body, State } from './party';
import { PublicKey } from './signature';

export function state<A>(ty: AsFieldElements<A>) {
  return function (
    target: any,
    propertyName: string,
    _descriptor?: PropertyDescriptor
  ): any {};
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

export class SmartContract {
  protocolState: ProtocolStatePredicate;
  self: Body;
  address: PublicKey;

  state: Array<State<Field>>;

  constructor(address: PublicKey) {
    this.address = address;
    this.protocolState = null as unknown as ProtocolStatePredicate;
    this.self = null as unknown as Body;
    this.state = [];
  }

  static fromAddress(address: PublicKey): SmartContract {
    throw 'todo';
  }

  party(i: number): Body {
    throw 'todo';
  }

  transactionHash(): Field {
    throw 'todo';
  }

  emitEvent<T extends CircuitValue>(x: T): void {
    // TODO: Get the current party object, pull out the events field, and
    // hash this together with what's there
    Poseidon.hash(x.toFieldElements());
  }
}
