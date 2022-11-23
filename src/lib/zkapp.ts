import {
  Field,
  Bool,
  ProvablePure,
  Ledger,
  Pickles,
  Poseidon as Poseidon_,
  Provable,
} from '../snarky.js';
import {
  Circuit,
  circuitArray,
  provable,
  cloneCircuitValue,
  getBlindingValue,
  memoizationContext,
  toConstant,
  Struct,
} from './circuit_value.js';
import {
  Body,
  AccountUpdate,
  signJsonTransaction,
  ZkappCommand,
  Permissions,
  SetOrKeep,
  ZkappPublicInput,
  Events,
  SequenceEvents,
  Authorization,
  CallForest,
  TokenId,
  AccountUpdatesLayout,
  smartContractContext,
  zkAppProver,
  ZkappStateLength,
} from './account_update.js';
import { PrivateKey, PublicKey } from './signature.js';
import * as Mina from './mina.js';
import { UInt32, UInt64 } from './int.js';
import {
  assertPreconditionInvariants,
  cleanPreconditionsCache,
} from './precondition.js';
import {
  getPreviousProofsForProver,
  MethodInterface,
  sortMethodArguments,
  compileProgram,
  Proof,
  emptyValue,
  analyzeMethod,
  inCheckedComputation,
  snarkContext,
  inProver,
  inAnalyze,
  methodArgumentsToConstant,
  isAsFields,
  methodArgumentTypesAndValues,
  GenericArgument,
} from './proof_system.js';
import { assertStatePrecondition, cleanStatePrecondition } from './state.js';
import { Types } from '../provable/types.js';
import { Poseidon } from './hash.js';
import * as Encoding from './encoding.js';

// external API
export {
  SmartContract,
  method,
  deploy,
  DeployArgs,
  signFeePayer,
  declareMethods,
  Callback,
  Account,
  VerificationKey,
  Reducer,
};

const reservedPropNames = new Set(['_methods', '_']);

