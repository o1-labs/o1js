import 'reflect-metadata';
import { Gate, Pickles } from '../../../snarky.js';
import { Field, Bool } from '../../provable/wrapped.js';
import {
  AccountUpdate,
  Authorization,
  Body,
  Events,
  Permissions,
  TokenId,
  ZkappCommand,
  zkAppProver,
  ZkappPublicInput,
  LazyProof,
  AccountUpdateForest,
  AccountUpdateLayout,
  AccountUpdateTree,
} from './account-update.js';
import type { EventActionFilterOptions } from './graphql.js';
import {
  cloneCircuitValue,
  FlexibleProvablePure,
  InferProvable,
} from '../../provable/types/struct.js';
import { Provable, getBlindingValue, memoizationContext } from '../../provable/provable.js';
import * as Encoding from '../../../bindings/lib/encoding.js';
import {
  HashInput,
  Poseidon,
  hashConstant,
  isHashable,
  packToFields,
} from '../../provable/crypto/poseidon.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import * as Mina from './mina.js';
import { assertPreconditionInvariants, cleanPreconditionsCache } from './precondition.js';
import {
  analyzeMethod,
  compileProgram,
  computeMaxProofsVerified,
  Empty,
  MethodInterface,
  sortMethodArguments,
  VerificationKey,
} from '../../proof-system/zkprogram.js';
import { Proof, ProofClass } from '../../proof-system/proof.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import {
  InternalStateType,
  assertStatePrecondition,
  cleanStatePrecondition,
  getLayout,
} from './state.js';
import {
  inAnalyze,
  inCheckedComputation,
  inCompile,
  inProver,
} from '../../provable/core/provable-context.js';
import { Cache } from '../../proof-system/cache.js';
import { assert } from '../../provable/gadgets/common.js';
import { SmartContractBase } from './smart-contract-base.js';
import { ZkappStateLength } from './mina-instance.js';
import {
  SmartContractContext,
  accountUpdateLayout,
  smartContractContext,
} from './smart-contract-context.js';
import { assertPromise } from '../../util/assert.js';
import { ProvablePure, ProvableType } from '../../provable/types/provable-intf.js';
import { getReducer, Reducer } from './actions/reducer.js';
import { provable } from '../../provable/types/provable-derivers.js';

// external API
export { SmartContract, method, DeployArgs, declareMethods };

const reservedPropNames = new Set(['_methods', '_']);
type AsyncFunction = (...args: any) => Promise<any>;

/**
 * A decorator to use in a zkApp to mark a method as provable.
 * You can use inside your zkApp class as:
 *
 * ```
 * \@method async myMethod(someArg: Field) {
 *   // your code here
 * }
 * ```
 *
 * To return a value from the method, you have to explicitly declare the return type using the {@link method.returns} decorator:
 * ```
 * \@method.returns(Field)
 * async myMethod(someArg: Field): Promise<Field> {
 *   // your code here
 * }
 * ```
 */
function method<K extends string, T extends SmartContract>(
  target: T & {
    [k in K]: (...args: any) => Promise<void>;
  },
  methodName: K & string & keyof T,
  descriptor: PropertyDescriptor,
  returnType?: Provable<any>
) {
  const ZkappClass = target.constructor as typeof SmartContract;
  if (reservedPropNames.has(methodName)) {
    throw Error(`Property name ${methodName} is reserved.`);
  }
  if (typeof target[methodName] !== 'function') {
    throw Error(`@method decorator was applied to \`${methodName}\`, which is not a function.`);
  }
  let paramTypes: Provable<any>[] = Reflect.getMetadata('design:paramtypes', target, methodName);

  class SelfProof extends Proof<ZkappPublicInput, Empty> {
    static publicInputType = ZkappPublicInput;
    static publicOutputType = Empty;
    static tag = () => ZkappClass;
  }
  let internalMethodEntry = sortMethodArguments(
    ZkappClass.name,
    methodName,
    paramTypes,
    undefined,
    SelfProof
  );
  // add witness arguments for the publicKey (address) and tokenId
  let methodEntry = sortMethodArguments(
    ZkappClass.name,
    methodName,
    [PublicKey, Field, ...paramTypes],
    undefined,
    SelfProof
  );

  if (returnType !== undefined) {
    internalMethodEntry.returnType = returnType;
    methodEntry.returnType = returnType;
  }
  ZkappClass._methods ??= [];
  // FIXME: overriding a method implies pushing a separate method entry here, yielding two entries with the same name
  // this should only be changed once we no longer share the _methods array with the parent class (otherwise a subclass declaration messes up the parent class)
  ZkappClass._methods.push(methodEntry);
  let func = descriptor.value as AsyncFunction;
  descriptor.value = wrapMethod(func, ZkappClass, internalMethodEntry);
}

/**
 * A decorator to mark a zkApp method as provable, and declare its return type.
 *
 * ```
 * \@method.returns(Field)
 * async myMethod(someArg: Field): Promise<Field> {
 *   // your code here
 * }
 * ```
 */
method.returns = function <K extends string, T extends SmartContract, R extends ProvableType>(
  returnType: R
) {
  return function decorateMethod(
    target: T & {
      [k in K]: (...args: any) => Promise<InferProvable<R>>;
    },
    methodName: K & string & keyof T,
    descriptor: PropertyDescriptor
  ) {
    return method(target as any, methodName, descriptor, ProvableType.get(returnType));
  };
};

