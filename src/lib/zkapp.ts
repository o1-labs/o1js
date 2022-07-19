import {
  Field,
  Bool,
  AsFieldElements,
  Ledger,
  Pickles,
  Types,
  InferAsFieldElements,
  Poseidon,
} from '../snarky';
import { Circuit, circuitArray, cloneCircuitValue } from './circuit_value';
import {
  Body,
  Party,
  signJsonTransaction,
  Parties,
  Permissions,
  SetOrKeep,
  ZkappPublicInput,
  Events,
  partyToPublicInput,
  getDefaultTokenId,
} from './party';
import { PrivateKey, PublicKey } from './signature';
import * as Mina from './mina';
import { UInt32, UInt64 } from './int';
import {
  mainContext,
  inCheckedComputation,
  withContext,
  inProver,
  inAnalyze,
} from './global-context';
import {
  assertPreconditionInvariants,
  cleanPreconditionsCache,
} from './precondition';
import {
  getPreviousProofsForProver,
  MethodInterface,
  sortMethodArguments,
  compileProgram,
  Proof,
  emptyValue,
  analyzeMethod,
} from './proof_system';
import { assertStatePrecondition, cleanStatePrecondition } from './state';

// external API
export {
  SmartContract,
  Experimental,
  method,
  deploy,
  DeployArgs,
  signFeePayer,
  declareMethods,
};

const reservedPropNames = new Set(['_methods', '_']);

/**
 * A decorator to use in a zkapp to mark a method as callable by anyone.
 * You can use inside your zkapp class as:
 *
 * ```
 * @method myMethod(someArg: Field) {
 *  // your code here
 * }
 * ```
 */
function method<T extends SmartContract>(
  target: T & { constructor: any },
  methodName: keyof T & string,
  descriptor: PropertyDescriptor
) {
  const ZkappClass = target.constructor;
  if (reservedPropNames.has(methodName)) {
    throw Error(`Property name ${methodName} is reserved.`);
  }
  if (typeof target[methodName] !== 'function') {
    throw Error(
      `@method decorator was applied to \`${methodName}\`, which is not a function.`
    );
  }
  let paramTypes = Reflect.getMetadata('design:paramtypes', target, methodName);
  class SelfProof extends Proof<ZkappPublicInput> {
    static publicInputType = ZkappPublicInput;
    static tag = () => ZkappClass;
  }
  let methodEntry = sortMethodArguments(
    ZkappClass.name,
    methodName,
    paramTypes,
    SelfProof
  );
  ZkappClass._methods ??= [];
  ZkappClass._methods.push(methodEntry);
  ZkappClass._maxProofsVerified ??= 0;
  ZkappClass._maxProofsVerified = Math.max(
    ZkappClass._maxProofsVerified,
    methodEntry.proofArgs.length
  );
  let func = descriptor.value;
  descriptor.value = wrapMethod(func, ZkappClass, methodEntry);
}

// do different things when calling a method, depending on the circumstance
function wrapMethod(
  method: Function,
  ZkappClass: typeof SmartContract,
  methodIntf: MethodInterface
) {
  return function wrappedMethod(this: SmartContract, ...actualArgs: any[]) {
    cleanStatePrecondition(this);
    if (inCheckedComputation()) {
      return withContext(
        {
          ...mainContext,
          // important to run this with a fresh party everytime, otherwise compile messes up our circuits
          // because it runs this multiple times
          self: selfParty(this.address),
        },
        () => {
          // inside prover / compile, the method is always called with the public input as first argument
          // -- so we can add assertions about it
          let publicInput = actualArgs[0];
          actualArgs = actualArgs.slice(1);

          // outside a transaction, just call the method, but check precondition invariants
          let result = method.apply(this, actualArgs);
          checkPublicInput(publicInput, this.self);

          // check the self party right after calling the method
          // TODO: this needs to be done in a unified way for all parties that are created
          assertPreconditionInvariants(this.self);
          cleanPreconditionsCache(this.self);
          assertStatePrecondition(this);
          return result;
        }
      )[1];
    } else if (Mina.currentTransaction === undefined) {
      // outside a transaction, just call the method, but check precondition invariants
      let result = method.apply(this, actualArgs);
      // check the self party right after calling the method
      // TODO: this needs to be done in a unified way for all parties that are created
      assertPreconditionInvariants(this.self);
      cleanPreconditionsCache(this.self);
      assertStatePrecondition(this);
      return result;
    } else {
      // in a transaction, also add a lazy proof to the self party
      // (if there's no other authorization set)

      // first, clone to protect against the method modifying arguments!
      // TODO: double-check that this works on all possible inputs, e.g. CircuitValue, snarkyjs primitives
      let clonedArgs = cloneCircuitValue(actualArgs);
      let result = method.apply(this, actualArgs);
      assertStatePrecondition(this);
      let auth = this.self.authorization;
      if (!('kind' in auth || 'proof' in auth || 'signature' in auth)) {
        this.self.authorization = {
          kind: 'lazy-proof',
          method,
          args: clonedArgs,
          // proofs actually don't have to be cloned
          previousProofs: getPreviousProofsForProver(actualArgs, methodIntf),
          ZkappClass,
        };
      }
      return result;
    }
  };
}

