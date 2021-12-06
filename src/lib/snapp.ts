import {
  Circuit,
  Field,
  Bool,
  Poseidon,
  isReady,
  AsFieldElements,
} from '../snarky';
import { CircuitValue } from './circuit_value';
import {
  AccountPredicate,
  ProtocolStatePredicate,
  Body,
  State,
  Party,
  PartyBalance,
} from './party';
import { PublicKey } from './signature';
import * as Mina from './mina';
import { FullAccountPredicate_ } from '../snarky';
import { UInt32 } from './int';

/**
 * A decorator to use within a snapp to indicate what will be stored on-chain.
 * For example, if you want to store a field element `some_state` in a snapp,
 * you can use the following in the declaration of your snapp:
 *
 * ```
 * @state(Field) some_state: Field;
 * ```
 *
 */
export function state<A>(ty: AsFieldElements<A>) {
  return function (
    target: any,
    key: string,
    _descriptor?: PropertyDescriptor
  ): any {
    const SnappClass = target.constructor;
    if (!(SnappClass.prototype instanceof SmartContract)) {
      throw new Error(
        'Can only use @state decorator on classes that extend SmartContract'
      );
    }

    const fieldType = Reflect.getMetadata('design:type', target, key);
    if (fieldType != State) {
      throw new Error('@state fields must have type State<A> for some type A');
    }

    if (key === '_states' || key === '_layout') {
      throw new Error('Property names _states and _layout reserved.');
    }

    if (SnappClass._states === undefined || SnappClass._states === null) {
      SnappClass._states = [];
      let layout: Map<string, { offset: number; length: number }>;
      SnappClass._layout = () => {
        if (layout === undefined) {
          layout = new Map();

          let offset = 0;
          SnappClass._states.forEach(([key, ty]: [any, any]) => {
            let length = ty.sizeInFields();
            layout.set(key, { offset, length });
            offset += length;
          });
        }

        return layout;
      };
    }

    class S extends State<A> {
      static _this: any;

      static getLayout() {
        const layout: Map<string, { offset: number; length: number }> =
          SnappClass._layout();
        const r = layout.get(key);
        if (r === undefined) {
          throw new Error(`state ${key} not found`);
        }
        return r;
      }

      set(a: A) {
        const r = S.getLayout();
        const xs = ty.toFields(a);
        /*
          console.log('target', target)
          console.log('target.address', target.address);
          console.log('target', target.executionState); */
        let e: ExecutionState = S._this.executionState();

        xs.forEach((x, i) => {
          e.party.body.update.appState[r.offset + i].setValue(x);
        });
      }

      assertEquals(a: A) {
        const r = S.getLayout();
        const xs = ty.toFields(a);
        let e: ExecutionState = S._this.executionState();

        xs.forEach((x, i) => {
          e.party.predicate.state[r.offset + i].check = new Bool(true);
          e.party.predicate.state[r.offset + i].value = x;
        });
      }

      get(): Promise<A> {
        const r = S.getLayout();

        let addr: PublicKey = S._this.address;
        let p: Promise<Field[]>;

        if (Circuit.inProver()) {
          p = Mina.getAccount(addr).then(a => {
            const xs: Field[] = [];
            for (let i = 0; i < r.length; ++i) {
              xs.push(a.snapp.appState[r.offset + i]);
            }
            return Circuit.witness(Circuit.array(Field, r.length), () => xs);
          });
        } else {
          const res = Circuit.witness(Circuit.array(Field, r.length), () => { throw 'unimplemented'});
          p = new Promise(k => k(res));
        }

        return p.then(xs => {
          const res = ty.ofFields(xs);
          if ((ty as any).check != undefined) {
            (ty as any).check(res);
          }
          return res;
        });
      }
    }

    SnappClass._states.push([key, ty]);

    const s = new S();
    Object.defineProperty(target, key, {
      get: function (this: any) {
        S._this = this;
        return s;
      },
      set: function (this: any, v: { value: A }) {
        S._this = this;
        s.set(v.value);
      },
    });
  };
}

/**
 * A decorator to use in a snapp to mark a method as callable by anyone.
 * You can use inside your snapp class as:
 *
 * ```
 * @method async my_method(some_arg: Field) {
 *  // your code here
 * }
 * ```
 */
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
  transactionId: number;
  partyIndex: number;
  party: Party<AccountPredicate>;
  protocolStatePredicate: ProtocolStatePredicate;
};

/**
 * The main snapp class. To write a snapp, extend this class as such:
 *
 * ```
 * class YourSmartContract extends SmartContract {
 *   // your smart contract code here
 * }
 * ```
 *
 */
export abstract class SmartContract {
  // protocolState: ProtocolStatePredicate;
  address: PublicKey;

  // state: Array<State<Field>>;

  // private _self: { body: Body, predicate: AccountPredicate } | undefined;

  _executionState: ExecutionState | undefined;

  constructor(address: PublicKey) {
    this.address = address;
    try {
      this.executionState().party.body.update.verificationKey.set = new Bool(
        true
      );
    } catch (_error) {
      throw new Error(
        'Cannot construct `new` SmartContract instance outside a transaction. Use `SmartContract.fromAddress` to refer to an already deployed instance.'
      );
    }
    // this.self = null as unknown as Body;
    // this.state = [];
  }

  executionState(): ExecutionState {
    if (Mina.currentTransaction === undefined) {
      throw new Error('Cannot execute outside of a Mina.transaction() block.');
    }

    if (
      this._executionState !== undefined &&
      this._executionState.transactionId === Mina.nextTransactionId.value
    ) {
      return this._executionState;
    } else {
      const id = Mina.nextTransactionId.value;
      const index = Mina.currentTransaction.nextPartyIndex++;
      const body = Body.keepAll(this.address);
      const predicate = AccountPredicate.ignoreAll();
      const party = new Party(body, predicate);
      Mina.currentTransaction.parties.push(party);

      const s = {
        transactionId: id,
        partyIndex: index,
        party,
        protocolStatePredicate: Mina.currentTransaction.protocolState,
      };
      this._executionState = s;
      return s;
    }
  }

  get protocolState(): ProtocolStatePredicate {
    return this.executionState().protocolStatePredicate;
  }

  get self(): Party<AccountPredicate> {
    return this.executionState().party;
  }

  get balance(): PartyBalance {
    return this.self.balance;
  }

  get nonce(): Promise<UInt32> {
    let p: Promise<UInt32>;
    if (Circuit.inProver()) {
      p = Mina.getAccount(this.address).then((a) => {
        return Circuit.witness<UInt32>(UInt32, () => a.nonce);
      });
    } else {
      const res = Circuit.witness<UInt32>(UInt32, () => {
        throw 'unimplemented';
      });
      p = new Promise((resolve) => resolve(res));
    }

    return p.then((nonce) => {
      this.executionState().party.predicate.nonce.assertBetween(nonce, nonce);
      return nonce;
    });
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
    Poseidon.hash(x.toFields());
  }
}
