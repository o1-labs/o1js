import {
  Field,
  Bool,
  AsFieldElements,
  Ledger,
  Pickles,
  Types,
} from '../snarky';
import {
  Circuit,
  circuitArray,
  cloneCircuitValue,
  pickOne,
} from './circuit_value';
import {
  Body,
  Party,
  signJsonTransaction,
  Parties,
  Permissions,
  SetOrKeep,
  ZkappPublicInput,
  Events,
} from './party';
import { PrivateKey, PublicKey } from './signature';
import * as Mina from './mina';
import { UInt32, UInt64 } from './int';
import {
  mainContext,
  inCheckedComputation,
  inCompile,
  withContext,
  inProver,
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
  digestProgram,
} from './proof_system';
import { assertStatePrecondition, cleanStatePrecondition } from './state';

export { deploy, DeployArgs, signFeePayer, declareMethods };

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
export function method<T extends SmartContract>(
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
          inCompile: inCompile(),
          inProver: inProver(),
          // important to run this with a fresh party everytime, otherwise we compile messes up our circuits
          // because it runs this multiple times
          self: selfParty(this.address),
        },
        () => {
          // inside prover / compile, the method is always called with the public input as first argument
          // -- so we can add assertions about it
          let publicInput = actualArgs[0];
          actualArgs = actualArgs.slice(1);
          // FIXME: figure out correct way to constrain public input https://github.com/o1-labs/snarkyjs/issues/98
          let tail = Field.zero;
          publicInput[0].assertEquals(publicInput[0]);
          // checkPublicInput(publicInput, self, tail);

          // outside a transaction, just call the method, but check precondition invariants
          let result = method.apply(this, actualArgs);
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

function toPublicInput(self: Party, tail: Field) {
  // TODO hash together party with tail in the right way
  let atParty = self.hash();
  let transaction = Ledger.hashTransactionChecked(atParty);
  return { transaction, atParty };
}
function checkPublicInput(
  [transaction, atParty]: ZkappPublicInput,
  self: Party,
  tail: Field
) {
  // ATM, we always compute the public input in checked mode to make assertEqual pass
  let otherInput = toPublicInput(self, tail);
  atParty.assertEquals(otherInput.atParty);
  transaction.assertEquals(otherInput.transaction);
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
export class SmartContract {
  address: PublicKey;

  private _executionState: ExecutionState | undefined;
  static _methods?: MethodInterface[];
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
    Object.defineProperty(this, 'stateUpdate', {
      set(this, stateUpdate: StateUpdate<any, any>) {
        ((this as any)._ ??= {}).stateUpdate = stateUpdate;
      },
      get(this) {
        return getStateUpdate(this);
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
    let methodIntfs = this._methods ?? [];
    let methods = methodIntfs.map(({ methodName }) => {
      return (...args: unknown[]) => {
        let instance = new this(address);
        (instance as any)[methodName](...args);
      };
    });
    return digestProgram(ZkappPublicInput, methodIntfs, methods, this, {
      self: selfParty(address),
    });
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

  static stateUpdate: (<S, U, SU extends StateUpdate<S, U>>(
    stateUpdate: SU
  ) => {
    emit: (update: U) => void;
    applyUpdates(
      state: S,
      stateHash: Field,
      updateLists: U[][],
      possibleUpdatesPerTransaction: number[],
      maxTransactionsWithUpdates?: number
    ): {
      state: S;
      stateHash: Field;
    };
  }) & {
    initialStateHash: Field;
  } = Object.defineProperty(
    function (stateUpdate: any) {
      // we lie about the return value here, and instead overwrite this.stateUpdate with a getter,
      // so we can get access to `this` inside functions on this.stateUpdate (see constructor)
      return stateUpdate;
    },
    'initialStateHash',
    { get: Events.emptySequenceState }
  ) as any;

  setValue<T>(maybeValue: SetOrKeep<T>, value: T) {
    Party.setValue(maybeValue, value);
  }

  // TBD: do we want to have setters for updates, e.g. this.permissions = ... ?
  // I'm hesitant to make the API even more magical / less explicit
  setPermissions(permissions: Permissions) {
    this.setValue(this.self.update.permissions, permissions);
  }
}

type StateUpdate<State, Update> = {
  state: AsFieldElements<State>;
  update: AsFieldElements<Update>;
  apply(state: State, update: Update): State;
};

function getStateUpdate<S, U>(contract: SmartContract) {
  let stateUpdate: StateUpdate<S, U> = ((contract as any)._ ??= {}).stateUpdate;
  if (stateUpdate === undefined)
    throw Error(
      'stateUpdate.emit: You are trying to emit a state update without having declared its type.\n' +
        `Make sure to add a property \`stateUpdate\` on ${contract.constructor.name}, for example:
class ${contract.constructor.name} extends SmartContract {
  stateUpdate = {
    state: Field,
    update: Field,
    apply(state: Field, update: Field) {
      return state.add(update);
    }
  }
}`
    );
  return {
    emit: (update: U) => {
      let party = contract.self;
      let eventFields = stateUpdate.update.toFields(update);
      party.body.sequenceEvents = Events.pushEvent(
        party.body.sequenceEvents,
        eventFields
      );
    },

    applyUpdates(
      state: S,
      stateHash: Field,
      updateLists: U[][],
      possibleUpdatesPerTransaction: number[],
      maxTransactionsWithUpdates = 4
    ): { state: S; stateHash: Field } {
      if (updateLists.length > maxTransactionsWithUpdates) {
        throw Error(
          `stateUpdate.applyUpdates: Exceeded the maximum number of lists of updates, ${maxTransactionsWithUpdates}.
Use the optional \`maxTransactionsWithUpdates\` argument to increase this number.`
        );
      }
      // move 0 to the start of possibleUpdatesPerTransaction
      if (possibleUpdatesPerTransaction.includes(0)) {
        possibleUpdatesPerTransaction = possibleUpdatesPerTransaction.splice(
          possibleUpdatesPerTransaction.indexOf(0),
          1
        );
      }
      possibleUpdatesPerTransaction = [0].concat(possibleUpdatesPerTransaction);
      let possibleUpdateTypes = possibleUpdatesPerTransaction.map((n) =>
        circuitArray(stateUpdate.update, n)
      );
      for (let i = 0; i < maxTransactionsWithUpdates; i++) {
        let updates = i < updateLists.length ? updateLists[i] : [];
        let length = updates.length;
        let lengths = possibleUpdatesPerTransaction.map((n) =>
          Circuit.witness(Bool, () => Bool(length === n))
        );
        // create dummy updates for the other possible update lengths,
        // -> because this needs to be a statically-sized computation we have to operate on all of them
        let updatess = possibleUpdatesPerTransaction.map((n, i) => {
          let type = possibleUpdateTypes[i];
          return Circuit.witness(type, () =>
            length === n ? updates : emptyValue(type)
          );
        });
        // for each update length, compute the events hash and then pick the actual one
        let eventsHashes = updatess.map((updates) => {
          let events = updates.map((u) => stateUpdate.update.toFields(u));
          return Events.hash(events);
        });
        let eventsHash = pickOne(lengths, Field, eventsHashes);
        let newStateHash = Events.updateSequenceState(stateHash, eventsHash);
        let isEmpty = lengths[0];
        // update state hash, if this is not an empty update
        stateHash = Circuit.if(isEmpty, stateHash, newStateHash);
        // also, for each update length, compute the new state and then pick the actual one
        let newStates = updatess.map((updates) => {
          // we generate a new witness for the state so that this doesn't break if `apply` modifies the state
          let newState = Circuit.witness(stateUpdate.state, () => {
            // TODO: why doesn't this work without the toConstant mapping?
            let { toFields, ofFields } = stateUpdate.state;
            return ofFields(toFields(state).map((x) => x.toConstant()));
            // return state;
          });
          Circuit.assertEqual(newState, state);
          updates.forEach((update) => {
            newState = stateUpdate.apply(newState, update);
          });
          return newState;
        });
        // update state
        state = Circuit.pickOne(lengths, stateUpdate.state, newStates);
      }
      contract.account.sequenceState.assertEquals(stateHash);
      return { state, stateHash };
    },
  };
}

function emptyValue<T>(type: AsFieldElements<T>) {
  return type.ofFields(Array(type.sizeInFields()).fill(Field.zero));
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
    let senderAccount = Mina.getAccount(senderAddress);
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
    let senderAccount = Mina.getAccount(senderAddress);
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