function checkPublicInput({ party, calls }: ZkappPublicInput, self: Party) {
  let otherInput = partyToPublicInput(self);
  party.assertEquals(otherInput.party);
  calls.assertEquals(otherInput.calls);
}

/**
 * The main zkapp class. To write a zkapp, extend this class as such:
 *
 * ```
 * class YourSmartContract extends SmartContract {
 *   // your smart contract code here
 * }
 * ```
 *
 */
class SmartContract {
  address: PublicKey;

  private _executionState: ExecutionState | undefined;
  static _methods?: MethodInterface[];
  private static _methodMetadata: Record<
    string,
    { sequenceEvents: number; rows: number; digest: string }
  > = {}; // keyed by method name
  static _provers?: Pickles.Prover[];
  static _maxProofsVerified?: 0 | 1 | 2;
  static _verificationKey?: { data: string; hash: Field };

  static get Proof() {
    let Contract = this;
    return class extends Proof<ZkappPublicInput> {
      static publicInputType = ZkappPublicInput;
      static tag = () => Contract;
    };
  }

  constructor(address: PublicKey) {
    this.address = address;
    Object.defineProperty(this, 'reducer', {
      set(this, reducer: Reducer<any>) {
        ((this as any)._ ??= {}).reducer = reducer;
      },
      get(this) {
        return getReducer(this);
      },
    });
  }

  static async compile(address: PublicKey) {
    // TODO: think about how address should be passed in
    // TODO: maybe PublicKey should just become a variable? Then compile doesn't need to know the address, which seems more natural
    let methodIntfs = this._methods ?? [];
    let methods = methodIntfs.map(({ methodName }) => {
      return (...args: unknown[]) => {
        let instance = new this(address);
        (instance as any)[methodName](...args);
      };
    });
    // run methods once to get information that we need already at compile time
    this.analyzeMethods(address);
    let { getVerificationKeyArtifact, provers, verify } = compileProgram(
      ZkappPublicInput,
      methodIntfs,
      methods,
      this,
      { self: selfParty(address) }
    );

    let verificationKey = getVerificationKeyArtifact();
    this._provers = provers;
    this._verificationKey = {
      data: verificationKey.data,
      hash: Field(verificationKey.hash),
    };
    // TODO: instead of returning provers, return an artifact from which provers can be recovered
    return { verificationKey, provers, verify };
  }

  static digest(address: PublicKey) {
    let methodData = this.analyzeMethods(address);
    let hash = Poseidon.hash(
      Object.values(methodData).map((d) => Field(BigInt('0x' + d.digest))),
      false
    );
    return hash.toBigInt().toString(16);
  }

  deploy({
    verificationKey,
    zkappKey,
  }: {
    verificationKey?: { data: string; hash: Field | string };
    zkappKey?: PrivateKey;
  }) {
    verificationKey ??= (this.constructor as any)._verificationKey;
    if (verificationKey !== undefined) {
      let { hash: hash_, data } = verificationKey;
      let hash = typeof hash_ === 'string' ? Field(hash_) : hash_;
      this.setValue(this.self.update.verificationKey, { hash, data });
    }
    this.setValue(this.self.update.permissions, Permissions.default());
    this.sign(zkappKey, true);
  }