// do different things when calling a method, depending on the circumstance
function wrapMethod(
  method: AsyncFunction,
  ZkappClass: typeof SmartContract,
  methodIntf: MethodInterface
) {
  let methodName = methodIntf.methodName;
  let noPromiseError = `Expected \`${ZkappClass.name}.${methodName}()\` to return a promise.`;
  return async function wrappedMethod(this: SmartContract, ...actualArgs: any[]) {
    cleanStatePrecondition(this);
    // special case: any AccountUpdate that is passed as an argument to a method
    // is unlinked from its current location, to allow the method to link it to itself
    actualArgs.forEach((arg) => {
      if (arg instanceof AccountUpdate) {
        AccountUpdate.unlink(arg);
      }
    });

    let insideContract = smartContractContext.get();
    if (!insideContract) {
      const { id, context } = SmartContractContext.enter(this, selfAccountUpdate(this, methodName));
      try {
        if (inCompile() || inProver() || inAnalyze()) {
          // important to run this with a fresh accountUpdate everytime, otherwise compile messes up our circuits
          // because it runs this multiple times
          let proverData = inProver() ? zkAppProver.getData() : undefined;
          let txId = Mina.currentTransaction.enter({
            sender: proverData?.transaction.feePayer.body.publicKey,
            // TODO could pass an update with the fee payer's content here? probably not bc it's not accessed
            layout: new AccountUpdateLayout(),
            fetchMode: inProver() ? 'cached' : 'test',
            isFinalRunOutsideCircuit: false,
            numberOfRuns: undefined,
          });
          try {
            // inside prover / compile, the method is always called with the public input as first argument
            // -- so we can add assertions about it
            let publicInput = actualArgs.shift();
            let accountUpdate = this.self;

            // the blinding value is important because otherwise, putting callData on the transaction would leak information about the private inputs
            let blindingValue = Provable.witness(Field, getBlindingValue);
            // it's also good if we prove that we use the same blinding value across the method
            // that's why we pass the variable (not the constant) into a new context
            let memoCtx = memoizationContext() ?? {
              memoized: [],
              currentIndex: 0,
            };
            let id = memoizationContext.enter({ ...memoCtx, blindingValue });
            let result: unknown;
            try {
              let clonedArgs = actualArgs.map(cloneCircuitValue);
              result = await assertPromise(method.apply(this, clonedArgs), noPromiseError);
            } finally {
              memoizationContext.leave(id);
            }

            // connects our input + result with callData, so this method can be called
            let callDataFields = computeCallData(methodIntf, actualArgs, result, blindingValue);
            accountUpdate.body.callData = Poseidon.hash(callDataFields);
            ProofAuthorization.setKind(accountUpdate);

            debugPublicInput(accountUpdate);
            let calls = context.selfLayout.finalizeChildren();
            checkPublicInput(publicInput, accountUpdate, calls);

            // check the self accountUpdate right after calling the method
            // TODO: this needs to be done in a unified way for all account updates that are created
            assertPreconditionInvariants(accountUpdate);
            cleanPreconditionsCache(accountUpdate);
            assertStatePrecondition(this);
            return result;
          } finally {
            Mina.currentTransaction.leave(txId);
          }
        } else if (!Mina.currentTransaction.has()) {
          // outside a transaction, just call the method, but check precondition invariants
          let result = await assertPromise(method.apply(this, actualArgs), noPromiseError);
          // check the self accountUpdate right after calling the method
          // TODO: this needs to be done in a unified way for all account updates that are created
          assertPreconditionInvariants(this.self);
          cleanPreconditionsCache(this.self);
          assertStatePrecondition(this);
          return result;
        } else {
          // called smart contract at the top level, in a transaction!
          // => attach ours to the current list of account updates
          let accountUpdate = context.selfUpdate;

          // first, clone to protect against the method modifying arguments!
          // TODO: double-check that this works on all possible inputs, e.g. CircuitValue, o1js primitives
          let clonedArgs = cloneCircuitValue(actualArgs);

          // we run this in a "memoization context" so that we can remember witnesses for reuse when proving
          let blindingValue = getBlindingValue();
          let memoContext = { memoized: [], currentIndex: 0, blindingValue };
          let memoId = memoizationContext.enter(memoContext);
          let result: any;
          try {
            result = await assertPromise(
              method.apply(
                this,
                actualArgs.map((a, i) => {
                  return Provable.witness(methodIntf.args[i], () => a);
                })
              ),
              noPromiseError
            );
          } finally {
            memoizationContext.leave(memoId);
          }
          let { memoized } = memoContext;

          assertStatePrecondition(this);

          // connect our input + result with callData, so this method can be called
          let callDataFields = computeCallData(methodIntf, clonedArgs, result, blindingValue);
          accountUpdate.body.callData = Poseidon.hash(callDataFields);

          if (!Authorization.hasAny(accountUpdate)) {
            ProofAuthorization.setLazyProof(
              accountUpdate,
              {
                methodName: methodIntf.methodName,
                args: clonedArgs,
                ZkappClass,
                memoized,
                blindingValue,
              },
              Mina.currentTransaction.get().layout
            );
          }

          // transfer layout from the smart contract context to the transaction
          if (inCheckedComputation()) {
            Provable.asProver(() => {
              accountUpdate = Provable.toConstant(AccountUpdate, accountUpdate);
              context.selfLayout.toConstantInPlace();
            });
          }
          let txLayout = Mina.currentTransaction.get().layout;
          txLayout.pushTopLevel(accountUpdate);
          txLayout.setChildren(accountUpdate, context.selfLayout.finalizeChildren());

          return result;
        }
      } finally {
        smartContractContext.leave(id);
      }
    }

    // if we're here, this method was called inside _another_ smart contract method
    let parentAccountUpdate = insideContract.this.self;

    let { id, context: innerContext } = SmartContractContext.enter(
      this,
      selfAccountUpdate(this, methodName)
    );
    try {
      // we just reuse the blinding value of the caller for the callee
      let blindingValue = getBlindingValue();

      let runCalledContract = async () => {
        let constantArgs = methodIntf.args.map((type, i) =>
          Provable.toConstant(type, actualArgs[i])
        );
        let constantBlindingValue = blindingValue.toConstant();
        let accountUpdate = this.self;
        accountUpdate.body.callDepth = parentAccountUpdate.body.callDepth + 1;

        let memoContext = {
          memoized: [],
          currentIndex: 0,
          blindingValue: constantBlindingValue,
        };
        let memoId = memoizationContext.enter(memoContext);
        let result: any;
        try {
          result = await assertPromise(
            method.apply(this, constantArgs.map(cloneCircuitValue)),
            noPromiseError
          );
        } finally {
          memoizationContext.leave(memoId);
        }
        let { memoized } = memoContext;
        assertStatePrecondition(this);

        if (result !== undefined) {
          let { returnType } = methodIntf;
          assert(
            returnType !== undefined,
            "Bug: returnType is undefined but the method result isn't."
          );
          result = Provable.toConstant(returnType, result);
        }

        // store inputs + result in callData
        let callDataFields = computeCallData(
          methodIntf,
          constantArgs,
          result,
          constantBlindingValue
        );
        accountUpdate.body.callData = hashConstant(callDataFields);

        if (!Authorization.hasAny(accountUpdate)) {
          ProofAuthorization.setLazyProof(
            accountUpdate,
            {
              methodName: methodIntf.methodName,
              args: constantArgs,
              ZkappClass,
              memoized,
              blindingValue: constantBlindingValue,
            },
            Mina.currentTransaction()?.layout ?? new AccountUpdateLayout()
          );
        }
        // extract callee's account update layout
        let children = innerContext.selfLayout.finalizeChildren();

        return {
          accountUpdate,
          result: { result: result ?? null, children },
        };
      };

      // we have to run the called contract inside a witness block, to not affect the caller's circuit
      let {
        accountUpdate,
        result: { result, children },
      } = await AccountUpdate.witness<{
        result: any;
        children: AccountUpdateForest;
      }>(
        provable({
          result: methodIntf.returnType ?? provable(null),
          children: AccountUpdateForest,
        }),
        runCalledContract,
        { skipCheck: true }
      );

      // we're back in the _caller's_ circuit now, where we assert stuff about the method call

      // overwrite this.self with the witnessed update, so it's this one we access later in the caller method
      innerContext.selfUpdate = accountUpdate;

      // connect accountUpdate to our own. outside Provable.witness so compile knows the right structure when hashing children
      accountUpdate.body.callDepth = parentAccountUpdate.body.callDepth + 1;

      insideContract.selfLayout.pushTopLevel(accountUpdate);
      insideContract.selfLayout.setChildren(accountUpdate, children);

      // assert that we really called the right zkapp
      accountUpdate.body.publicKey.assertEquals(this.address);
      accountUpdate.body.tokenId.assertEquals(this.self.body.tokenId);

      // assert that the callee account update has proof authorization. everything else would have much worse security trade-offs,
      // because a one-time change of the callee semantics by using a signature could go unnoticed even if we monitor the callee's
      // onchain verification key
      assert(accountUpdate.body.authorizationKind.isProved, 'callee is proved');

      // assert that the inputs & outputs we have match what the callee put on its callData
      let callDataFields = computeCallData(methodIntf, actualArgs, result, blindingValue);
      let callData = Poseidon.hash(callDataFields);
      accountUpdate.body.callData.assertEquals(callData);
      return result;
    } finally {
      smartContractContext.leave(id);
    }
  };
}

