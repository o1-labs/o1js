import { Circuit, Field, AsFieldElements } from '../snarky';
import { circuitArray } from './circuit_value';
import { Party } from './party';
import { PublicKey } from './signature';
import * as Mina from './mina';
import { Account, fetchAccount } from './fetch';
import * as GlobalContext from './global-context';
import { SmartContract } from './zkapp';

export { State, state, declareState };

/**
 * Gettable and settable state that can be checked for equality.
 */
type State<A> = {
  get(): A;
  set(a: A): void;
  fetch(): Promise<A | undefined>;
  assertEquals(a: A): void;
};
function State<A>(): State<A> {
  return createState<A>();
}

/**
 * A decorator to use within a zkapp to indicate what will be stored on-chain.
 * For example, if you want to store a field element `some_state` in a zkapp,
 * you can use the following in the declaration of your zkapp:
 *
 * ```
 * @state(Field) some_state = State<Field>();
 * ```
 *
 */
function state<A>(stateType: AsFieldElements<A>) {
  return function (
    target: SmartContract & { constructor: any },
    key: string,
    _descriptor?: PropertyDescriptor
  ) {
    const ZkappClass = target.constructor;
    if (reservedPropNames.has(key)) {
      throw Error(`Property name ${key} is reserved.`);
    }
    let sc = smartContracts.get(ZkappClass);
    if (sc === undefined) {
      sc = { states: [], layout: undefined };
      smartContracts.set(ZkappClass, sc);
    }
    sc.states.push([key, stateType]);

    Object.defineProperty(target, key, {
      get(this) {
        return this._?.[key];
      },
      set(this, v: InternalStateType<A>) {
        if (v._contract !== undefined)
          throw Error(
            'A State should only be assigned once to a SmartContract'
          );
        if (this._?.[key]) throw Error('A @state should only be assigned once');
        v._contract = {
          key,
          stateType: stateType,
          instance: this,
          class: ZkappClass,
        };
        (this._ ?? (this._ = {}))[key] = v;
      },
    });
  };
}

/**
 * `declareState` can be used in place of the `@state` decorator to declare on-chain state on a SmartContract.
 * It should be placed _after_ the class declaration.
 * Here is an example of declaring a state property `x` of type `Field`.
 * ```ts
 * class MyContract extends SmartContract {
 *   x = State<Field>();
 *   // ...
 * }
 * declareState(MyContract, { x: Field });
 * ```
 *
 * If you're using pure JS, it's _not_ possible to use the built-in class field syntax,
 * i.e. the following will _not_ work:
 *
 * ```js
 * // THIS IS WRONG IN JS!
 * class MyContract extends SmartContract {
 *   x = State();
 * }
 * declareState(MyContract, { x: Field });
 * ```
 *
 * Instead, add a constructor where you assign the property:
 * ```js
 * class MyContract extends SmartContract {
 *   constructor(x) {
 *     super();
 *     this.x = State();
 *   }
 * }
 * declareState(MyContract, { x: Field });
 * ```
 */
function declareState<T extends typeof SmartContract>(
  SmartContract: T,
  states: Record<string, AsFieldElements<unknown>>
) {
  for (let key in states) {
    let CircuitValue = states[key];
    state(CircuitValue)(SmartContract.prototype, key);
  }
}

// metadata defined by @state, which link state to a particular SmartContract
type StateAttachedContract<A> = {
  key: string;
  stateType: AsFieldElements<A>;
  instance: SmartContract;
  class: typeof SmartContract;
};

type InternalStateType<A> = State<A> & { _contract?: StateAttachedContract<A> };