/**
 * A decorator to use in a zkApp to mark a method as callable by anyone.
 * You can use inside your zkApp class as:
 *
 * ```
 * \@method myMethod(someArg: Field) {
 *   // your code here
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
  let paramTypes: Provable<any>[] = Reflect.getMetadata(
    'design:paramtypes',
    target,
    methodName
  );
  let returnType: Provable<any> = Reflect.getMetadata(
    'design:returntype',
    target,
    methodName
  );

  class SelfProof extends Proof<ZkappPublicInput> {
    static publicInputType = ZkappPublicInput;
    static tag = () => ZkappClass;
  }
  let internalMethodEntry = sortMethodArguments(
    ZkappClass.name,
    methodName,
    paramTypes,
    SelfProof
  );
  // add witness arguments for the publicKey (address) and tokenId
  let methodEntry = sortMethodArguments(
    ZkappClass.name,
    methodName,
    [PublicKey, Field, ...paramTypes],
    SelfProof
  );

  if (isAsFields(returnType)) {
    internalMethodEntry.returnType = returnType;
    methodEntry.returnType = returnType;
  }
  ZkappClass._methods ??= [];
  ZkappClass._methods.push(methodEntry);
  ZkappClass._maxProofsVerified ??= 0;
  ZkappClass._maxProofsVerified = Math.max(
    ZkappClass._maxProofsVerified,
    methodEntry.proofArgs.length
  );
  let func = descriptor.value;
  descriptor.value = wrapMethod(func, ZkappClass, internalMethodEntry);
}

// do different things when calling a method, depending on the circumstance
function wrapMethod(
  method: Function,
  ZkappClass: typeof SmartContract,
  methodIntf: MethodInterface
) {
  let methodName = methodIntf.methodName;
  return function wrappedMethod(this: SmartContract, ...actualArgs: any[]) {
    cleanStatePrecondition(this);
    // TODO: the callback case is actually more similar to the composability case below,
    // should reconcile with that to get the same callData hashing
    if (!smartContractContext.has() || smartContractContext()?.isCallback) {
      return smartContractContext.runWith(
        smartContractContext() ?? {
          this: this,
          methodCallDepth: 0,
          isCallback: false,
          selfUpdate: selfAccountUpdate(this, methodName),
        },
        (context) => {
          if (inCheckedComputation() && !context.isCallback) {
            // important to run this with a fresh accountUpdate everytime, otherwise compile messes up our circuits
            // because it runs this multiple times
            let [, result] = Mina.currentTransaction.runWith(
              {
                sender: undefined,
                accountUpdates: [],
                fetchMode: inProver() ? 'cached' : 'test',
                isFinalRunOutsideCircuit: false,
                numberOfRuns: undefined,
              },
              () => {
                // inside prover / compile, the method is always called with the public input as first argument
                // -- so we can add assertions about it
                let publicInput = actualArgs.shift();
                let accountUpdate = this.self;

                // the blinding value is important because otherwise, putting callData on the transaction would leak information about the private inputs
                let blindingValue = Circuit.witness(Field, getBlindingValue);
                // it's also good if we prove that we use the same blinding value across the method
                // that's why we pass the variable_ (not the constant) into a new context
                let context = memoizationContext() ?? {
                  memoized: [],
                  currentIndex: 0,
                };
                let [, result] = memoizationContext.runWith(
                  { ...context, blindingValue },
                  () => method.apply(this, actualArgs)
                );

                // connects our input + result with callData, so this method can be called
                let callDataFields = computeCallData(
                  methodIntf,
                  actualArgs,
                  result,
                  blindingValue
                );
                accountUpdate.body.callData = Poseidon.hash(callDataFields);
                accountUpdate.body.authorizationKind.isSigned = Bool(false);
                accountUpdate.body.authorizationKind.isProved = Bool(true);

                // compute `caller` field from `isDelegateCall` and a context determined by the transaction
                let callerContext = Circuit.witness(
                  CallForest.callerContextType,
                  () => {
                    let { accountUpdate } = zkAppProver.getData();
                    return CallForest.computeCallerContext(accountUpdate);
                  }
                );
                CallForest.addCallers([accountUpdate], callerContext);

                // connect the public input to the accountUpdate & child account updates we created
                if (DEBUG_PUBLIC_INPUT_CHECK) {
                  Circuit.asProver(() => {
                    // TODO: print a nice diff string instead of the two objects
                    // something like `expect` or `json-diff`, but web-compatible
                    function diff(prover: any, input: any) {
                      delete prover.id;
                      delete prover.callDepth;
                      delete input.id;
                      delete input.callDepth;
                      if (JSON.stringify(prover) !== JSON.stringify(input)) {
                        console.log(
                          'transaction:',
                          ZkappCommand.toPretty(transaction)
                        );
                        console.log('index', index);
                        console.log('inconsistent account updates:');
                        console.log('update created by the prover:');
                        console.log(prover);
                        console.log('update created in transaction block:');
                        console.log(input);
                      }
                    }
                    function diffRecursive(
                      prover: AccountUpdate,
                      input: AccountUpdate
                    ) {
                      diff(prover.toPretty(), input.toPretty());
                      let nChildren = input.children.accountUpdates.length;
                      for (let i = 0; i < nChildren; i++) {
                        let inputChild = input.children.accountUpdates[i];
                        let child = prover.children.accountUpdates[i];
                        if (!inputChild || !child) return;
                        diffRecursive(child, inputChild);
                      }
                    }

                    let {
                      accountUpdate: inputUpdate,
                      transaction,
                      index,
                    } = zkAppProver.getData();
                    diffRecursive(accountUpdate, inputUpdate);
                  });
                }
                checkPublicInput(publicInput, accountUpdate);

                // check the self accountUpdate right after calling the method
                // TODO: this needs to be done in a unified way for all account updates that are created
                assertPreconditionInvariants(accountUpdate);
                cleanPreconditionsCache(accountUpdate);
                assertStatePrecondition(this);
                return result;
              }
            );
            return result;
          } else if (!Mina.currentTransaction.has()) {
            // outside a transaction, just call the method, but check precondition invariants
            let result = method.apply(this, actualArgs);
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
            if (!context.isCallback) {
              Mina.currentTransaction()?.accountUpdates.push(accountUpdate);
            }

            // first, clone to protect against the method modifying arguments!
            // TODO: double-check that this works on all possible inputs, e.g. CircuitValue, snarkyjs primitives
            let clonedArgs = cloneCircuitValue(actualArgs);

            // we run this in a "memoization context" so that we can remember witnesses for reuse when proving
            let blindingValue = getBlindingValue();
            let [{ memoized }, result] = memoizationContext.runWith(
              {
                memoized: [],
                currentIndex: 0,
                blindingValue,
              },
              () => method.apply(this, actualArgs)
            );
            assertStatePrecondition(this);

            // connect our input + result with callData, so this method can be called
            let callDataFields = computeCallData(
              methodIntf,
              actualArgs,
              result,
              blindingValue
            );
            accountUpdate.body.callData = Poseidon.hash(callDataFields);

            if (!Authorization.hasAny(accountUpdate)) {
              Authorization.setLazyProof(accountUpdate, {
                methodName: methodIntf.methodName,
                args: clonedArgs,
                // proofs actually don't have to be cloned
                previousProofs: getPreviousProofsForProver(
                  actualArgs,
                  methodIntf
                ),
                ZkappClass,
                memoized,
                blindingValue,
              });
            }
            return result;
          }
        }
      )[1];
    }

    // if we're here, this method was called inside _another_ smart contract method
    let parentAccountUpdate = smartContractContext.get().this.self;
    let methodCallDepth = smartContractContext.get().methodCallDepth;
    let [, result] = smartContractContext.runWith(
      {
        this: this,
        methodCallDepth: methodCallDepth + 1,
        isCallback: false,
        selfUpdate: selfAccountUpdate(this, methodName),
      },
      () => {
        // if the call result is not undefined but there's no known returnType, the returnType was probably not annotated properly,
        // so we have to explain to the user how to do that
        let { returnType } = methodIntf;
        let noReturnTypeError =
          `To return a result from ${methodIntf.methodName}() inside another zkApp, you need to declare the return type.\n` +
          `This can be done by annotating the type at the end of the function signature. For example:\n\n` +
          `@method ${methodIntf.methodName}(): Field {\n` +
          `  // ...\n` +
          `}\n\n` +
          `Note: Only types built out of \`Field\` are valid return types. This includes snarkyjs primitive types and custom CircuitValues.`;
        // if we're lucky, analyzeMethods was already run on the callee smart contract, and we can catch this error early
        if (
          (ZkappClass as any)._methodMetadata[methodIntf.methodName]
            ?.hasReturn &&
          returnType === undefined
        ) {
          throw Error(noReturnTypeError);
        }
        // we just reuse the blinding value of the caller for the callee
        let blindingValue = getBlindingValue();

        let runCalledContract = () => {
          let constantArgs = methodArgumentsToConstant(methodIntf, actualArgs);
          let constantBlindingValue = blindingValue.toConstant();
          let accountUpdate = this.self;
          accountUpdate.body.callDepth = parentAccountUpdate.body.callDepth + 1;
          accountUpdate.parent = parentAccountUpdate;

          let [{ memoized }, result] = memoizationContext.runWith(
            {
              memoized: [],
              currentIndex: 0,
              blindingValue: constantBlindingValue,
            },
            () => method.apply(this, constantArgs)
          );
          assertStatePrecondition(this);

          if (result !== undefined) {
            if (returnType === undefined) {
              throw Error(noReturnTypeError);
            } else {
              result = toConstant(returnType, result);
            }
          }

          // store inputs + result in callData
          let callDataFields = computeCallData(
            methodIntf,
            constantArgs,
            result,
            constantBlindingValue
          );
          accountUpdate.body.callData = Poseidon_.hash(callDataFields, false);

          if (!Authorization.hasAny(accountUpdate)) {
            Authorization.setLazyProof(accountUpdate, {
              methodName: methodIntf.methodName,
              args: constantArgs,
              previousProofs: getPreviousProofsForProver(
                constantArgs,
                methodIntf
              ),
              ZkappClass,
              memoized,
              blindingValue: constantBlindingValue,
            });
          }
          return { accountUpdate, result: result ?? null };
        };

        // we have to run the called contract inside a witness block, to not affect the caller's circuit
        // however, if this is a nested call -- the caller is already called by another contract --,
        // then we're already in a witness block, and shouldn't open another one
        let { accountUpdate, result } =
          methodCallDepth === 0
            ? AccountUpdate.witness<any>(
                returnType ?? provable(null),
                runCalledContract,
                { skipCheck: true }
              )
            : runCalledContract();

        // we're back in the _caller's_ circuit now, where we assert stuff about the method call

        // connect accountUpdate to our own. outside Circuit.witness so compile knows the right structure when hashing children
        accountUpdate.body.callDepth = parentAccountUpdate.body.callDepth + 1;
        accountUpdate.parent = parentAccountUpdate;
        // beware: we don't include the callee's children in the caller circuit
        // nothing is asserted about them -- it's the callee's task to check their children
        accountUpdate.children.callsType = { type: 'Witness' };
        parentAccountUpdate.children.accountUpdates.push(accountUpdate);

        // assert that we really called the right zkapp
        accountUpdate.body.publicKey.assertEquals(this.address);
        accountUpdate.body.tokenId.assertEquals(this.self.body.tokenId);

        // assert that the inputs & outputs we have match what the callee put on its callData
        let callDataFields = computeCallData(
          methodIntf,
          actualArgs,
          result,
          blindingValue
        );
        let callData = Poseidon.hash(callDataFields);
        accountUpdate.body.callData.assertEquals(callData);

        // caller circuits should be Delegate_call by default, except if they're called at the top level
        let isTopLevel = Circuit.witness(Bool, () => {
          // TODO: this logic is fragile.. need better way of finding out if parent is the prover account update or not
          let isProverUpdate =
            inProver() &&
            zkAppProver
              .getData()
              .accountUpdate.body.publicKey.equals(
                parentAccountUpdate.body.publicKey
              )
              .toBoolean();
          let parentCallDepth = isProverUpdate
            ? zkAppProver.getData().accountUpdate.body.callDepth
            : CallForest.computeCallDepth(parentAccountUpdate);
          return Bool(parentCallDepth === 0);
        });
        parentAccountUpdate.isDelegateCall = isTopLevel.not();

        return result;
      }
    );
    return result;
  };
}

function checkPublicInput(
  { accountUpdate, calls }: ZkappPublicInput,
  self: AccountUpdate
) {
  let otherInput = self.toPublicInput();
  accountUpdate.assertEquals(otherInput.accountUpdate);
  calls.assertEquals(otherInput.calls);
}

/**
 * compute fields to be hashed as callData, in a way that the hash & circuit changes whenever
 * the method signature changes, i.e., the argument / return types represented as lists of field elements and the methodName.
 * see https://github.com/o1-labs/snarkyjs/issues/303#issuecomment-1196441140
 */
