import { AsFieldElements } from '..';
import { Field, Poseidon, isReady } from '../snarky';
import { CircuitValue } from './circuit_value';
import { ProtocolStatePredicate, Body, State } from './party';
import { PublicKey } from './signature';

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
