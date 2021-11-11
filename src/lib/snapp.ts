import { Field, Poseidon } from '../snarky';
import { CircuitValue } from './circuit_value';
import { ProtocolStatePredicate, Body } from './party';
import { PublicKey } from './signature';

export function state(
  target: any,
  propertyName: string,
  _descriptor?: PropertyDescriptor
): any {
  throw ''
}

export function method(
  target: any,
  propertyName: string,
  _descriptor?: PropertyDescriptor
): any {
  throw ''
}
export function init(
  target: any,
  propertyName: string,
  _descriptor?: PropertyDescriptor
): any {
  throw ''
}

export class SmartContract {
  protocolState: ProtocolStatePredicate;
  self: Body;
  address: PublicKey;

  party(i: number): Body {
    throw 'todo'
  }

  transactionHash(): Field {
    throw 'todo'
  }

  emitEvent<T extends CircuitValue>(x : T): void {
    // TODO: Get the current party object, pull out the events field, and
    // hash this together with what's there
    Poseidon.hash(x.toFieldElements())
  }
  
  constructor(address: PublicKey) {
    this.address = address;
    this.protocolState = null as unknown as ProtocolStatePredicate;
    this.self = null as unknown as Body;
  }
}