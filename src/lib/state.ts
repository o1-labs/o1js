import { Field, AsFieldElements } from '../snarky.js';
import { circuitArray, witness } from './circuit_value.js';
import { AccountUpdate, TokenId } from './account_update.js';
import { PublicKey } from './signature.js';
import * as Mina from './mina.js';
import { Account, fetchAccount } from './fetch.js';
import { inCheckedComputation, inProver } from './proof_system.js';
import { SmartContract } from './zkapp.js';

// external API
export { State, state, declareState };
// internal API
export { assertStatePrecondition, cleanStatePrecondition };

/**
 * Gettable and settable state that can be checked for equality.
 */
type State<A> = {
  get(): A;
  set(a: A): void;
  fetch(): Promise<A | undefined>;
  assertEquals(a: A): void;
  assertNothing(): void;
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
          wasConstrained: false,
          wasRead: false,
          cachedVariable: undefined,
        };
        (this._ ??= {})[key] = v;
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
  wasRead: boolean;
  wasConstrained: boolean;
  cachedVariable?: A;
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
      let accountUpdate = this._contract.instance.self;
      stateAsFields.forEach((x, i) => {
        AccountUpdate.setValue(
          accountUpdate.body.update.appState[layout.offset + i],
          x
        );
      });
    },

    assertEquals(state: T) {
      if (this._contract === undefined)
        throw Error(
          'assertEquals can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = getLayoutPosition(this._contract);
      let stateAsFields = this._contract.stateType.toFields(state);
      let accountUpdate = this._contract.instance.self;
      stateAsFields.forEach((x, i) => {
        AccountUpdate.assertEquals(
          accountUpdate.body.preconditions.account.state[layout.offset + i],
          x
        );
      });
      this._contract.wasConstrained = true;
    },

    assertNothing() {
      if (this._contract === undefined)
        throw Error(
          'assertNothing can only be called when the State is assigned to a SmartContract @state.'
        );
      this._contract.wasConstrained = true;
    },

    get() {
      if (this._contract === undefined)
        throw Error(
          'get can only be called when the State is assigned to a SmartContract @state.'
        );
      // inside the circuit, we have to cache variables, so there's only one unique variable per on-chain state.
      // if we'd return a fresh variable everytime, developers could easily end up linking just *one* of them to the precondition,
      // while using an unconstrained variable elsewhere, which would create a loophole in the proof.
      if (
        this._contract.cachedVariable !== undefined &&
        // `inCheckedComputation() === true` here always implies being inside a wrapped smart contract method,
        // which will ensure that the cache is cleaned up before & after each method run.
        inCheckedComputation()
      ) {
        this._contract.wasRead = true;
        return this._contract.cachedVariable;
      }
      let layout = getLayoutPosition(this._contract);
      let contract = this._contract;
      let inProver_ = inProver();
      let stateFieldsType = circuitArray(Field, layout.length);
      let stateAsFields = witness(stateFieldsType, () => {
        let account: Account;
        try {
          account = Mina.getAccount(
            contract.instance.address,
            contract.instance.self.body.tokenId
          );
        } catch (err) {
          // TODO: there should also be a reasonable error here
          if (inProver_) {
            throw err;
          }
          throw Error(
            `${contract.key}.get() failed, because the zkapp account was not found in the cache. ` +
              `Try calling \`await fetchAccount(zkappAddress)\` first.`
          );
        }
        if (account.appState === undefined) {
          // if the account is not a zkapp account, let the default state be all zeroes
          return Array(layout.length).fill(Field.zero);
        } else {
          let stateAsFields: Field[] = [];
          for (let i = 0; i < layout.length; ++i) {
            stateAsFields.push(account.appState[layout.offset + i]);
          }
          return stateAsFields;
        }
      });

      let state = this._contract.stateType.ofFields(stateAsFields);
      this._contract.stateType.check?.(state);
      this._contract.wasRead = true;
      this._contract.cachedVariable = state;
      return state;
    },

    async fetch() {
      if (this._contract === undefined)
        throw Error(
          'fetch can only be called when the State is assigned to a SmartContract @state.'
        );
      if (Mina.currentTransaction.has())
        throw Error(
          'fetch is not intended to be called inside a transaction block.'
        );
      let layout = getLayoutPosition(this._contract);
      let address: PublicKey = this._contract.instance.address;
      let { account } = await fetchAccount({
        publicKey: address,
        tokenId: TokenId.toBase58(TokenId.default),
      });
      if (account === undefined) return undefined;
      let stateAsFields: Field[];
      if (account.appState === undefined) {
        stateAsFields = Array(layout.length).fill(Field.zero);
      } else {
        stateAsFields = [];
        for (let i = 0; i < layout.length; i++) {
          stateAsFields.push(account.appState[layout.offset + i]);
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

// per-smart contract class context for keeping track of state layout
const smartContracts = new WeakMap<
  typeof SmartContract,
  {
    states: [string, AsFieldElements<any>][];
    layout: Map<string, { offset: number; length: number }> | undefined;
  }
>();

const reservedPropNames = new Set(['_methods', '_']);

function assertStatePrecondition(sc: SmartContract) {
  try {
    for (let [key, context] of getStateContexts(sc)) {
      // check if every state that was read was also contrained
      if (!context?.wasRead || context.wasConstrained) continue;
      // we accessed a precondition field but not constrained it explicitly - throw an error
      let errorMessage = `You used \`this.${key}.get()\` without adding a precondition that links it to the actual on-chain state.
Consider adding this line to your code:
this.${key}.assertEquals(this.${key}.get());`;
      throw Error(errorMessage);
    }
  } finally {
    cleanStatePrecondition(sc);
  }
}

function cleanStatePrecondition(sc: SmartContract) {
  for (let [, context] of getStateContexts(sc)) {
    if (context === undefined) continue;
    context.wasRead = false;
    context.wasConstrained = false;
    context.cachedVariable = undefined;
  }
}

function getStateContexts(
  sc: SmartContract
): [string, StateAttachedContract<unknown> | undefined][] {
  let scClass = sc.constructor as typeof SmartContract;
  let scInfo = smartContracts.get(scClass);
  if (scInfo === undefined) return [];
  return scInfo.states.map(([key]) => [key, (sc as any)[key]?._contract]);
}
