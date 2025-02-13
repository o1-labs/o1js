import { FlexibleProvablePure } from '../../provable/types/struct.js';
import { AccountUpdate, TokenId } from './account-update.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import * as Mina from './mina.js';
import { fetchAccount, networkConfig } from './fetch.js';
import { SmartContract } from './zkapp.js';
import { Account } from './account.js';
import { Provable } from '../../provable/provable.js';
import { Field } from '../../provable/wrapped.js';
import {
  ProvablePure,
  ProvableType,
  ProvableTypePure,
} from '../../provable/types/provable-intf.js';
import { ensureConsistentPrecondition } from './precondition.js';
import { Bool } from '../../provable/wrapped.js';

// external API
export { State, state, declareState };
// internal API
export { assertStatePrecondition, cleanStatePrecondition, getLayout, InternalStateType };

/**
 * Gettable and settable state that can be checked for equality.
 */
type State<A> = {
  /**
   * Get the current on-chain state.
   *
   * Caution: If you use this method alone inside a smart contract, it does not prove that your contract uses the current on-chain state.
   * To successfully prove that your contract uses the current on-chain state, you must add an additional `.requireEquals()` statement or use `.getAndRequireEquals()`:
   *
   * ```ts
   * let x = this.x.get();
   * this.x.requireEquals(x);
   * ```
   *
   * OR
   *
   * ```ts
   * let x = this.x.getAndRequireEquals();
   * ```
   */
  get(): A;
  /**
   * Get the current on-chain state and prove it really has to equal the on-chain state,
   * by adding a precondition which the verifying Mina node will check before accepting this transaction.
   */
  getAndRequireEquals(): A;
  /**
   * Set the on-chain state to a new value.
   */
  set(a: A): void;
  /**
   * Asynchronously fetch the on-chain state. This is intended for getting the state outside a smart contract.
   */
  fetch(): Promise<A | undefined>;
  /**
   * Prove that the on-chain state has to equal the given state,
   * by adding a precondition which the verifying Mina node will check before accepting this transaction.
   */
  requireEquals(a: A): void;
  /**
   * Require that the on-chain state has to equal the given state if the provided condition is true.
   *
   * If the condition is false, this is a no-op.
   * If the condition is true, this adds a precondition that the verifying Mina node will check before accepting this transaction.
   */
  requireEqualsIf(condition: Bool, a: A): void;
  /**
   * **DANGER ZONE**: Override the error message that warns you when you use `.get()` without adding a precondition.
   */
  requireNothing(): void;
  /**
   * Get the state from the raw list of field elements on a zkApp account, for example:
   *
   * ```ts
   * let myContract = new MyContract(address);
   * let account = Mina.getAccount(address);
   *
   * let x = myContract.x.fromAppState(account.zkapp!.appState);
   * ```
   */
  fromAppState(appState: Field[]): A;
};
function State<A>(defaultValue?: A): State<A> {
  return createState<A>(defaultValue);
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
function state<A>(type: ProvableTypePure<A> | FlexibleProvablePure<A>) {
  let stateType = ProvableType.get(type);

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
          throw Error('A State should only be assigned once to a SmartContract');
        if (this._?.[key]) throw Error('A @state should only be assigned once');
        v._contract = {
          key,
          stateType: stateType as ProvablePure<A>,
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
  states: Record<string, FlexibleProvablePure<any>>
) {
  for (let key in states) {
    let CircuitValue = states[key];
    state(CircuitValue)(SmartContract.prototype, key);
  }
}

// metadata defined by @state, which link state to a particular SmartContract
type StateAttachedContract<A> = {
  key: string;
  stateType: ProvablePure<A>;
  instance: SmartContract;
  class: typeof SmartContract;
  wasRead: boolean;
  wasConstrained: boolean;
  cachedVariable?: A;
};

type InternalStateType<A> = State<A> & {
  _contract?: StateAttachedContract<A>;
  defaultValue?: A;
};

function createState<T>(defaultValue?: T): InternalStateType<T> {
  return {
    _contract: undefined as StateAttachedContract<T> | undefined,
    defaultValue,

    set(state: T) {
      if (this._contract === undefined)
        throw Error('set can only be called when the State is assigned to a SmartContract @state.');
      let layout = getLayoutPosition(this._contract);
      let stateAsFields = this._contract.stateType.toFields(state);
      let accountUpdate = this._contract.instance.self;
      stateAsFields.forEach((x, i) => {
        let appStateSlot = accountUpdate.body.update.appState[layout.offset + i];
        AccountUpdate.setValue(appStateSlot, x);
      });
    },

    requireEquals(state: T) {
      if (this._contract === undefined)
        throw Error(
          'requireEquals can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = getLayoutPosition(this._contract);
      let stateAsFields = this._contract.stateType.toFields(state);
      let accountUpdate = this._contract.instance.self;
      stateAsFields.forEach((x, i) => {
        let precondition = accountUpdate.body.preconditions.account.state[layout.offset + i];
        ensureConsistentPrecondition(precondition, Bool(true), x, this._contract?.key);
        AccountUpdate.assertEquals(precondition, x);
      });
      this._contract.wasConstrained = true;
    },

    requireEqualsIf(condition: Bool, state: T) {
      if (this._contract === undefined)
        throw Error(
          'requireEqualsIf can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = getLayoutPosition(this._contract);
      let stateAsFields = this._contract.stateType.toFields(state);
      let accountUpdate = this._contract.instance.self;
      stateAsFields.forEach((stateField, i) => {
        let value = Provable.if(condition, stateField, Field(0));
        ensureConsistentPrecondition(
          accountUpdate.body.preconditions.account.state[layout.offset + i],
          condition,
          value,
          this._contract?.key
        );
        let state = accountUpdate.body.preconditions.account.state[layout.offset + i];
        state.isSome = condition;
        state.value = value;
      });
      this._contract.wasConstrained = true;
    },

    requireNothing() {
      if (this._contract === undefined)
        throw Error(
          'requireNothing can only be called when the State is assigned to a SmartContract @state.'
        );
      // TODO: this should ideally reset any previous precondition,
      // by setting each relevant state field to { isSome: false, value: Field(0) }
      this._contract.wasConstrained = true;
    },

    get() {
      if (this._contract === undefined)
        throw Error('get can only be called when the State is assigned to a SmartContract @state.');
      // inside the circuit, we have to cache variables, so there's only one unique variable per on-chain state.
      // if we'd return a fresh variable everytime, developers could easily end up linking just *one* of them to the precondition,
      // while using an unconstrained variable elsewhere, which would create a loophole in the proof.
      if (
        this._contract.cachedVariable !== undefined &&
        // `inCheckedComputation() === true` here always implies being inside a wrapped smart contract method,
        // which will ensure that the cache is cleaned up before & after each method run.
        Provable.inCheckedComputation()
      ) {
        this._contract.wasRead = true;
        return this._contract.cachedVariable;
      }
      let layout = getLayoutPosition(this._contract);
      let contract = this._contract;
      let inProver_ = Provable.inProver();
      let stateFieldsType = Provable.Array(Field, layout.length);
      let stateAsFields = Provable.witness(stateFieldsType, () => {
        let account: Account;
        try {
          account = Mina.getAccount(contract.instance.address, contract.instance.self.body.tokenId);
        } catch (err: any) {
          // TODO: there should also be a reasonable error here
          if (inProver_) {
            throw err;
          }
          let message =
            `${contract.key}.get() failed, either:\n` +
            `1. We can't find this zkapp account in the ledger\n` +
            `2. Because the zkapp account was not found in the cache. ` +
            `Try calling \`await fetchAccount(zkappAddress)\` first.\n` +
            `If none of these are the case, then please reach out on Discord at #zkapp-developers and/or open an issue to tell us!`;
          if (err.message) {
            err.message = message + `\n\n${err.message}`;
            throw err;
          } else {
            throw Error(message);
          }
        }
        if (account.zkapp?.appState === undefined) {
          // if the account is not a zkapp account, let the default state be all zeroes
          return Array(layout.length).fill(Field(0));
        } else {
          let stateAsFields: Field[] = [];
          for (let i = 0; i < layout.length; ++i) {
            stateAsFields.push(account.zkapp.appState[layout.offset + i]);
          }
          return stateAsFields;
        }
      });

      let state = this._contract.stateType.fromFields(stateAsFields);
      if (Provable.inCheckedComputation()) this._contract.stateType.check?.(state);
      this._contract.wasRead = true;
      this._contract.cachedVariable = state;
      return state;
    },

    getAndRequireEquals() {
      let state = this.get();
      this.requireEquals(state);
      return state;
    },

    async fetch() {
      if (this._contract === undefined)
        throw Error(
          'fetch can only be called when the State is assigned to a SmartContract @state.'
        );

      let layout = getLayoutPosition(this._contract);
      let address: PublicKey = this._contract.instance.address;
      let tokenId: Field = this._contract.instance.tokenId;
      let account: Account | undefined;
      if (networkConfig.minaEndpoint === '') {
        account = Mina.getAccount(address, tokenId);
      } else {
        ({ account } = await fetchAccount({
          publicKey: address,
          tokenId: TokenId.toBase58(tokenId),
        }));
      }
      if (account === undefined) return undefined;

      let stateAsFields: Field[];
      if (account.zkapp?.appState === undefined) {
        stateAsFields = Array(layout.length).fill(Field(0));
      } else {
        stateAsFields = [];
        for (let i = 0; i < layout.length; i++) {
          stateAsFields.push(account.zkapp.appState[layout.offset + i]);
        }
      }
      return this._contract.stateType.fromFields(stateAsFields);
    },

    fromAppState(appState: Field[]) {
      if (this._contract === undefined)
        throw Error(
          'fromAppState() can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = getLayoutPosition(this._contract);
      let stateAsFields: Field[] = [];
      for (let i = 0; i < layout.length; ++i) {
        stateAsFields.push(appState[layout.offset + i]);
      }
      return this._contract.stateType.fromFields(stateAsFields);
    },
  };
}

function getLayoutPosition<A>({ key, class: contractClass }: StateAttachedContract<A>) {
  let layout = getLayout(contractClass);
  let stateLayout = layout.get(key);
  if (stateLayout === undefined) {
    throw new Error(`state ${key} not found`);
  }
  return stateLayout;
}

function getLayout(scClass: typeof SmartContract) {
  let sc = smartContracts.get(scClass);
  if (sc === undefined) return new Map();
  if (sc.layout === undefined) {
    let layout = new Map();
    sc.layout = layout;
    let offset = 0;
    sc.states.forEach(([key, stateType]) => {
      let length = stateType.sizeInFields();
      layout.set(key, { offset, length });
      offset += length;
    });
    if (offset > 8) {
      throw Error(
        `Found ${offset} on-chain state field elements on ${scClass.name}. Currently, only a total of 8 field elements of state are supported.`
      );
    }
  }
  return sc.layout;
}

// per-smart contract class context for keeping track of state layout
const smartContracts = new WeakMap<
  typeof SmartContract,
  {
    states: [string, ProvablePure<any>][];
    layout: Map<string, { offset: number; length: number }> | undefined;
  }
>();

const reservedPropNames = new Set(['_methods', '_']);

function assertStatePrecondition(sc: SmartContract) {
  try {
    for (let [key, context] of getStateContexts(sc)) {
      // check if every state that was read was also constrained
      if (!context?.wasRead || context.wasConstrained) continue;
      // we accessed a precondition field but not constrained it explicitly - throw an error
      let errorMessage = `You used \`this.${key}.get()\` without adding a precondition that links it to the actual on-chain state.
Consider adding this line to your code:
this.${key}.requireEquals(this.${key}.get());`;
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