  sign(zkappKey?: PrivateKey, fallbackToZeroNonce?: boolean) {
    this.self.signInPlace(zkappKey, fallbackToZeroNonce);
  }

  private executionState(): ExecutionState {
    // TODO reconcile mainContext with currentTransaction
    if (mainContext !== undefined) {
      if (mainContext.self === undefined) throw Error('bug');
      return {
        transactionId: 0,
        partyIndex: 0,
        party: mainContext.self,
      };
    }
    if (Mina.currentTransaction === undefined) {
      // throw new Error('Cannot execute outside of a Mina.transaction() block.');
      // TODO: it's inefficient to return a fresh party everytime, would be better to return a constant "non-writable" party,
      // or even expose the .get() methods independently of any party (they don't need one)
      return {
        transactionId: NaN,
        partyIndex: NaN,
        party: selfParty(this.address),
      };
    }
    let executionState = this._executionState;
    if (
      executionState !== undefined &&
      executionState.transactionId === Mina.nextTransactionId.value
    ) {
      return executionState;
    }
    let id = Mina.nextTransactionId.value;
    let index = Mina.currentTransaction.nextPartyIndex++;
    let party = selfParty(this.address);
    Mina.currentTransaction.parties.push(party);
    executionState = {
      transactionId: id,
      partyIndex: index,
      party,
    };
    this._executionState = executionState;
    return executionState;
  }

  get self() {
    return this.executionState().party;
  }

  get account() {
    return this.self.account;
  }

  get network() {
    return this.self.network;
  }

  token() {
    return this.self.token();
  }

  get tokenSymbol() {
    return this.self.tokenSymbol;
  }

  get balance() {
    return this.self.balance;
  }

  get nonce() {
    return this.self.setNoncePrecondition();
  }

  events: { [key: string]: AsFieldElements<any> } = {};

  // TODO: not able to type event such that it is inferred correctly so far
  emitEvent<K extends keyof this['events']>(type: K, event: any) {
    let party = this.self;
    let eventTypes: (keyof this['events'])[] = Object.keys(this.events);
    if (eventTypes.length === 0)
      throw Error(
        'emitEvent: You are trying to emit an event without having declared the types of your events.\n' +
          `Make sure to add a property \`events\` on ${this.constructor.name}, for example: \n` +
          `class ${this.constructor.name} extends SmartContract {\n` +
          `  events = { 'my-event': Field }\n` +
          `}`
      );
    let eventNumber = eventTypes.sort().indexOf(type as string);
    if (eventNumber === -1)
      throw Error(
        `emitEvent: Unknown event type "${
          type as string
        }". The declared event types are: ${eventTypes.join(', ')}.`
      );
    let eventType = (this.events as this['events'])[type];
    let eventFields: Field[];
    if (eventTypes.length === 1) {
      // if there is just one event type, just store it directly as field elements
      eventFields = eventType.toFields(event);
    } else {
      // if there is more than one event type, also store its index, like in an enum, to identify the type later
      eventFields = [Field(eventNumber), ...eventType.toFields(event)];
    }
    party.body.events = Events.pushEvent(party.body.events, eventFields);
  }

  static runOutsideCircuit(run: () => void) {
    if (Mina.currentTransaction?.isFinalRunOutsideCircuit || inProver())
      Circuit.asProver(run);
  }