function createState<T>(): InternalStateType<T> {
  return {
    _contract: undefined as StateAttachedContract<T> | undefined,

    set(state: T) {
      if (this._contract === undefined)
        throw Error(
          'set can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = getLayoutPosition(this._contract);
      let stateAsFields = this._contract.stateType.toFields(state);
      let party = this._contract.instance.self;
      stateAsFields.forEach((x, i) => {
        Party.setValue(party.body.update.appState[layout.offset + i], x);
      });
    },

    assertEquals(state: T) {
      if (this._contract === undefined)
        throw Error(
          'assertEquals can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = getLayoutPosition(this._contract);
      let stateAsFields = this._contract.stateType.toFields(state);
      let party = this._contract.instance.self;
      stateAsFields.forEach((x, i) => {
        Party.assertEquals(
          party.body.preconditions.account.state[layout.offset + i],
          x
        );
      });
    },

    get() {
      if (this._contract === undefined)
        throw Error(
          'get can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = getLayoutPosition(this._contract);
      let address: PublicKey = this._contract.instance.address;
      let stateAsFields: Field[];
      let inProver = GlobalContext.inProver();
      if (!GlobalContext.inCompile()) {
        let account: Account;
        try {
          account = Mina.getAccount(address);
        } catch (err) {
          // TODO: there should also be a reasonable error here
          if (inProver) {
            throw err;
          }
          throw Error(
            `${this._contract.key}.get() failed, because the zkapp account was not found in the cache. ` +
              `Try calling \`await fetchAccount(zkappAddress)\` first.`
          );
        }
        if (account.zkapp === undefined) {
          // if the account is not a zkapp account, let the default state be all zeroes
          stateAsFields = Array(layout.length).fill(Field.zero);
        } else {
          stateAsFields = [];
          for (let i = 0; i < layout.length; ++i) {
            stateAsFields.push(account.zkapp.appState[layout.offset + i]);
          }
        }
        // in prover, create a new witness with the state values
        // outside, just return the state values
        stateAsFields = inProver
          ? Circuit.witness(
              circuitArray(Field, layout.length),
              () => stateAsFields
            )
          : stateAsFields;
      } else {
        // in compile, we don't need the witness values
        stateAsFields = Circuit.witness(
          circuitArray(Field, layout.length),
          (): Field[] => {
            throw Error('this should never happen');
          }
        );
      }
      let state = this._contract.stateType.ofFields(stateAsFields);
      this._contract.stateType.check?.(state);
      return state;
    },

    async fetch() {
      if (this._contract === undefined)
        throw Error(
          'fetch can only be called when the State is assigned to a SmartContract @state.'
        );
      if (Mina.currentTransaction !== undefined)
        throw Error(
          'fetch is not intended to be called inside a transaction block.'
        );
      let layout = getLayoutPosition(this._contract);
      let address: PublicKey = this._contract.instance.address;
      let { account } = await fetchAccount(address);
      if (account === undefined) return undefined;
      let stateAsFields: Field[];
      if (account.zkapp === undefined) {
        stateAsFields = Array(layout.length).fill(Field.zero);
      } else {
        stateAsFields = [];
        for (let i = 0; i < layout.length; i++) {
          stateAsFields.push(account.zkapp.appState[layout.offset + i]);
        }
      }
      return this._contract.stateType.ofFields(stateAsFields);
    },
  };
}

function getLayoutPosition<A>({
  key,
  class: contractClass,
}: StateAttachedContract<A>) {
  let layout = getLayout(contractClass);
  let stateLayout = layout.get(key);
  if (stateLayout === undefined) {
    throw new Error(`state ${key} not found`);
  }
  return stateLayout;
}

function getLayout(scClass: typeof SmartContract) {
  let sc = smartContracts.get(scClass);
  if (sc === undefined) throw Error('bug');
  if (sc.layout === undefined) {
    let layout = new Map();
    sc.layout = layout;
    let offset = 0;
    sc.states.forEach(([key, stateType]) => {
      let length = stateType.sizeInFields();
      layout.set(key, { offset, length });
      offset += length;
    });
  }
  return sc.layout;
}

const smartContracts = new WeakMap<
  typeof SmartContract,
  {
    states: [string, AsFieldElements<any>][];
    layout: Map<string, { offset: number; length: number }> | undefined;
  }
>();

const reservedPropNames = new Set(['_methods', '_']);
