import { Types } from '../bindings/mina-transaction/types.js';
import { Gate, Pickles, ProvablePure } from '../snarky.js';
import { Field, Bool } from './core.js';
import {
  AccountUpdate,
  AccountUpdatesLayout,
  Authorization,
  Body,
  Events,
  Permissions,
  Actions,
  SetOrKeep,
  smartContractContext,
  TokenId,
  ZkappCommand,
  zkAppProver,
  ZkappPublicInput,
  ZkappStateLength,
  SmartContractContext,
} from './account_update.js';
import {
  cloneCircuitValue,
  FlexibleProvablePure,
  InferProvable,
  provable,
  Struct,
  toConstant,
} from './circuit_value.js';
import { Provable, getBlindingValue, memoizationContext } from './provable.js';
import * as Encoding from '../bindings/lib/encoding.js';
import { Poseidon, hashConstant } from './hash.js';
import { UInt32, UInt64 } from './int.js';
import * as Mina from './mina.js';
import {
  assertPreconditionInvariants,
  cleanPreconditionsCache,
} from './precondition.js';
import {
  analyzeMethod,
  compileProgram,
  Empty,
  emptyValue,
  GenericArgument,
  getPreviousProofsForProver,
  isAsFields,
  methodArgumentsToConstant,
  methodArgumentTypesAndValues,
  MethodInterface,
  Proof,
  sortMethodArguments,
} from './proof_system.js';
import { PrivateKey, PublicKey } from './signature.js';
import { assertStatePrecondition, cleanStatePrecondition } from './state.js';
import {
  inAnalyze,
  inCompile,
  inProver,
  snarkContext,
} from './provable-context.js';