  // run all methods to collect metadata like how many sequence events they use -- if we don't have this information yet
  // TODO: this could also be used to quickly perform any invariant checks on parties construction
  // TODO: it would be even better to run the methods in "compile mode" here -- i.e. with variables which can't be read --,
  // to be able to give quick errors when people try to depend on variables for constructing their circuit (https://github.com/o1-labs/snarkyjs/issues/224)
  static analyzeMethods(address: PublicKey) {
    let ZkappClass = this as typeof SmartContract;
    let instance = new ZkappClass(address);
    let methodIntfs = ZkappClass._methods ?? [];
    if (
      !methodIntfs.every((m) => m.methodName in ZkappClass._methodMetadata) &&
      !inAnalyze()
    ) {
      for (let methodIntf of methodIntfs) {
        let { context, rows, digest } = analyzeMethod(
          ZkappPublicInput,
          methodIntf,
          (...args) => (instance as any)[methodIntf.methodName](...args),
          {
            self: selfParty(address),
            otherContext: { numberOfSequenceEvents: 0 },
          }
        );
        ZkappClass._methodMetadata[methodIntf.methodName] = {
          sequenceEvents: context?.otherContext?.numberOfSequenceEvents,
          rows,
          digest,
        };
      }
    }
    return ZkappClass._methodMetadata;
  }

  setValue<T>(maybeValue: SetOrKeep<T>, value: T) {
    Party.setValue(maybeValue, value);
  }

  // TBD: do we want to have setters for updates, e.g. this.permissions = ... ?
  // I'm hesitant to make the API even more magical / less explicit
  setPermissions(permissions: Permissions) {
    this.setValue(this.self.update.permissions, permissions);
  }
}

type Reducer<Action> = { actionType: AsFieldElements<Action> };

type ReducerReturn<Action> = {
  dispatch(action: Action): void;
  reduce<State>(
    actions: Action[][],
    stateType: AsFieldElements<State>,
    reduce: (state: State, action: Action) => State,
    initial: { state: State; actionsHash: Field },
    options?: { maxTransactionsWithActions?: number }
  ): {
    state: State;
    actionsHash: Field;
  };
};

function getReducer<A>(contract: SmartContract): ReducerReturn<A> {
  let reducer: Reducer<A> = ((contract as any)._ ??= {}).reducer;
  if (reducer === undefined)
    throw Error(
      'You are trying to use a reducer without having declared its type.\n' +
        `Make sure to add a property \`reducer\` on ${contract.constructor.name}, for example:
class ${contract.constructor.name} extends SmartContract {
  reducer = { actionType: Field };
}`
    );
  return {
    dispatch(action: A) {
      let party = contract.self;
      let eventFields = reducer.actionType.toFields(action);
      party.body.sequenceEvents = Events.pushEvent(
        party.body.sequenceEvents,
        eventFields
      );
      if (mainContext?.otherContext?.numberOfSequenceEvents !== undefined) {
        mainContext.otherContext.numberOfSequenceEvents += 1;
      }
    },

    reduce<S>(
      actionLists: A[][],
      stateType: AsFieldElements<S>,
      reduce: (state: S, action: A) => S,
      { state, actionsHash }: { state: S; actionsHash: Field },
      { maxTransactionsWithActions = 32 } = {}
    ): { state: S; actionsHash: Field } {
      if (actionLists.length > maxTransactionsWithActions) {
        throw Error(
          `reducer.reduce: Exceeded the maximum number of lists of actions, ${maxTransactionsWithActions}.
Use the optional \`maxTransactionsWithActions\` argument to increase this number.`
        );
      }
      let methodData = (
        contract.constructor as typeof SmartContract
      ).analyzeMethods(contract.address);
      let possibleActionsPerTransaction = [
        ...new Set(Object.values(methodData).map((o) => o.sequenceEvents)).add(
          0
        ),
      ].sort((x, y) => x - y);

      let possibleActionTypes = possibleActionsPerTransaction.map((n) =>
        circuitArray(reducer.actionType, n)
      );
      for (let i = 0; i < maxTransactionsWithActions; i++) {
        let actions = i < actionLists.length ? actionLists[i] : [];
        let length = actions.length;
        let lengths = possibleActionsPerTransaction.map((n) =>
          Circuit.witness(Bool, () => Bool(length === n))
        );
        // create dummy actions for the other possible action lengths,
        // -> because this needs to be a statically-sized computation we have to operate on all of them
        let actionss = possibleActionsPerTransaction.map((n, i) => {
          let type = possibleActionTypes[i];
          return Circuit.witness(type, () =>
            length === n ? actions : emptyValue(type)
          );
        });
        // for each action length, compute the events hash and then pick the actual one
        let eventsHashes = actionss.map((actions) => {
          let events = actions.map((u) => reducer.actionType.toFields(u));
          return Events.hash(events);
        });
        let eventsHash = Circuit.switch(lengths, Field, eventsHashes);
        let newActionsHash = Events.updateSequenceState(
          actionsHash,
          eventsHash
        );
        let isEmpty = lengths[0];
        // update state hash, if this is not an empty action
        actionsHash = Circuit.if(isEmpty, actionsHash, newActionsHash);
        // also, for each action length, compute the new state and then pick the actual one
        let newStates = actionss.map((actions) => {
          // we generate a new witness for the state so that this doesn't break if `apply` modifies the state
          let newState = Circuit.witness(stateType, () => {
            // TODO: why doesn't this work without the toConstant mapping?
            let { toFields, ofFields } = stateType;
            return ofFields(toFields(state).map((x) => x.toConstant()));
            // return state;
          });
          Circuit.assertEqual(newState, state);
          actions.forEach((action) => {
            newState = reduce(newState, action);
          });
          return newState;
        });
        // update state
        state = Circuit.switch(lengths, stateType, newStates);
      }
      contract.account.sequenceState.assertEquals(actionsHash);
      return { state, actionsHash };
    },
  };
}

