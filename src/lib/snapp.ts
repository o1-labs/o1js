import {
  Circuit,
  Field,
  Bool,
  Poseidon,
  AsFieldElements,
  picklesCompile,
} from '../snarky';
import { CircuitValue } from './circuit_value';
import {
  AccountPredicate,
  ProtocolStatePredicate,
  Body,
  Party,
  PartyBalance,
} from './party';
import { PrivateKey, PublicKey } from './signature';
import * as Mina from './mina';
import { UInt32 } from './int';

/**
 * Gettable and settable state that can be checked for equality.
 */
export type State<A> = {
  get(): Promise<A>;
  set(a: A): void;
  assertEquals(a: A): void;
};

/**
 * Gettable and settable state that can be checked for equality.
 */
export function State<A>(): State<A> {
  return createState<A>();
}

function createState<A>() {
  return {
    _initialized: false,
    _key: undefined as never as string, // defined by @state
    _ty: undefined as never as AsFieldElements<A>, // defined by @state
    _this: undefined as any, // defined by @state
    _SnappClass: undefined as never as SmartContract & { _layout: () => any }, // defined by @state

    _init(key: string, ty: AsFieldElements<A>, _this: any, SnappClass: any) {
      this._initialized = true;
      this._key = key;
      this._ty = ty;
      this._this = _this;
      this._SnappClass = SnappClass;
    },

    getLayout() {
      const layout: Map<string, { offset: number; length: number }> =
        this._SnappClass._layout();
      const r = layout.get(this._key);
      if (r === undefined) {
        throw new Error(`state ${this._key} not found`);
      }
      return r;
    },

    set(a: A) {
      if (!this._initialized)
        throw Error(
          'set can only be called when the State is assigned to a SmartContract @state.'
        );
      const r = this.getLayout();
      const xs = this._ty.toFields(a);
      let e: ExecutionState = this._this.executionState();

      xs.forEach((x, i) => {
        e.party.body.update.appState[r.offset + i].setValue(x);
      });
    },

    assertEquals(a: A) {
      if (!this._initialized)
        throw Error(
          'assertEquals can only be called when the State is assigned to a SmartContract @state.'
        );
      const r = this.getLayout();
      const xs = this._ty.toFields(a);
      let e: ExecutionState = this._this.executionState();

      xs.forEach((x, i) => {
        e.party.predicate.state[r.offset + i].check = new Bool(true);
        e.party.predicate.state[r.offset + i].value = x;
      });
    },

    async get(): Promise<A> {
      if (!this._initialized)
        throw Error(
          'get can only be called when the State is assigned to a SmartContract @state.'
        );
      const r = this.getLayout();

      let addr: PublicKey = this._this.address;
      let p: Promise<Field[]>;

      if (Circuit.inProver()) {
        p = Mina.getAccount(addr).then((a) => {
          const xs: Field[] = [];
          for (let i = 0; i < r.length; ++i) {
            xs.push(a.snapp.appState[r.offset + i]);
          }
          return Circuit.witness(Circuit.array(Field, r.length), () => xs);
        });
      } else {
        const res = Circuit.witness(Circuit.array(Field, r.length), () => {
          throw 'unimplemented';
        });
        p = new Promise((k) => k(res));
      }

      let xs = await p;
      const res = this._ty.ofFields(xs);
      if ((this._ty as any).check != undefined) {
        (this._ty as any).check(res);
      }
      return res;
    },
  };
}

type InternalStateType = ReturnType<typeof createState>;

const reservedPropNames = new Set(['_states', '_layout', '_methods', '_']);

/**
 * A decorator to use within a snapp to indicate what will be stored on-chain.
 * For example, if you want to store a field element `some_state` in a snapp,
 * you can use the following in the declaration of your snapp:
 *
 * ```
 * @state(Field) some_state = State<Field>();
 * ```
 *
 */