function checkPublicInput(
  { accountUpdate, calls }: ZkappPublicInput,
  self: AccountUpdate,
  selfCalls: AccountUpdateForest
) {
  accountUpdate.assertEquals(self.hash());
  calls.assertEquals(selfCalls.hash);
}

/**
 * compute fields to be hashed as callData, in a way that the hash & circuit changes whenever
 * the method signature changes, i.e., the argument / return types represented as lists of field elements and the methodName.
 * see https://github.com/o1-labs/o1js/issues/303#issuecomment-1196441140
 */
function computeCallData(
  methodIntf: MethodInterface,
  argumentValues: any[],
  returnValue: any,
  blindingValue: Field
) {
  let { returnType, methodName } = methodIntf;
  let args = methodIntf.args.map((type, i) => {
    return { type: ProvableType.get(type), value: argumentValues[i] };
  });

  let input: HashInput = { fields: [], packed: [] };
  for (let { type, value } of args) {
    if (isHashable(type)) {
      input = HashInput.append(input, type.toInput(value));
    } else {
      input.fields!.push(Field(type.sizeInFields()), ...type.toFields(value));
    }
  }
  const totalArgFields = packToFields(input);
  let totalArgSize = Field(args.map(({ type }) => type.sizeInFields()).reduce((s, t) => s + t, 0));

  let returnSize = Field(returnType?.sizeInFields() ?? 0);
  input = { fields: [], packed: [] };
  if (isHashable(returnType)) {
    input = HashInput.append(input, returnType.toInput(returnValue));
  } else {
    input.fields!.push(...(returnType?.toFields(returnValue) ?? []));
  }
  let returnFields = packToFields(input);
  let methodNameFields = Encoding.stringToFields(methodName);
  return [
    // we have to encode the sizes of arguments / return value, so that fields can't accidentally shift
    // from one argument to another, or from arguments to the return value, or from the return value to the method name
    totalArgSize,
    ...totalArgFields,
    returnSize,
    ...returnFields,
    // we don't have to encode the method name size because the blinding value is fixed to one field element,
    // so method name fields can't accidentally become the blinding value and vice versa
    ...methodNameFields,
    blindingValue,
  ];
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
class SmartContract extends SmartContractBase {
  address: PublicKey;
  tokenId: Field;

  #executionState: ExecutionState | undefined;

  // here we store various metadata associated with a SmartContract subclass.
  // by initializing all of these to `undefined`, we ensure that
  // subclasses aren't sharing the same property with the base class and each other
  // FIXME: these are still shared between a subclass and its own subclasses, which means extending SmartContracts is broken
  static _methods?: MethodInterface[];
  static _methodMetadata?: Record<
    string,
    {
      actions: number;
      rows: number;
      digest: string;
      gates: Gate[];
      proofs: ProofClass[];
    }
  >; // keyed by method name
  static _provers?: Pickles.Prover[];
  static _verificationKey?: { data: string; hash: Field };

  /**
   * Returns a Proof type that belongs to this {@link SmartContract}.
   */
  static Proof() {
    let Contract = this;
    return class extends Proof<ZkappPublicInput, Empty> {
      static publicInputType = ZkappPublicInput;
      static publicOutputType = Empty;
      static tag = () => Contract;
    };
  }

  constructor(address: PublicKey, tokenId?: Field) {
    super();
    this.address = address;
    this.tokenId = tokenId ?? TokenId.default;
    Object.defineProperty(this, 'reducer', {
      set(this, reducer: Reducer<any>) {
        ((this as any)._ ??= {}).reducer = reducer;
      },
      get(this) {
        return getReducer(this);
      },
    });
  }

  /**
   * Compile your smart contract.
   *
   * This generates both the prover functions, needed to create proofs for running `@method`s,
   * and the verification key, needed to deploy your zkApp.
   *
   * Although provers and verification key are returned by this method, they are also cached internally and used when needed,
   * so you don't actually have to use the return value of this function.
   *
   * Under the hood, "compiling" means calling into the lower-level [Pickles and Kimchi libraries](https://o1-labs.github.io/proof-systems/kimchi/overview.html) to
   * create multiple prover & verifier indices (one for each smart contract method as part of a "step circuit" and one for the "wrap circuit" which recursively wraps
   * it so that proofs end up in the original finite field). These are fairly expensive operations, so **expect compiling to take at least 20 seconds**,
   * up to several minutes if your circuit is large or your hardware is not optimal for these operations.
   */
  static async compile({ cache = Cache.FileSystemDefault, forceRecompile = false } = {}) {
    let methodIntfs = this._methods ?? [];
    let methodKeys = methodIntfs.map(({ methodName }) => methodName);
    let methods = methodIntfs.map(({ methodName }) => {
      return async (
        publicInput: unknown,
        publicKey: PublicKey,
        tokenId: Field,
        ...args: unknown[]
      ) => {
        let instance = new this(publicKey, tokenId);
        await (instance as any)[methodName](publicInput, ...args);
      };
    });
    // run methods once to get information that we need already at compile time
    let methodsMeta = await this.analyzeMethods();
    let gates = methodKeys.map((k) => methodsMeta[k].gates);
    let proofs = methodKeys.map((k) => methodsMeta[k].proofs);
    let { verificationKey, provers, verify } = await compileProgram({
      publicInputType: ZkappPublicInput,
      publicOutputType: Empty,
      methodIntfs,
      methods,
      gates,
      proofs,
      proofSystemTag: this,
      cache,
      forceRecompile,
    });
    this._provers = provers;
    this._verificationKey = verificationKey;
    // TODO: instead of returning provers, return an artifact from which provers can be recovered
    return { verificationKey, provers, verify };
  }

  /**
   * Computes a hash of your smart contract, which will reliably change _whenever one of your method circuits changes_.
   * This digest is quick to compute. it is designed to help with deciding whether a contract should be re-compiled or
   * a cached verification key can be used.
   * @returns the digest, as a hex string
   */
  static async digest() {
    // TODO: this should use the method digests in a deterministic order!
    let methodData = await this.analyzeMethods();
    let hash = hashConstant(Object.values(methodData).map((d) => Field(BigInt('0x' + d.digest))));
    return hash.toBigInt().toString(16);
  }

  /**
   * The maximum number of proofs that are verified by any of the zkApp methods.
   * This is an internal parameter needed by the proof system.
   */
  static async getMaxProofsVerified() {
    let methodData = await this.analyzeMethods();
    return computeMaxProofsVerified(Object.values(methodData).map((d) => d.proofs.length));
  }

  /**
   * Deploys a {@link SmartContract}.
   *
   * ```ts
   * let tx = await Mina.transaction(sender, async () => {
   *   AccountUpdate.fundNewAccount(sender);
   *   await zkapp.deploy();
   * });
   * tx.sign([senderKey, zkAppKey]);
   * ```
   */
  async deploy({
    verificationKey,
  }: {
    verificationKey?: { data: string; hash: Field | string };
  } = {}) {
    let accountUpdate = this.newSelf('deploy');
    verificationKey ??= (this.constructor as typeof SmartContract)._verificationKey;
    if (verificationKey === undefined) {
      if (!Mina.getProofsEnabled()) {
        verificationKey = await VerificationKey.dummy();
      } else {
        throw Error(
          `\`${this.constructor.name}.deploy()\` was called but no verification key was found.\n` +
            `Try calling \`await ${this.constructor.name}.compile()\` first, this will cache the verification key in the background.`
        );
      }
    }
    let { hash: hash_, data } = verificationKey;
    let hash = Field.from(hash_);
    accountUpdate.account.verificationKey.set({ hash, data });
    accountUpdate.account.permissions.set(Permissions.default());
    accountUpdate.requireSignature();
    AccountUpdate.attachToTransaction(accountUpdate);

    // init if this account is not yet deployed or has no verification key on it
    let shouldInit =
      !Mina.hasAccount(this.address) ||
      Mina.getAccount(this.address).zkapp?.verificationKey === undefined;
    if (!shouldInit) return;
    else await this.init();
    let initUpdate = this.self;
    // switch back to the deploy account update so the user can make modifications to it
    this.#executionState = {
      transactionId: this.#executionState!.transactionId,
      accountUpdate,
    };
    // check if the entire state was overwritten, show a warning if not
    let isFirstRun = Mina.currentTransaction()?.numberOfRuns === 0;
    if (!isFirstRun) return;
    Provable.asProver(() => {
      if (initUpdate.update.appState.some(({ isSome }) => !isSome.toBoolean())) {
        console.warn(
          `WARNING: the \`init()\` method was called without overwriting the entire state. This means that your zkApp will lack
the \`provedState === true\` status which certifies that the current state was verifiably produced by proofs (and not arbitrarily set by the zkApp developer).
To make sure the entire state is reset, consider adding this line to the beginning of your \`init()\` method:
super.init();
`
        );
      }
    });
  }
  // TODO make this a @method and create a proof during `zk deploy` (+ add mechanism to skip this)
  /**
   * `SmartContract.init()` will be called only when a {@link SmartContract} will be first deployed, not for redeployment.
   * This method can be overridden as follows
   * ```
   * class MyContract extends SmartContract {
   *  init() {
   *    super.init();
   *    this.account.permissions.set(...);
   *    this.x.set(Field(1));
   *  }
   * }
   * ```
   */
  init() {
    // let accountUpdate = this.newSelf(); // this would emulate the behaviour of init() being a @method
    this.account.provedState.requireEquals(Bool(false));
    let accountUpdate = this.self;

    // set all state fields to 0
    for (let i = 0; i < ZkappStateLength; i++) {
      AccountUpdate.setValue(accountUpdate.body.update.appState[i], Field(0));
    }

    // for all explicitly declared states, set them to their default value
    let stateKeys = getLayout(this.constructor as typeof SmartContract).keys();
    for (let key of stateKeys) {
      let state = this[key as keyof this] as InternalStateType<any> | undefined;
      if (state !== undefined && state.defaultValue !== undefined) {
        state.set(state.defaultValue);
      }
    }

    AccountUpdate.attachToTransaction(accountUpdate);
  }

  /**
   * Use this command if the account update created by this SmartContract should be signed by the account owner,
   * instead of authorized with a proof.
   *
   * Note that the smart contract's {@link Permissions} determine which updates have to be (can be) authorized by a signature.
   *
   * If you only want to avoid creating proofs for quicker testing, we advise you to
   * use `LocalBlockchain({ proofsEnabled: false })` instead of `requireSignature()`. Setting
   * `proofsEnabled` to `false` allows you to test your transactions with the same authorization flow as in production,
   * with the only difference being that quick mock proofs are filled in instead of real proofs.
   */
  requireSignature() {
    this.self.requireSignature();
  }

  /**
   * Use this command if the account update created by this SmartContract should have no authorization on it,
   * instead of being authorized with a proof.
   *
   * WARNING: This is a method that should rarely be useful. If you want to disable proofs for quicker testing, take a look
   * at `LocalBlockchain({ proofsEnabled: false })`, which causes mock proofs to be created and doesn't require changing the
   * authorization flow.
   */
  skipAuthorization() {
    Authorization.setLazyNone(this.self);
  }

  /**
   * Returns the current {@link AccountUpdate} associated to this {@link SmartContract}.
   */
  get self(): AccountUpdate {
    let inTransaction = Mina.currentTransaction.has();
    let inSmartContract = smartContractContext.get();
    if (!inTransaction && !inSmartContract) {
      // TODO: it's inefficient to return a fresh account update everytime, would be better to return a constant "non-writable" account update,
      // or even expose the .get() methods independently of any account update (they don't need one)
      return selfAccountUpdate(this);
    }
    let transactionId = inTransaction ? Mina.currentTransaction.id() : NaN;
    // running a method changes which is the "current account update" of this smart contract
    // this logic also implies that when calling `this.self` inside a method on `this`, it will always
    // return the same account update uniquely associated with that method call.
    // it won't create new updates and add them to a transaction implicitly
    if (inSmartContract && inSmartContract.this === this) {
      let accountUpdate = inSmartContract.selfUpdate;
      this.#executionState = { accountUpdate, transactionId };
      return accountUpdate;
    }
    let executionState = this.#executionState;
    if (executionState !== undefined && executionState.transactionId === transactionId) {
      return executionState.accountUpdate;
    }
    // if in a transaction, but outside a @method call, we implicitly create an account update
    // which is stable during the current transaction -- as long as it doesn't get overridden by a method call
    let accountUpdate = selfAccountUpdate(this);
    this.#executionState = { transactionId, accountUpdate };
    return accountUpdate;
  }

  /**
   * Same as `SmartContract.self` but explicitly creates a new {@link AccountUpdate}.
   */
  newSelf(methodName?: string): AccountUpdate {
    let inTransaction = Mina.currentTransaction.has();
    let transactionId = inTransaction ? Mina.currentTransaction.id() : NaN;
    let accountUpdate = selfAccountUpdate(this, methodName);
    this.#executionState = { transactionId, accountUpdate };
    return accountUpdate;
  }

  #_senderState: { sender: PublicKey; transactionId: number };

  sender = {
    self: this as SmartContract,

    /**
     * The public key of the current transaction's sender account.
     *
     * Throws an error if not inside a transaction, or the sender wasn't passed in.
     *
     * **Warning**: The fact that this public key equals the current sender is not part of the proof.
     * A malicious prover could use any other public key without affecting the validity of the proof.
     *
     * Consider using `this.sender.getAndRequireSignature()` if you need to prove that the sender controls this account.
     */
    getUnconstrained(): PublicKey {
      // TODO this logic now has some overlap with this.self, we should combine them somehow
      // (but with care since the logic in this.self is a bit more complicated)
      if (!Mina.currentTransaction.has()) {
        throw Error(
          `this.sender is not available outside a transaction. Make sure you only use it within \`Mina.transaction\` blocks or smart contract methods.`
        );
      }
      let transactionId = Mina.currentTransaction.id();
      let sender;
      if (this.self.#_senderState?.transactionId === transactionId) {
        sender = this.self.#_senderState.sender;
      } else {
        sender = Provable.witness(PublicKey, () => Mina.sender());
        this.self.#_senderState = { transactionId, sender };
      }

      // we prove that the returned public key is not the empty key, in which case
      // `createSigned()` would skip adding the account update, and nothing is proved
      sender.x.assertNotEquals(0);
      return sender;
    },

    /**
     * Return a public key that is forced to sign this transaction.
     *
     * Note: This doesn't prove that the return value is the transaction sender, but it proves that whoever created
     * the transaction controls the private key associated with the returned public key.
     */
    getAndRequireSignature(): PublicKey {
      let sender = this.getUnconstrained();
      AccountUpdate.createSigned(sender);
      return sender;
    },
  };

  /**
   * Current account of the {@link SmartContract}.
   */
  get account() {
    return this.self.account;
  }
  /**
   * Current network state of the {@link SmartContract}.
   */
  get network() {
    return this.self.network;
  }
  /**
   * Current global slot on the network. This is the slot at which this transaction is included in a block. Since we cannot know this value
   * at the time of transaction construction, this only has the `assertBetween()` method but no `get()` (impossible to implement)
   * or `assertEquals()` (confusing, because the developer can't know the exact slot at which this will be included either)
   */
  get currentSlot() {
    return this.self.currentSlot;
  }

  /**
   * Approve an account update or tree / forest of updates. Doing this means you include the account update in the zkApp's public input,
   * which allows you to read and use its content in a proof, make assertions about it, and modify it.
   *
   * ```ts
   * `@method` myApprovingMethod(update: AccountUpdate) {
   *   this.approve(update);
   *
   *   // read balance on the account (for example)
   *   let balance = update.account.balance.getAndRequireEquals();
   * }
   * ```
   *
   * Under the hood, "approving" just means that the account update is made a child of the zkApp in the
   * tree of account updates that forms the transaction. Similarly, if you pass in an {@link AccountUpdateTree},
   * the entire tree will become a subtree of the zkApp's account update.
   *
   * Passing in a forest is a bit different, because it means you set the entire children of the zkApp's account update
   * at once. `approve()` will fail if the zkApp's account update already has children, to prevent you from accidentally
   * excluding important information from the public input.
   */
  approve(update: AccountUpdate | AccountUpdateTree | AccountUpdateForest) {
    this.self.approve(update);
  }

  send(args: { to: PublicKey | AccountUpdate | SmartContract; amount: number | bigint | UInt64 }) {
    return this.self.send(args);
  }

  /**
   * Balance of this {@link SmartContract}.
   */
  get balance() {
    return this.self.balance;
  }
  /**
   * A list of event types that can be emitted using this.emitEvent()`.
   */
  events: { [key: string]: FlexibleProvablePure<any> } = {};

  // TODO: not able to type event such that it is inferred correctly so far
  /**
   * Conditionally emits an event.
   *
   * Events will be emitted as a part of the transaction and can be collected by archive nodes.
   */
  emitEventIf<K extends keyof this['events']>(condition: Bool, type: K, event: any) {
    let accountUpdate = this.self;
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
    let newEvents = Events.pushEvent(accountUpdate.body.events, eventFields);
    accountUpdate.body.events = Provable.if(
      condition,
      Events,
      newEvents,
      accountUpdate.body.events
    );
  }

  /**
   * Emits an event. Events will be emitted as a part of the transaction and can be collected by archive nodes.
   */
  emitEvent<K extends keyof this['events']>(type: K, event: any) {
    this.emitEventIf(Bool(true), type, event);
  }

  /**
   * Asynchronously fetches events emitted by this {@link SmartContract} and returns an array of events with their corresponding types.
   * @param [start=UInt32.from(0)] - The start height of the events to fetch.
   * @param end - The end height of the events to fetch. If not provided, fetches events up to the latest height.
   * @returns A promise that resolves to an array of objects, each containing the event type and event data for the specified range.
   * @throws If there is an error fetching events from the Mina network.
   * @example
   * const startHeight = UInt32.from(1000);
   * const endHeight = UInt32.from(2000);
   * const events = await myZkapp.fetchEvents(startHeight, endHeight);
   * console.log(events);
   */
  async fetchEvents(
    start: UInt32 = UInt32.from(0),
    end?: UInt32
  ): Promise<
    {
      type: string;
      event: {
        data: ProvablePure<any>;
        transactionInfo: {
          transactionHash: string;
          transactionStatus: string;
          transactionMemo: string;
        };
      };
      blockHeight: UInt32;
      blockHash: string;
      parentBlockHash: string;
      globalSlot: UInt32;
      chainStatus: string;
    }[]
  > {
    // used to match field values back to their original type
    const sortedEventTypes = Object.keys(this.events).sort();
    if (sortedEventTypes.length === 0) {
      throw Error(
        'fetchEvents: You are trying to fetch events without having declared the types of your events.\n' +
          `Make sure to add a property \`events\` on ${this.constructor.name}, for example: \n` +
          `class ${this.constructor.name} extends SmartContract {\n` +
          `  events = { 'my-event': Field }\n` +
          `}\n` +
          `Or, if you want to access the events from the zkapp account ${this.address.toBase58()} without casting their types\n` +
          `then try Mina.fetchEvents('${this.address.toBase58()}') instead.`
      );
    }

    const queryFilterOptions: EventActionFilterOptions = {};
    if (start.greaterThan(UInt32.from(0)).toBoolean()) {
      queryFilterOptions.from = start;
    }
    if (end) {
      queryFilterOptions.to = end;
    }
    // filters all elements so that they are within the given range
    // only returns { type: "", event: [] } in a flat format
    let events = (await Mina.fetchEvents(this.address, this.self.body.tokenId, queryFilterOptions))
      .map((event) => {
        return event.events.map((eventData) => {
          let { events: _events, ...rest } = event;
          return {
            ...rest,
            event: eventData,
          };
        });
      })
      .flat();

    return events.map((eventData) => {
      // if there is only one event type, the event structure has no index and can directly be matched to the event type
      if (sortedEventTypes.length === 1) {
        let type = sortedEventTypes[0];
        let event = this.events[type].fromFields(eventData.event.data.map((f: string) => Field(f)));
        return {
          ...eventData,
          type,
          event: {
            data: event,
            transactionInfo: {
              transactionHash: eventData.event.transactionInfo.hash,
              transactionStatus: eventData.event.transactionInfo.status,
              transactionMemo: eventData.event.transactionInfo.memo,
            },
          },
        };
      } else {
        // if there are multiple events we have to use the index event[0] to find the exact event type
        let eventObjectIndex = Number(eventData.event.data[0]);
        let type = sortedEventTypes[eventObjectIndex];
        // all other elements of the array are values used to construct the original object, we can drop the first value since its just an index
        let eventProps = eventData.event.data.slice(1);
        let event = this.events[type].fromFields(eventProps.map((f: string) => Field(f)));
        return {
          ...eventData,
          type,
          event: {
            data: event,
            transactionInfo: {
              transactionHash: eventData.event.transactionInfo.hash,
              transactionStatus: eventData.event.transactionInfo.status,
              transactionMemo: eventData.event.transactionInfo.memo,
            },
          },
        };
      }
    });
  }

  static runOutsideCircuit(run: () => void) {
    if (Mina.currentTransaction()?.isFinalRunOutsideCircuit || inProver()) Provable.asProver(run);
  }

  // TODO: this could also be used to quickly perform any invariant checks on account updates construction
  /**
   * This function is run internally before compiling a smart contract, to collect metadata about what each of your
   * smart contract methods does.
   *
   * For external usage, this function can be handy because calling it involves running all methods in the same "mode" as `compile()` does,
   * so it serves as a quick-to-run check for whether your contract can be compiled without errors, which can greatly speed up iterating.
   *
   * `analyzeMethods()` will also return the number of `rows` of each of your method circuits (i.e., the number of constraints in the underlying proof system),
   * which is a good indicator for circuit size and the time it will take to create proofs.
   * To inspect the created circuit in detail, you can look at the returned `gates`.
   *
   * Note: If this function was already called before, it will short-circuit and just return the metadata collected the first time.
   *
   * @returns an object, keyed by method name, each entry containing:
   *  - `rows` the size of the constraint system created by this method
   *  - `digest` a digest of the method circuit
   *  - `actions` the number of actions the method dispatches
   *  - `gates` the constraint system, represented as an array of gates
   */
  static async analyzeMethods({ printSummary = false } = {}) {
    let ZkappClass = this as typeof SmartContract;
    let methodMetadata = (ZkappClass._methodMetadata ??= {});
    let methodIntfs = ZkappClass._methods ?? [];
    if (!methodIntfs.every((m) => m.methodName in methodMetadata) && !inAnalyze()) {
      let id: number;
      let insideSmartContract = !!smartContractContext.get();
      if (insideSmartContract) id = smartContractContext.enter(null);
      try {
        for (let methodIntf of methodIntfs) {
          let accountUpdate: AccountUpdate;
          let { rows, digest, gates, summary, proofs } = await analyzeMethod(
            ZkappPublicInput,
            methodIntf,
            async (publicInput, publicKey, tokenId, ...args) => {
              let instance: SmartContract = new ZkappClass(publicKey, tokenId);
              let result = await (instance as any)[methodIntf.methodName](publicInput, ...args);
              accountUpdate = instance.#executionState!.accountUpdate;
              return result;
            }
          );
          methodMetadata[methodIntf.methodName] = {
            actions: accountUpdate!.body.actions.data.length,
            rows,
            digest,
            gates,
            proofs,
          };
          if (printSummary) console.log(methodIntf.methodName, summary());
        }
      } finally {
        if (insideSmartContract) smartContractContext.leave(id!);
      }
    }
    return methodMetadata;
  }
}