function selfParty(address: PublicKey) {
  let body = Body.keepAll(address);
  return new (Party as any)(body, {}, true) as Party;
}

// per-smart-contract context for transaction construction
type ExecutionState = {
  transactionId: number;
  partyIndex: number;
  party: Party;
};

type DeployArgs = {
  verificationKey?: { data: string; hash: string | Field };
  zkappKey?: PrivateKey;
};

// functions designed to be called from a CLI
// TODO: this function is currently not used by the zkapp CLI, because it doesn't handle nonces properly in all cases
async function deploy<S extends typeof SmartContract>(
  SmartContract: S,
  {
    zkappKey,
    verificationKey,
    initialBalance,
    shouldSignFeePayer,
    feePayerKey,
    transactionFee,
    feePayerNonce,
    memo,
  }: {
    zkappKey: PrivateKey;
    verificationKey: { data: string; hash: string | Field };
    initialBalance?: number | string;
    feePayerKey?: PrivateKey;
    shouldSignFeePayer?: boolean;
    transactionFee?: string | number;
    feePayerNonce?: string | number;
    memo?: string;
  }
) {
  let address = zkappKey.toPublicKey();
  let tx = Mina.createUnsignedTransaction(() => {
    if (initialBalance !== undefined) {
      if (feePayerKey === undefined)
        throw Error(
          `When using the optional initialBalance argument, you need to also supply the fee payer's private key feePayerKey to sign the initial balance funding.`
        );
      // optional first party: the sender/fee payer who also funds the zkapp
      let amount = UInt64.fromString(String(initialBalance)).add(
        Mina.accountCreationFee()
      );
      let nonce =
        feePayerNonce !== undefined
          ? UInt32.fromString(String(feePayerNonce))
          : undefined;

      let party = Party.createSigned(feePayerKey, {
        isSameAsFeePayer: true,
        nonce,
      });
      party.balance.subInPlace(amount);
    }
    // main party: the zkapp account
    let zkapp = new SmartContract(address);
    zkapp.deploy({ verificationKey, zkappKey });
    // TODO: add send / receive methods on SmartContract which create separate parties
    // no need to bundle receive in the same party as deploy
    if (initialBalance !== undefined) {
      let amount = UInt64.fromString(String(initialBalance));
      zkapp.self.balance.addInPlace(amount);
    }
  });
  tx.transaction.memo = memo ?? '';
  if (shouldSignFeePayer) {
    if (feePayerKey === undefined || transactionFee === undefined) {
      throw Error(
        `When setting shouldSignFeePayer=true, you need to also supply feePayerKey (fee payer's private key) and transactionFee.`
      );
    }
    tx.transaction = addFeePayer(tx.transaction, feePayerKey, {
      transactionFee,
    });
  }
  // TODO modifying the json after calling to ocaml would avoid extra vk serialization.. but need to compute vk hash
  return tx.sign().toJSON();
}