function computeCallData(
  methodIntf: MethodInterface,
  argumentValues: any[],
  returnValue: any,
  blindingValue: Field
) {
  let { returnType, methodName } = methodIntf;
  let args = methodArgumentTypesAndValues(methodIntf, argumentValues);
  let argSizesAndFields: Field[][] = args.map(({ type, value }) => [
    Field(type.sizeInFields()),
    ...type.toFields(value),
  ]);
  let totalArgSize = Field(
    args.map(({ type }) => type.sizeInFields()).reduce((s, t) => s + t, 0)
  );
  let totalArgFields = argSizesAndFields.flat();
  let returnSize = Field(returnType?.sizeInFields() ?? 0);
  let returnFields = returnType?.toFields(returnValue) ?? [];
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

class Callback<Result> extends GenericArgument {
  instance: SmartContract;
  methodIntf: MethodInterface & { returnType: Provable<Result> };
  args: any[];

  result?: Result;
  accountUpdate: AccountUpdate;

  static create<T extends SmartContract, K extends keyof T>(
    instance: T,
    methodName: K,
    args: T[K] extends (...args: infer A) => any ? A : never
  ) {
    let ZkappClass = instance.constructor as typeof SmartContract;
    let methodIntf_ = (ZkappClass._methods ?? []).find(
      (i) => i.methodName === methodName
    );
    if (methodIntf_ === undefined)
      throw Error(
        `Callback: could not find method ${ZkappClass.name}.${String(
          methodName
        )}`
      );
    let methodIntf = {
      ...methodIntf_,
      returnType: methodIntf_.returnType ?? provable(null),
    };

    // call the callback, leveraging composability (if this is inside a smart contract method)
    // to prove to the outer circuit that we called it
    let result = (instance[methodName] as Function)(...args);
    let accountUpdate = instance.self;

    let callback = new Callback<any>({
      instance,
      methodIntf,
      args,
      result,
      accountUpdate,
      isEmpty: false,
    });

    return callback;
  }

  private constructor(self: Callback<any>) {
    super();
    Object.assign(this, self);
  }
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
  tokenId: Field;

  #executionState: ExecutionState | undefined;
  static _methods?: MethodInterface[];
  static _methodMetadata: Record<
    string,
    { sequenceEvents: number; rows: number; digest: string; hasReturn: boolean }
  > = {}; // keyed by method name
  static _provers?: Pickles.Prover[];
  static _maxProofsVerified?: 0 | 1 | 2;
  static _verificationKey?: { data: string; hash: Field };

  /**
   * Returns a Proof type that belongs to this {@link SmartContract}.
   */
  static Proof() {
    let Contract = this;
    return class extends Proof<ZkappPublicInput> {
      static publicInputType = ZkappPublicInput;
      static tag = () => Contract;
    };
  }

  constructor(address: PublicKey, tokenId?: Field) {
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
   * create two prover & verifier indices (one for the "step circuit" which combines all of your smart contract methods into one circuit,
   * and one for the "wrap circuit" which wraps it so that proofs end up in the original finite field). These are fairly expensive
   * operations, so **expect compiling to take at least 20 seconds**, up to several minutes if your circuit is large or your hardware
   * is not optimal for these operations.
   */
  static async compile() {
    let methodIntfs = this._methods ?? [];
    let methods = methodIntfs.map(({ methodName }) => {
      return (
        publicInput: unknown,
        publicKey: PublicKey,
        tokenId: Field,
        ...args: unknown[]
      ) => {
        let instance = new this(publicKey, tokenId);
        (instance as any)[methodName](publicInput, ...args);
      };
    });
    // run methods once to get information that we need already at compile time
    this.analyzeMethods();
    let { getVerificationKeyArtifact, provers, verify } = compileProgram(
      ZkappPublicInput,
      methodIntfs,
      methods,
      this
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

  /**
   * Computes a hash of your smart contract, which will reliably change _whenever one of your method circuits changes_.
   * This digest is quick to compute. it is designed to help with deciding whether a contract should be re-compiled or
   * a cached verification key can be used.
   * @returns the digest, as a hex string
   */
  static digest() {
    // TODO: this should use the method digests in a deterministic order!
    let methodData = this.analyzeMethods();
    let hash = Poseidon_.hash(
      Object.values(methodData).map((d) => Field(BigInt('0x' + d.digest))),
      false
    );
    return hash.toBigInt().toString(16);
  }

  /**
   * Deploys a {@link SmartContract}.
   *
   * ```ts
   * let tx = await Mina.transaction(feePayer, () => {
   *    AccountUpdate.fundNewAccount(feePayer, { initialBalance });
   *    zkapp.deploy({ zkappKey });
   * });
   * ```
   */
  deploy({
    verificationKey,
    zkappKey,
  }: {
    verificationKey?: { data: string; hash: Field | string };
    zkappKey?: PrivateKey;
  } = {}) {
    let accountUpdate = this.newSelf();
    verificationKey ??= (this.constructor as any)._verificationKey;
    if (verificationKey !== undefined) {
      let { hash: hash_, data } = verificationKey;
      let hash = typeof hash_ === 'string' ? Field(hash_) : hash_;
      this.setValue(accountUpdate.update.verificationKey, { hash, data });
    }
    this.setValue(accountUpdate.update.permissions, Permissions.default());
    accountUpdate.sign(zkappKey);
    AccountUpdate.attachToTransaction(accountUpdate);

    // init if this account is not yet deployed or has no verification key on it
    let shouldInit =
      !Mina.hasAccount(this.address) ||
      Mina.getAccount(this.address).verificationKey === undefined;
    if (!shouldInit) return;
    if (zkappKey) this.init(zkappKey);
    else this.init();
    let initUpdate = this.self;
    // switch back to the deploy account update so the user can make modifications to it
    this.#executionState = {
      transactionId: this.#executionState!.transactionId,
      accountUpdate,
    };
    // check if the entire state was overwritten, show a warning if not
    let isFirstRun = Mina.currentTransaction()?.numberOfRuns === 0;
    if (!isFirstRun) return;
    Circuit.asProver(() => {
      if (
        initUpdate.update.appState.some(({ isSome }) => !isSome.toBoolean())
      ) {
        console.warn(`WARNING: the \`init()\` method was called without overwriting the entire state. This means that your zkApp will lack
the \`provedState === true\` status which certifies that the current state was verifiably produced by proofs (and not arbitrarily set by the zkApp developer).
To make sure the entire state is reset, consider adding this line to the beginning of your \`init()\` method:
super.init();
`);
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
   *    this.setPermissions();
   *    this.x.set(Field(1));
   *  }
   * }
   * ```
   */
  init(zkappKey?: PrivateKey) {
    // let accountUpdate = this.newSelf(); // this would emulate the behaviour of init() being a @method
    // TODO: enable this if provedState is available, to make this callable only once
    // this.account.provedState.assertEquals(Bool(false));
    zkappKey?.toPublicKey().assertEquals(this.address);
    let accountUpdate = this.self;
    for (let i = 0; i < ZkappStateLength; i++) {
      AccountUpdate.setValue(accountUpdate.body.update.appState[i], Field(0));
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
   * @deprecated `this.sign()` is deprecated in favor of `this.requireSignature()`
   */
  sign(zkappKey?: PrivateKey) {
    this.self.sign(zkappKey);
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
    let inSmartContract = smartContractContext.has();
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
    if (inSmartContract && smartContractContext.get().this === this) {
      let accountUpdate = smartContractContext.get().selfUpdate;
      this.#executionState = { accountUpdate, transactionId };
      return accountUpdate;
    }
    let executionState = this.#executionState;
    if (
      executionState !== undefined &&
      executionState.transactionId === transactionId
    ) {
      return executionState.accountUpdate;
    }
    // if in a transaction, but outside a @method call, we implicitly create an account update
    // which is stable during the current transaction -- as long as it doesn't get overridden by a method call
    let accountUpdate = selfAccountUpdate(this);
    this.#executionState = { transactionId, accountUpdate };
    return accountUpdate;
  }
  // same as this.self, but explicitly creates a _new_ account update
  /**
   * Same as `SmartContract.self` but explicitly creates a new {@link AccountUpdate}.
   */
  newSelf(): AccountUpdate {
    let inTransaction = Mina.currentTransaction.has();
    let transactionId = inTransaction ? Mina.currentTransaction.id() : NaN;
    let accountUpdate = selfAccountUpdate(this);
    this.#executionState = { transactionId, accountUpdate };
    return accountUpdate;
  }

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
   * Token of the {@link SmartContract}.
   */
  get token() {
    return this.self.token();
  }

  /**
   * Approve an account update or callback. This will include the account update in the zkApp's public input,
   * which means it allows you to read and use its content in a proof, make assertions about it, and modify it.
   *
   * If this is called with a callback as the first parameter, it will first extract the account update produced by that callback.
   * The extracted account update is returned.
   *
   * ```ts
   * \@method myApprovingMethod(callback: Callback) {
   *   let approvedUpdate = this.approve(callback);
   * }
   * ```
   *
   * Under the hood, "approving" just means that the account update is made a child of the zkApp in the
   * tree of account updates that forms the transaction.
   * The second parameter `layout` allows you to also make assertions about the approved update's _own_ children,
   * by specifying a certain expected layout of children. See {@link AccountUpdate.Layout}.
   *
   * @param updateOrCallback
   * @param layout
   * @returns The account update that was approved (needed when passing in a Callback)
   */
  approve(
    updateOrCallback: AccountUpdate | Callback<any>,
    layout?: AccountUpdatesLayout
  ) {
    let accountUpdate =
      updateOrCallback instanceof AccountUpdate
        ? updateOrCallback
        : Circuit.witness(AccountUpdate, () => updateOrCallback.accountUpdate);
    this.self.approve(accountUpdate, layout);
    return accountUpdate;
  }

  send(args: {
    to: PublicKey | AccountUpdate;
    amount: number | bigint | UInt64;
  }) {
    return this.self.send(args);
  }

  /**
   * Token symbol of this token.
   */
  get tokenSymbol() {
    return this.self.tokenSymbol;
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
  events: { [key: string]: ProvablePure<any> } = {};

  // TODO: not able to type event such that it is inferred correctly so far
  /**
   * Emits an event. Events will be emitted as a part of the transaction and can be collected by archive nodes.
   */
  emitEvent<K extends keyof this['events']>(type: K, event: any) {
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
    accountUpdate.body.events = Events.pushEvent(
      accountUpdate.body.events,
      eventFields
    );
  }

  /**
   * Fetches a list of events that have been emitted by this {@link SmartContract}.
   */
  async fetchEvents(
    start: UInt32 = UInt32.from(0),
    end?: UInt32
  ): Promise<{ type: string; event: ProvablePure<any> }[]> {
    // filters all elements so that they are within the given range
    // only returns { type: "", event: [] } in a flat format
    let events = (await Mina.fetchEvents(this.address, this.self.body.tokenId))
      .filter((el: any) => {
        let slot = UInt32.from(el.slot);
        return end === undefined
          ? start.lte(slot).toBoolean()
          : start.lte(slot).toBoolean() && slot.lte(end).toBoolean();
      })
      .map((el: any) => el.events)
      .flat();

    // used to match field values back to their original type
    let sortedEventTypes = Object.keys(this.events).sort();

    return events.map((event: any) => {
      // if there is only one event type, the event structure has no index and can directly be matched to the event type
      if (sortedEventTypes.length === 1) {
        let type = sortedEventTypes[0];
        return {
          type,
          event: this.events[type].fromFields(
            event.map((f: string) => Field(f))
          ),
        };
      } else {
        // if there are multiple events we have to use the index event[0] to find the exact event type
        let type = sortedEventTypes[event[0]];
        // all other elements of the array are values used to construct the original object, we can drop the first value since its just an index
        event.shift();
        return {
          type,
          event: this.events[type].fromFields(
            event.map((f: string) => Field(f))
          ),
        };
      }
    });
  }

  static runOutsideCircuit(run: () => void) {
    if (Mina.currentTransaction()?.isFinalRunOutsideCircuit || inProver())
      Circuit.asProver(run);
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
   *
   * Note: If this function was already called before, it will short-circuit and just return the metadata collected the first time.
   *
   * @returns an object, keyed by method name, each entry containing:
   *  - `rows` the size of the constraint system created by this method
   *  - `digest` a digest of the method circuit
   *  - `hasReturn` a boolean indicating whether the method returns a value
   *  - `sequenceEvents` the number of actions the method dispatches
   */
  static analyzeMethods() {
    let methodMetaData = this._methodMetadata;
    let ZkappClass = this as typeof SmartContract;
    let methodIntfs = ZkappClass._methods ?? [];
    if (
      !methodIntfs.every((m) => m.methodName in methodMetaData) &&
      !inAnalyze()
    ) {
      if (snarkContext.get().inRunAndCheck) {
        let err = new Error(
          'Can not analyze methods inside Circuit.runAndCheck, because this creates a circuit nested in another circuit'
        );
        // EXCEPT if the code that calls this knows that it can first run `analyzeMethods` OUTSIDE runAndCheck and try again
        (err as any).bootstrap = () => ZkappClass.analyzeMethods();
        throw err;
      }
      for (let methodIntf of methodIntfs) {
        let accountUpdate: AccountUpdate;
        let { rows, digest, result } = analyzeMethod(
          ZkappPublicInput,
          methodIntf,
          (publicInput, publicKey, tokenId, ...args) => {
            let instance: SmartContract = new ZkappClass(publicKey, tokenId);
            let result = (instance as any)[methodIntf.methodName](
              publicInput,
              ...args
            );
            accountUpdate = instance.#executionState!.accountUpdate;
            return result;
          }
        );
        ZkappClass._methodMetadata[methodIntf.methodName] = {
          sequenceEvents: accountUpdate!.body.sequenceEvents.data.length,
          rows,
          digest,
          hasReturn: result !== undefined,
        };
      }
    }
    return ZkappClass._methodMetadata;
  }

  setValue<T>(maybeValue: SetOrKeep<T>, value: T) {
    AccountUpdate.setValue(maybeValue, value);
  }

  // TBD: do we want to have setters for updates, e.g. this.permissions = ... ?
  // I'm hesitant to make the API even more magical / less explicit
  /**
   * Changes the {@link Permissions} of this {@link SmartContract}.
   */
  setPermissions(permissions: Permissions) {
    this.setValue(this.self.update.permissions, permissions);
  }
}

type Reducer<Action> = { actionType: ProvablePure<Action> };

type ReducerReturn<Action> = {
  /**
   * Dispatches an {@link Action}. Similar to normal {@link Event}s,
   * {@link Action}s can be stored by archive nodes and later reduced within a {@link SmartContract} method
   * to change the state of the contract accordingly
   *
   * ```ts
   * this.reducer.dispatch(Field(1)); // emits one action
   * ```
   *
   * */
  dispatch(action: Action): void;
  /**
   * Reduces a list of {@link Action}s, similar to `Array.reduce()`.
   *
   * ```ts
   *  let pendingActions = this.reducer.getActions({
   *    fromActionHash: actionsHash,
   *  });
   *
   *  let { state: newState, actionsHash: newActionsHash } =
   *  this.reducer.reduce(
   *     pendingActions,
   *     Field,
   *     (state: Field, _action: Field) => {
   *       return state.add(1);
   *     },
   *     { state: initialState, actionsHash: initialActionsHash  }
   *   );
   * ```
   *
   */
  reduce<State>(
    actions: Action[][],
    stateType: Provable<State>,
    reduce: (state: State, action: Action) => State,
    initial: { state: State; actionsHash: Field },
    options?: { maxTransactionsWithActions?: number }
  ): {
    state: State;
    actionsHash: Field;
  };
  /**
   * Fetches the list of previously emitted {@link Action}s by this {@link SmartContract}.
   * ```ts
   * let pendingActions = this.reducer.getActions({
   *    fromActionHash: actionsHash,
   * });
   * ```
   */
  getActions({
    fromActionHash,
    endActionHash,
  }: {
    fromActionHash?: Field;
    endActionHash?: Field;
  }): Action[][];
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
      let accountUpdate = contract.self;
      let eventFields = reducer.actionType.toFields(action);
      accountUpdate.body.sequenceEvents = SequenceEvents.pushEvent(
        accountUpdate.body.sequenceEvents,
        eventFields
      );
    },

    reduce<S>(
      actionLists: A[][],
      stateType: Provable<S>,
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
      ).analyzeMethods();
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
          return SequenceEvents.hash(events);
        });
        let eventsHash = Circuit.switch(lengths, Field, eventsHashes);
        let newActionsHash = SequenceEvents.updateSequenceState(
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
            let { toFields, fromFields, toAuxiliary } = stateType;
            return fromFields(
              toFields(state).map((x) => x.toConstant()),
              toAuxiliary(state)
            );
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
    getActions({
      fromActionHash,
      endActionHash,
    }: {
      fromActionHash?: Field;
      endActionHash?: Field;
    }): A[][] {
      let actionsForAccount: A[][] = [];

      Circuit.asProver(() => {
        // if the fromActionHash is the empty state, we fetch all events
        fromActionHash = fromActionHash
          ?.equals(SequenceEvents.emptySequenceState())
          .toBoolean()
          ? undefined
          : fromActionHash;

        // used to determine start and end values in string
        let start: string | undefined = fromActionHash
          ? Ledger.fieldToBase58(fromActionHash)
          : undefined;
        let end: string | undefined = endActionHash
          ? Ledger.fieldToBase58(endActionHash)
          : undefined;

        let actions = Mina.getActions(contract.address, contract.self.tokenId);

        // gets the start/end indices of our array slice
        let startIndex = start
          ? actions.findIndex((e) => e.hash === start) + 1
          : 0;
        let endIndex = end
          ? actions.findIndex((e) => e.hash === end) + 1
          : undefined;

        // slices the array so we only get the wanted range between fromActionHash and endActionHash
        actionsForAccount = actions
          .slice(startIndex, endIndex === 0 ? undefined : endIndex)
          .map((event: { hash: string; actions: string[][] }) =>
            // putting our string-Fields back into the original action type
            event.actions.map((action: string[]) =>
              reducer.actionType.fromFields(
                action.map((fieldAsString: string) => Field(fieldAsString))
              )
            )
          );
      });
      return actionsForAccount;
    },
  };
}

class VerificationKey extends Struct({
  ...provable({ data: String, hash: Field }),
  toJSON({ data }: { data: string }) {
    return data;
  },
}) {}

function selfAccountUpdate(zkapp: SmartContract, methodName?: string) {
  let body = Body.keepAll(zkapp.address);
  if (zkapp.tokenId) {
    body.tokenId = zkapp.tokenId;
    body.caller = zkapp.tokenId;
  }
  let update = new (AccountUpdate as any)(body, {}, true) as AccountUpdate;
  update.label = methodName
    ? `${zkapp.constructor.name}.${methodName}()`
    : `${zkapp.constructor.name}, no method`;
  return update;
}

// per-smart-contract context for transaction construction
type ExecutionState = { transactionId: number; accountUpdate: AccountUpdate };

type DeployArgs =
  | {
      verificationKey?: { data: string; hash: string | Field };
      zkappKey?: PrivateKey;
    }
  | undefined;

// functions designed to be called from a CLI
// TODO: this function is currently not used by the zkapp CLI, because it doesn't handle nonces properly in all cases
async function deploy<S extends typeof SmartContract>(
  SmartContract: S,
  {
    zkappKey,
    verificationKey,
    initialBalance,
    feePayer,
    tokenId = TokenId.default,
  }: {
    zkappKey: PrivateKey;
    verificationKey: { data: string; hash: string | Field };
    initialBalance?: number | string;
    feePayer?: Mina.FeePayerSpec;
    tokenId?: Field;
  }
) {
  let address = zkappKey.toPublicKey();
  let feePayerKey =
    feePayer instanceof PrivateKey ? feePayer : feePayer?.feePayerKey;
  let tx = await Mina.transaction(feePayer, () => {
    if (initialBalance !== undefined) {
      if (feePayerKey === undefined)
        throw Error(
          `When using the optional initialBalance argument, you need to also supply the fee payer's private key as part of the \`feePayer\` argument, to sign the initial balance funding.`
        );
      // optional first accountUpdate: the sender/fee payer who also funds the zkapp
      let amount = UInt64.from(String(initialBalance)).add(
        Mina.accountCreationFee()
      );
      let feePayerAddress = feePayerKey.toPublicKey();
      let accountUpdate = AccountUpdate.defaultAccountUpdate(feePayerAddress);
      accountUpdate.body.useFullCommitment = Bool(true);
      accountUpdate.balance.subInPlace(amount);
      Mina.currentTransaction()?.accountUpdates.push(accountUpdate);
    }
    // main accountUpdate: the zkapp account
    let zkapp = new SmartContract(address, tokenId);
    zkapp.deploy({ verificationKey, zkappKey });
    // TODO: add send / receive methods on SmartContract which create separate account updates
    // no need to bundle receive in the same accountUpdate as deploy
    if (initialBalance !== undefined) {
      let amount = UInt64.from(String(initialBalance));
      zkapp.self.balance.addInPlace(amount);
    }
  });
  return tx.sign().toJSON();
}

function Account(address: PublicKey, tokenId?: Field) {
  if (smartContractContext.has()) {
    return AccountUpdate.create(address, tokenId).account;
  } else {
    return AccountUpdate.defaultAccountUpdate(address, tokenId).account;
  }
}

function addFeePayer(
  { feePayer, accountUpdates, memo }: ZkappCommand,
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
    let senderAccount = Mina.getAccount(senderAddress, TokenId.default);
    feePayerNonce = senderAccount.nonce.toString();
  }
  let newMemo = memo;
  if (feePayerMemo) newMemo = Ledger.memoToBase58(feePayerMemo);
  feePayer.body.nonce = UInt32.from(`${feePayerNonce}`);
  feePayer.body.publicKey = senderAddress;
  feePayer.body.fee = UInt64.from(`${transactionFee}`);
  AccountUpdate.signFeePayerInPlace(feePayer, feePayerKey);
  return { feePayer, accountUpdates, memo: newMemo };
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
  let zkappCommand: Types.Json.ZkappCommand = JSON.parse(transactionJson);
  if (typeof feePayerKey === 'string')
    feePayerKey = PrivateKey.fromBase58(feePayerKey);
  let senderAddress = feePayerKey.toPublicKey();
  if (feePayerNonce === undefined) {
    let senderAccount = Mina.getAccount(senderAddress, TokenId.default);
    feePayerNonce = senderAccount.nonce.toString();
  }
  if (feePayerMemo) zkappCommand.memo = Ledger.memoToBase58(feePayerMemo);
  zkappCommand.feePayer.body.nonce = `${feePayerNonce}`;
  zkappCommand.feePayer.body.publicKey =
    Ledger.publicKeyToString(senderAddress);
  zkappCommand.feePayer.body.fee = `${transactionFee}`;
  return signJsonTransaction(JSON.stringify(zkappCommand), feePayerKey);
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
  methodArguments: Record<string, Provable<unknown>[]>
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

type InferProvablePure<T extends ProvablePure<any>> = T extends ProvablePure<
  infer U
>
  ? U
  : never;

const Reducer: (<
  T extends ProvablePure<any>,
  A extends InferProvablePure<T>
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
  { get: SequenceEvents.emptySequenceState }
) as any;

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