function selfAccountUpdate(zkapp: SmartContract, methodName?: string) {
  let body = Body.keepAll(zkapp.address, zkapp.tokenId);
  let update = new (AccountUpdate as any)(body, {}, true) as AccountUpdate;
  update.label = methodName
    ? `${zkapp.constructor.name}.${methodName}()`
    : `${zkapp.constructor.name}, no method`;
  return update;
}

// per-smart-contract context for transaction construction
type ExecutionState = {
  transactionId: number;
  accountUpdate: AccountUpdate;
};

const SmartContractContext = {
  enter(self: SmartContract, selfUpdate: AccountUpdate) {
    let context: SmartContractContext = {
      this: self,
      selfUpdate,
      selfLayout: new AccountUpdateLayout(selfUpdate),
    };
    let id = smartContractContext.enter(context);
    return { id, context };
  },
};

type DeployArgs = { verificationKey?: { data: string; hash: string | Field } } | undefined;

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
  methodArguments: Record<string, Provable<unknown>[]>
) {
  for (let key in methodArguments) {
    let argumentTypes = methodArguments[key];
    let target = SmartContract.prototype;
    Reflect.metadata('design:paramtypes', argumentTypes)(target, key);
    let descriptor = Object.getOwnPropertyDescriptor(target, key)!;
    method(SmartContract.prototype as any, key as any, descriptor);
    Object.defineProperty(target, key, descriptor);
  }
}