// external API
export {
  SmartContract,
  method,
  DeployArgs,
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

  class SelfProof extends Proof<ZkappPublicInput, Empty> {
    static publicInputType = ZkappPublicInput;
    static publicOutputType = Empty;
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
  // FIXME: overriding a method implies pushing a separate method entry here, yielding two entries with the same name
  // this should only be changed once we no longer share the _methods array with the parent class (otherwise a subclass declaration messes up the parent class)
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
    // special case: any AccountUpdate that is passed as an argument to a method
    // is unlinked from its current location, to allow the method to link it to itself
    actualArgs.forEach((arg) => {
      if (arg instanceof AccountUpdate) {
        AccountUpdate.unlink(arg);
      }
    });

    let insideContract = smartContractContext.get();
    if (!insideContract) {
      const context: SmartContractContext = {
        this: this,
        methodCallDepth: 0,
        selfUpdate: selfAccountUpdate(this, methodName),
      };
      let id = smartContractContext.enter(context);
      try {
        if (inCompile() || inProver() || inAnalyze()) {
          // important to run this with a fresh accountUpdate everytime, otherwise compile messes up our circuits
          // because it runs this multiple times
          let proverData = inProver() ? zkAppProver.getData() : undefined;
          let txId = Mina.currentTransaction.enter({
            sender: proverData?.transaction.feePayer.body.publicKey,
            accountUpdates: [],
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
            let context = memoizationContext() ?? {
              memoized: [],
              currentIndex: 0,
            };
            let id = memoizationContext.enter({ ...context, blindingValue });
            let result: unknown;
            try {
              result = method.apply(this, actualArgs.map(cloneCircuitValue));
            } finally {
              memoizationContext.leave(id);
            }

            // connects our input + result with callData, so this method can be called
            let callDataFields = computeCallData(
              methodIntf,
              actualArgs,
              result,
              blindingValue
            );
            accountUpdate.body.callData = Poseidon.hash(callDataFields);
            Authorization.setProofAuthorizationKind(accountUpdate);

            // TODO: currently commented out, but could come back in some form when we add caller to the public input
            // // compute `caller` field from `isDelegateCall` and a context determined by the transaction
            // let callerContext = Provable.witness(
            //   CallForest.callerContextType,
            //   () => {
            //     let { accountUpdate } = zkAppProver.getData();
            //     return CallForest.computeCallerContext(accountUpdate);
            //   }
            // );
            // CallForest.addCallers([accountUpdate], callerContext);

            // connect the public input to the account update & child account updates we created
            if (DEBUG_PUBLIC_INPUT_CHECK) {
              Provable.asProver(() => {
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
          } finally {
            Mina.currentTransaction.leave(txId);
          }
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
          Mina.currentTransaction()?.accountUpdates.push(accountUpdate);

          // first, clone to protect against the method modifying arguments!
          // TODO: double-check that this works on all possible inputs, e.g. CircuitValue, snarkyjs primitives
          let clonedArgs = cloneCircuitValue(actualArgs);

          // we run this in a "memoization context" so that we can remember witnesses for reuse when proving
          let blindingValue = getBlindingValue();
          let memoContext = { memoized: [], currentIndex: 0, blindingValue };
          let memoId = memoizationContext.enter(memoContext);
          let result: any;
          try {
            result = method.apply(
              this,
              actualArgs.map((a, i) => {
                let arg = methodIntf.allArgs[i];
                if (arg.type === 'witness') {
                  let type = methodIntf.witnessArgs[arg.index];
                  return Provable.witness(type, () => a);
                }
                return a;
              })
            );
          } finally {
            memoizationContext.leave(memoId);
          }
          let { memoized } = memoContext;

          assertStatePrecondition(this);

          // connect our input + result with callData, so this method can be called
          let callDataFields = computeCallData(
            methodIntf,
            clonedArgs,
            result,
            blindingValue
          );
          accountUpdate.body.callData = Poseidon.hash(callDataFields);

          if (!Authorization.hasAny(accountUpdate)) {
            Authorization.setLazyProof(
              accountUpdate,
              {
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
              },
              Mina.currentTransaction()!.accountUpdates
            );
          }
          return result;
        }
      } finally {
        smartContractContext.leave(id);
      }
    }

    // if we're here, this method was called inside _another_ smart contract method
    let parentAccountUpdate = insideContract.this.self;
    let methodCallDepth = insideContract.methodCallDepth;
    let innerContext: SmartContractContext = {
      this: this,
      methodCallDepth: methodCallDepth + 1,
      selfUpdate: selfAccountUpdate(this, methodName),
    };
    let id = smartContractContext.enter(innerContext);
    try {
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
        ZkappClass._methodMetadata?.[methodIntf.methodName]?.hasReturn &&
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

        let memoContext = {
          memoized: [],
          currentIndex: 0,
          blindingValue: constantBlindingValue,
        };
        let memoId = memoizationContext.enter(memoContext);
        let result: any;
        try {
          result = method.apply(this, constantArgs.map(cloneCircuitValue));
        } finally {
          memoizationContext.leave(memoId);
        }
        let { memoized } = memoContext;
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
        accountUpdate.body.callData = hashConstant(callDataFields);

        if (!Authorization.hasAny(accountUpdate)) {
          Authorization.setLazyProof(
            accountUpdate,
            {
              methodName: methodIntf.methodName,
              args: constantArgs,
              previousProofs: getPreviousProofsForProver(
                constantArgs,
                methodIntf
              ),
              ZkappClass,
              memoized,
              blindingValue: constantBlindingValue,
            },
            Mina.currentTransaction()!.accountUpdates
          );
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

      // overwrite this.self with the witnessed update, so it's this one we access later in the caller method
      innerContext.selfUpdate = accountUpdate;

      // connect accountUpdate to our own. outside Provable.witness so compile knows the right structure when hashing children
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
      return result;
    } finally {
      smartContractContext.leave(id);
    }
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
      hasReturn: boolean;
      gates: Gate[];
    }
  >; // keyed by method name
  static _provers?: Pickles.Prover[];
  static _maxProofsVerified?: 0 | 1 | 2;
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
    let {
      verificationKey: verificationKey_,
      provers,
      verify,
    } = await compileProgram(
      ZkappPublicInput,
      Empty,
      methodIntfs,
      methods,
      this
    );
    let verificationKey = {
      data: verificationKey_.data,
      hash: Field(verificationKey_.hash),
    } satisfies VerificationKey;
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
  static digest() {
    // TODO: this should use the method digests in a deterministic order!
    let methodData = this.analyzeMethods();
    let hash = hashConstant(
      Object.values(methodData).map((d) => Field(BigInt('0x' + d.digest)))
    );
    return hash.toBigInt().toString(16);
  }

  /**
   * Deploys a {@link SmartContract}.
   *
   * ```ts
   * let tx = await Mina.transaction(sender, () => {
   *   AccountUpdate.fundNewAccount(sender);
   *   zkapp.deploy();
   * });
   * tx.sign([senderKey, zkAppKey]);
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
    verificationKey ??= (this.constructor as typeof SmartContract)
      ._verificationKey;
    if (verificationKey === undefined) {
      if (!Mina.getProofsEnabled()) {
        let [, data, hash] = Pickles.dummyVerificationKey();
        verificationKey = { data, hash: Field(hash) };
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
    accountUpdate.sign(zkappKey);
    AccountUpdate.attachToTransaction(accountUpdate);

    // init if this account is not yet deployed or has no verification key on it
    let shouldInit =
      !Mina.hasAccount(this.address) ||
      Mina.getAccount(this.address).zkapp?.verificationKey === undefined;
    if (!shouldInit) return;
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
    Provable.asProver(() => {
      if (
        initUpdate.update.appState.some(({ isSome }) => !isSome.toBoolean())
      ) {
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
    this.account.provedState.assertEquals(Bool(false));
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

  #_senderState: { sender: PublicKey; transactionId: number };

  /**
   * The public key of the current transaction's sender account.
   *
   * Throws an error if not inside a transaction, or the sender wasn't passed in.
   *
   * **Warning**: The fact that this public key equals the current sender is not part of the proof.
   * A malicious prover could use any other public key without affecting the validity of the proof.
   */
  get sender(): PublicKey {
    // TODO this logic now has some overlap with this.self, we should combine them somehow
    // (but with care since the logic in this.self is a bit more complicated)
    if (!Mina.currentTransaction.has()) {
      throw Error(
        `this.sender is not available outside a transaction. Make sure you only use it within \`Mina.transaction\` blocks or smart contract methods.`
      );
    }
    let transactionId = Mina.currentTransaction.id();
    if (this.#_senderState?.transactionId === transactionId) {
      return this.#_senderState.sender;
    } else {
      let sender = Provable.witness(PublicKey, () => Mina.sender());
      this.#_senderState = { transactionId, sender };
      return sender;
    }
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
   * Current global slot on the network. This is the slot at which this transaction is included in a block. Since we cannot know this value
   * at the time of transaction construction, this only has the `assertBetween()` method but no `get()` (impossible to implement)
   * or `assertEquals()` (confusing, because the developer can't know the exact slot at which this will be included either)
   */
  get currentSlot() {
    return this.self.currentSlot;
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
        : Provable.witness(AccountUpdate, () => updateOrCallback.accountUpdate);
    this.self.approve(accountUpdate, layout);
    return accountUpdate;
  }

  send(args: {
    to: PublicKey | AccountUpdate | SmartContract;
    amount: number | bigint | UInt64;
  }) {
    return this.self.send(args);
  }

  /**
   * @deprecated use `this.account.tokenSymbol`
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
  events: { [key: string]: FlexibleProvablePure<any> } = {};

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
   * Asynchronously fetches events emitted by this {@link SmartContract} and returns an array of events with their corresponding types.
   * @async
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
    // filters all elements so that they are within the given range
    // only returns { type: "", event: [] } in a flat format
    let events = (
      await Mina.fetchEvents(this.address, this.self.body.tokenId, {
        from: start,
        to: end,
      })
    )
      .filter((eventData) => {
        let height = UInt32.from(eventData.blockHeight);
        return end === undefined
          ? start.lessThanOrEqual(height).toBoolean()
          : start.lessThanOrEqual(height).toBoolean() &&
              height.lessThanOrEqual(end).toBoolean();
      })
      .map((event) => {
        return event.events.map((eventData) => {
          let { events, ...rest } = event;
          return {
            ...rest,
            event: eventData,
          };
        });
      })
      .flat();

    // used to match field values back to their original type
    let sortedEventTypes = Object.keys(this.events).sort();

    return events.map((eventData) => {
      // if there is only one event type, the event structure has no index and can directly be matched to the event type
      if (sortedEventTypes.length === 1) {
        let type = sortedEventTypes[0];
        let event = this.events[type].fromFields(
          eventData.event.data.map((f: string) => Field(f))
        );
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
        let event = this.events[type].fromFields(
          eventProps.map((f: string) => Field(f))
        );
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
    if (Mina.currentTransaction()?.isFinalRunOutsideCircuit || inProver())
      Provable.asProver(run);
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
   *  - `hasReturn` a boolean indicating whether the method returns a value
   *  - `actions` the number of actions the method dispatches
   *  - `gates` the constraint system, represented as an array of gates
   */
  static analyzeMethods() {
    let ZkappClass = this as typeof SmartContract;
    let methodMetadata = (ZkappClass._methodMetadata ??= {});
    let methodIntfs = ZkappClass._methods ?? [];
    if (
      !methodIntfs.every((m) => m.methodName in methodMetadata) &&
      !inAnalyze()
    ) {
      if (snarkContext.get().inRunAndCheck) {
        let err = new Error(
          'Can not analyze methods inside Provable.runAndCheck, because this creates a circuit nested in another circuit'
        );
        // EXCEPT if the code that calls this knows that it can first run `analyzeMethods` OUTSIDE runAndCheck and try again
        (err as any).bootstrap = () => ZkappClass.analyzeMethods();
        throw err;
      }
      let id: number;
      let insideSmartContract = !!smartContractContext.get();
      if (insideSmartContract) id = smartContractContext.enter(null);
      try {
        for (let methodIntf of methodIntfs) {
          let accountUpdate: AccountUpdate;
          let { rows, digest, result, gates } = analyzeMethod(
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
          methodMetadata[methodIntf.methodName] = {
            actions: accountUpdate!.body.actions.data.length,
            rows,
            digest,
            hasReturn: result !== undefined,
            gates,
          };
        }
      } finally {
        if (insideSmartContract) smartContractContext.leave(id!);
      }
    }
    return methodMetadata;
  }

  /**
   * @deprecated use `this.account.<field>.set()`
   */
  setValue<T>(maybeValue: SetOrKeep<T>, value: T) {
    AccountUpdate.setValue(maybeValue, value);
  }

  /**
   * @deprecated use `this.account.permissions.set()`
   */
  setPermissions(permissions: Permissions) {
    this.self.account.permissions.set(permissions);
  }
}

type Reducer<Action> = {
  actionType: FlexibleProvablePure<Action>;
};

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
   *    fromActionState: actionState,
   *  });
   *
   *  let { state: newState, actionState: newActionState } =
   *  this.reducer.reduce(
   *     pendingActions,
   *     Field,
   *     (state: Field, _action: Field) => {
   *       return state.add(1);
   *     },
   *     { state: initialState, actionState: initialActionState  }
   *   );
   * ```
   *
   */
  reduce<State>(
    actions: Action[][],
    stateType: Provable<State>,
    reduce: (state: State, action: Action) => State,
    initial: { state: State; actionState: Field },
    options?: {
      maxTransactionsWithActions?: number;
      skipActionStatePrecondition?: boolean;
    }
  ): { state: State; actionState: Field };
  /**
   * Perform circuit logic for every {@link Action} in the list.
   *
   * This is a wrapper around {@link reduce} for when you don't need `state`.
   * Accepts the `fromActionState` and returns the updated action state.
   */
  forEach(
    actions: Action[][],
    reduce: (action: Action) => void,
    fromActionState: Field,
    options?: {
      maxTransactionsWithActions?: number;
      skipActionStatePrecondition?: boolean;
    }
  ): Field;
  /**
   * Fetches the list of previously emitted {@link Action}s by this {@link SmartContract}.
   * ```ts
   * let pendingActions = this.reducer.getActions({
   *    fromActionState: actionState,
   * });
   * ```
   */
  getActions({
    fromActionState,
    endActionState,
  }?: {
    fromActionState?: Field;
    endActionState?: Field;
  }): Action[][];
  /**
   * Fetches the list of previously emitted {@link Action}s by zkapp {@link SmartContract}.
   * ```ts
   * let pendingActions = await zkapp.reducer.fetchActions({
   *    fromActionState: actionState,
   * });
   * ```
   */
  fetchActions({
    fromActionState,
    endActionState,
  }: {
    fromActionState?: Field;
    endActionState?: Field;
  }): Promise<Action[][]>;
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
      accountUpdate.body.actions = Actions.pushEvent(
        accountUpdate.body.actions,
        eventFields
      );
    },

    reduce<S>(
      actionLists: A[][],
      stateType: Provable<S>,
      reduce: (state: S, action: A) => S,
      { state, actionState }: { state: S; actionState: Field },
      {
        maxTransactionsWithActions = 32,
        skipActionStatePrecondition = false,
      } = {}
    ): { state: S; actionState: Field } {
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
        ...new Set(Object.values(methodData).map((o) => o.actions)).add(0),
      ].sort((x, y) => x - y);

      let possibleActionTypes = possibleActionsPerTransaction.map((n) =>
        Provable.Array(reducer.actionType, n)
      );
      for (let i = 0; i < maxTransactionsWithActions; i++) {
        let actions = i < actionLists.length ? actionLists[i] : [];
        let length = actions.length;
        let lengths = possibleActionsPerTransaction.map((n) =>
          Provable.witness(Bool, () => Bool(length === n))
        );
        // create dummy actions for the other possible action lengths,
        // -> because this needs to be a statically-sized computation we have to operate on all of them
        let actionss = possibleActionsPerTransaction.map((n, i) => {
          let type = possibleActionTypes[i];
          return Provable.witness(type, () =>
            length === n ? actions : emptyValue(type)
          );
        });
        // for each action length, compute the events hash and then pick the actual one
        let eventsHashes = actionss.map((actions) => {
          let events = actions.map((a) => reducer.actionType.toFields(a));
          return Actions.hash(events);
        });
        let eventsHash = Provable.switch(lengths, Field, eventsHashes);
        let newActionsHash = Actions.updateSequenceState(
          actionState,
          eventsHash
        );
        let isEmpty = lengths[0];
        // update state hash, if this is not an empty action
        actionState = Provable.if(isEmpty, actionState, newActionsHash);
        // also, for each action length, compute the new state and then pick the actual one
        let newStates = actionss.map((actions) => {
          // we generate a new witness for the state so that this doesn't break if `apply` modifies the state
          let newState = Provable.witness(stateType, () => state);
          Provable.assertEqual(stateType, newState, state);
          // apply actions in reverse order since that's how they were stored at dispatch
          [...actions].reverse().forEach((action) => {
            newState = reduce(newState, action);
          });
          return newState;
        });
        // update state
        state = Provable.switch(lengths, stateType, newStates);
      }
      if (!skipActionStatePrecondition) {
        contract.account.actionState.assertEquals(actionState);
      }
      return { state, actionState };
    },

    forEach(
      actionLists: A[][],
      callback: (action: A) => void,
      fromActionState: Field,
      config
    ): Field {
      const stateType = provable(undefined);
      let { actionState } = this.reduce(
        actionLists,
        stateType,
        (_, action) => {
          callback(action);
          return undefined;
        },
        { state: undefined, actionState: fromActionState },
        config
      );
      return actionState;
    },

    getActions(config?: {
      fromActionState?: Field;
      endActionState?: Field;
    }): A[][] {
      let actionsForAccount: A[][] = [];
      Provable.asProver(() => {
        let actions = Mina.getActions(
          contract.address,
          config,
          contract.self.tokenId
        );
        actionsForAccount = actions.map((event) =>
          // putting our string-Fields back into the original action type
          event.actions.map((action) =>
            (reducer.actionType as ProvablePure<A>).fromFields(
              action.map(Field)
            )
          )
        );
      });
      return actionsForAccount;
    },
    async fetchActions(config?: {
      fromActionState?: Field;
      endActionState?: Field;
    }): Promise<A[][]> {
      let result = await Mina.fetchActions(
        contract.address,
        config,
        contract.self.tokenId
      );
      if ('error' in result) {
        throw Error(JSON.stringify(result));
      }
      return result.map((event) =>
        // putting our string-Fields back into the original action type
        event.actions.map((action) =>
          (reducer.actionType as ProvablePure<A>).fromFields(action.map(Field))
        )
      );
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

type DeployArgs =
  | {
      verificationKey?: { data: string; hash: string | Field };
      zkappKey?: PrivateKey;
    }
  | undefined;

function Account(address: PublicKey, tokenId?: Field) {
  if (smartContractContext.get()) {
    return AccountUpdate.create(address, tokenId).account;
  } else {
    return AccountUpdate.defaultAccountUpdate(address, tokenId).account;
  }
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

const Reducer: (<
  T extends FlexibleProvablePure<any>,
  A extends InferProvable<T> = InferProvable<T>
>(reducer: {
  actionType: T;
}) => ReducerReturn<A>) & {
  initialActionState: Field;
} = Object.defineProperty(
  function (reducer: any) {
    // we lie about the return value here, and instead overwrite this.reducer with
    // a getter, so we can get access to `this` inside functions on this.reducer (see constructor)
    return reducer;
  },
  'initialActionState',
  { get: Actions.emptyActionState }
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