function addFeePayer(
  { feePayer, otherParties, memo }: Parties,
  feePayerKey: PrivateKey | string,
  {
    transactionFee = 0 as number | string,
    feePayerNonce = undefined as number | string | undefined,
    memo: feePayerMemo = undefined as string | undefined,
  }
) {
  feePayer = cloneCircuitValue(feePayer);
  if (typeof feePayerKey === 'string')
    feePayerKey = PrivateKey.fromBase58(feePayerKey);
  let senderAddress = feePayerKey.toPublicKey();
  if (feePayerNonce === undefined) {
    let senderAccount = Mina.getAccount(senderAddress, getDefaultTokenId());
    feePayerNonce = senderAccount.nonce.toString();
  }
  let newMemo = memo;
  if (feePayerMemo) newMemo = Ledger.memoToBase58(feePayerMemo);
  feePayer.body.nonce = UInt32.fromString(`${feePayerNonce}`);
  feePayer.body.publicKey = senderAddress;
  feePayer.body.fee = UInt64.fromString(`${transactionFee}`);
  Party.signFeePayerInPlace(feePayer, feePayerKey);
  return { feePayer, otherParties, memo: newMemo };
}

function signFeePayer(
  transactionJson: string,
  feePayerKey: PrivateKey | string,
  {
    transactionFee = 0 as number | string,
    feePayerNonce = undefined as number | string | undefined,
    memo: feePayerMemo = undefined as string | undefined,
  }
) {
  let parties: Types.Json.Parties = JSON.parse(transactionJson);
  if (typeof feePayerKey === 'string')
    feePayerKey = PrivateKey.fromBase58(feePayerKey);
  let senderAddress = feePayerKey.toPublicKey();
  if (feePayerNonce === undefined) {
    let senderAccount = Mina.getAccount(senderAddress, getDefaultTokenId());
    feePayerNonce = senderAccount.nonce.toString();
  }
  if (feePayerMemo) parties.memo = Ledger.memoToBase58(feePayerMemo);
  parties.feePayer.body.nonce = `${feePayerNonce}`;
  parties.feePayer.body.publicKey = Ledger.publicKeyToString(senderAddress);
  parties.feePayer.body.fee = `${transactionFee}`;
  return signJsonTransaction(JSON.stringify(parties), feePayerKey);
}

// alternative API which can replace decorators, works in pure JS

/**
 * `declareMethods` can be used in place of the `@method` decorator
 * to declare SmartContract methods along with their list of arguments.
 * It should be placed _after_ the class declaration.
 * Here is an example of declaring a method `update`, which takes a single argument of type `Field`:
 * ```ts
 * class MyContract extends SmartContract {
 *   // ...
 *   update(x: Field) {
 *     // ...
 *   }
 * }
 * declareMethods(MyContract, { update: [Field] }); // `[Field]` is the list of arguments!
 * ```
 * Note that a method of the same name must still be defined on the class, just without the decorator.
 */
function declareMethods<T extends typeof SmartContract>(
  SmartContract: T,
  methodArguments: Record<string, AsFieldElements<unknown>[]>
) {
  for (let key in methodArguments) {
    let argumentTypes = methodArguments[key];
    let target = SmartContract.prototype;
    Reflect.metadata('design:paramtypes', argumentTypes)(target, key);
    let descriptor = Object.getOwnPropertyDescriptor(target, key)!;
    method(SmartContract.prototype, key as any, descriptor);
    Object.defineProperty(target, key, descriptor);
  }
}

/**
 * This module exposes APIs that are unstable, in the sense that the API surface is expected to change.
 * (Not unstable in the sense that they are less functional or tested than other parts.)
 */
class Experimental {
  static Reducer: (<
    T extends AsFieldElements<any>,
    A extends InferAsFieldElements<T>
  >(reducer: {
    actionType: T;
  }) => ReducerReturn<A>) & {
    initialActionsHash: Field;
  } = Object.defineProperty(
    function (reducer: any) {
      // we lie about the return value here, and instead overwrite this.reducer with a getter,
      // so we can get access to `this` inside functions on this.reducer (see constructor)
      return reducer;
    },
    'initialActionsHash',
    { get: Events.emptySequenceState }
  ) as any;
}