const ProofAuthorization = {
  setKind({ body, id }: AccountUpdate, priorAccountUpdates?: AccountUpdateLayout) {
    body.authorizationKind.isSigned = Bool(false);
    body.authorizationKind.isProved = Bool(true);
    let hash = Provable.witness(Field, () => {
      let proverData = zkAppProver.getData();
      let isProver = proverData !== undefined;
      assert(
        isProver || priorAccountUpdates !== undefined,
        'Called `setKind()` outside the prover without passing in `priorAccountUpdates`.'
      );
      let myAccountUpdateId = isProver ? proverData.accountUpdate.id : id;
      let priorAccountUpdatesFlat = priorAccountUpdates?.toFlatList({
        mutate: false,
      });
      priorAccountUpdatesFlat ??= proverData.transaction.accountUpdates;
      priorAccountUpdatesFlat = priorAccountUpdatesFlat.filter((a) => a.id !== myAccountUpdateId);
      let accountUpdate = [...priorAccountUpdatesFlat]
        .reverse()
        .find((body_) =>
          body_.update.verificationKey.isSome
            .and(body_.tokenId.equals(body.tokenId))
            .and(body_.publicKey.equals(body.publicKey))
            .toBoolean()
        );
      if (accountUpdate !== undefined) {
        return accountUpdate.body.update.verificationKey.value.hash;
      }
      try {
        let account = Mina.getAccount(body.publicKey, body.tokenId);
        return account.zkapp?.verificationKey?.hash ?? Field(0);
      } catch {
        return Field(0);
      }
    });
    body.authorizationKind.verificationKeyHash = hash;
  },
  setLazyProof(
    accountUpdate: AccountUpdate,
    proof: Omit<LazyProof, 'kind'>,
    priorAccountUpdates: AccountUpdateLayout
  ) {
    this.setKind(accountUpdate, priorAccountUpdates);
    accountUpdate.authorization = {};
    accountUpdate.lazyAuthorization = { ...proof, kind: 'lazy-proof' };
  },
};