export function state<A>(ty: AsFieldElements<A>) {
  return function (
    target: SmartContract & { constructor: any },
    key: string,
    _descriptor?: PropertyDescriptor
  ) {
    const SnappClass = target.constructor;
    // TBD: I think the runtime error below is unnecessary, because having target: SmartContract
    // means TS will not let the code build if @state is used on an incompatible class
    // if (!(SnappClass.prototype instanceof SmartContract)) {
    //   throw Error(
    //     'Can only use @state decorator on classes that extend SmartContract'
    //   );
    // }

    // TBD: ok to not check? bc type metadata not inferred from class field assignment
    // const fieldType = Reflect.getMetadata('design:type', target, key);
    // if (fieldType != State) {
    //   throw new Error(
    //     `@state fields must have type State<A> for some type A, got ${fieldType}`
    //   );
    // }

    if (reservedPropNames.has(key)) {
      throw Error(`Property name ${key} is reserved.`);
    }

    if (SnappClass._states == undefined) {
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

    SnappClass._states.push([key, ty]);

    Object.defineProperty(target, key, {
      get(this) {
        return this._?.[key];
      },
      set(this, v: InternalStateType) {
        if (v._initialized)
          throw Error(
            'A State should only be assigned once to a SmartContract'
          );
        if (this._?.[key]) throw Error('A @state should only be assigned once');
        v._init(key, ty, this, SnappClass);
        (this._ ?? (this._ = {}))[key] = v;
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
export function method<T extends SmartContract>(
  target: T & { constructor: any },
  methodName: keyof T & string,
  _descriptor?: PropertyDescriptor
) {
  const SnappClass = target.constructor;
  if (reservedPropNames.has(methodName)) {
    throw Error(`Property name ${methodName} is reserved.`);
  }
  if (typeof target[methodName] !== 'function') {
    throw Error(
      `@method decorator was applied to ${methodName} which is not a function.`
    );
  }
  let paramTypes = Reflect.getMetadata('design:paramtypes', target, methodName);
  let witnessArgs = [];
  let proofArgs = [];
  let args = [];
  for (let i = 0; i < paramTypes.length; i++) {
    let Parameter = paramTypes[i];
    if (isProof(Parameter)) {
      args.push({ type: 'proof', index: proofArgs.length });
      proofArgs.push(Parameter);
    } else if (isAsFields(Parameter)) {
      args.push({ type: 'witness', index: witnessArgs.length });
      witnessArgs.push(Parameter);
    } else {
      throw Error(
        `Argument ${i} of method ${methodName} is not a valid circuit value.`
      );
    }
  }
  SnappClass._methods ??= [];
  SnappClass._methods.push({
    methodName,
    witnessArgs,
    proofArgs,
    args,
  });
}

type methodEntry<T> = {
  methodName: keyof T & string;
  witnessArgs: AsFieldElements<unknown>[];
  proofArgs: unknown[];
  args: { type: string; index: number }[];
};

function isAsFields(typ: Object) {
  return (
    !!typ && ['toFields', 'ofFields', 'sizeInFields'].every((s) => s in typ)
  );
}
function isProof(typ: any) {
  return false; // TODO
}
function emptyWitness<A>(typ: AsFieldElements<A>) {
  return typ.ofFields(Array(typ.sizeInFields()).fill(Field.zero));
}

type ExecutionState = {
  transactionId: number;
  partyIndex: number;
  party: Party<AccountPredicate>;
  protocolStatePredicate: ProtocolStatePredicate;
};

function computeTransactionHash(x: any) {
  // TODO
  return Field.one;
}

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
export class SmartContract {
  address: PublicKey;

  _executionState?: ExecutionState;
  static _methods?: methodEntry<SmartContract>[];

  constructor(address: PublicKey) {
    this.address = address;
  }

  static compile() {
    let dummySender = PrivateKey.random();
    let dummySenderPublic = dummySender.toPublicKey();
    let dummyInstance = new this(dummySenderPublic);
    let inductiveRules = (this._methods ?? []).map(
      ({ methodName, witnessArgs }) => {
        function main(transactionHash: Field) {
          console.log({ transactionHash });
          Mina.setCurrentTransaction({
            sender: PrivateKey.random(), // TODO
            parties: [],
            nextPartyIndex: 0,
            protocolState: ProtocolStatePredicate.ignoreAll(),
          });
          let witnesses = witnessArgs.map(emptyWitness);
          (dummyInstance[methodName] as any)(...witnesses); // call method in a way that `this` is defined
          let hash = computeTransactionHash(Mina.currentTransaction);
          hash.assertEquals(transactionHash);
        }
        return [0, methodName, main];
      }
    );
    let output = picklesCompile(inductiveRules);
    console.log('output', output);
    return output;
  }

  deploy(...args: any[]) {
    try {
      this.executionState().party.body.update.verificationKey.set = Bool(true);
    } catch {
      throw new Error('Cannot deploy SmartContract outside a transaction.');
    }
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