/**
 * this is useful to debug a very common error: when the consistency check between
 * -) the account update that went into the public input, and
 * -) the account update constructed by the prover
 * fails.
 * toggling this will print the two account updates in addition to the unhelpful failed assertion error when the check fails,
 * making it easier to see where the problem lies.
 * TODO refine this into a good error message that's always used, not just for debugging
 * TODO find or write library that can print nice JS object diffs
 */
const DEBUG_PUBLIC_INPUT_CHECK = false;

function debugPublicInput(accountUpdate: AccountUpdate) {
  if (!DEBUG_PUBLIC_INPUT_CHECK) return;

  // connect the public input to the account update & child account updates we created
  Provable.asProver(() => {
    diffRecursive(accountUpdate, zkAppProver.getData());
  });
}

function diffRecursive(
  prover: AccountUpdate,
  inputData: {
    transaction: ZkappCommand;
    index: number;
    accountUpdate: AccountUpdate;
  }
) {
  let { transaction, index, accountUpdate: input } = inputData;
  diff(transaction, index, prover.toPretty(), input.toPretty());
  // TODO
  let proverChildren = accountUpdateLayout()?.get(prover)?.children.mutable;
  if (proverChildren === undefined) return;

  // collect input children
  let inputChildren: AccountUpdate[] = [];
  let callDepth = input.body.callDepth;
  for (let i = index; i < transaction.accountUpdates.length; i++) {
    let update = transaction.accountUpdates[i];
    if (update.body.callDepth <= callDepth) break;
    if (update.body.callDepth === callDepth + 1) inputChildren.push(update);
  }

  let nChildren = inputChildren.length;
  for (let i = 0; i < nChildren; i++) {
    let inputChild = inputChildren[i];
    let child = proverChildren[i].mutable;
    if (!child) return;
    diffRecursive(child, { transaction, index, accountUpdate: inputChild });
  }
}

// TODO: print a nice diff string instead of the two objects
// something like `expect` or `json-diff`, but web-compatible
function diff(transaction: ZkappCommand, index: number, prover: any, input: any) {
  delete prover.id;
  delete prover.callDepth;
  delete input.id;
  delete input.callDepth;
  if (JSON.stringify(prover) !== JSON.stringify(input)) {
    console.log('transaction:', ZkappCommand.toPretty(transaction));
    console.log('index', index);
    console.log('inconsistent account updates:');
    console.log('update created by the prover:');
    console.log(prover);
    console.log('update created in transaction block:');
    console.log(input);
  }
}
