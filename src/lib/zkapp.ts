import {
  Circuit,
  Field,
  Bool,
  Poseidon,
  AsFieldElements,
  Ledger,
  Pickles,
  Types,
} from '../snarky';
import { CircuitValue, cloneCircuitValue } from './circuit_value';
import {
  Body,
  Party,
  signJsonTransaction,
  Parties,
  Permissions,
  SetOrKeep,
} from './party';
import { PrivateKey, PublicKey } from './signature';
import * as Mina from './mina';
import { UInt32, UInt64 } from './int';
import { Account, fetchAccount } from './fetch';
import {
  withContext,
  withContextAsync,
  getContext,
  mainContext,
} from './global-context';
import * as GlobalContext from './global-context';

export {
  deploy,
  DeployArgs,
  call,
  callUnproved,
  signFeePayer,
  declareState,
  declareMethods,
};

/**
 * Gettable and settable state that can be checked for equality.
 */
export type State<A> = {
  get(): A;
  set(a: A): void;
  fetch(): Promise<A | undefined>;
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
    _this: undefined as never as SmartContract, // defined by @state
    _ZkappClass: undefined as never as typeof SmartContract & {
      _layout: () => any;
    }, // defined by @state

    _init(key: string, ty: AsFieldElements<A>, _this: any, ZkappClass: any) {
      this._initialized = true;
      this._key = key;
      this._ty = ty;
      this._this = _this;
      this._ZkappClass = ZkappClass;
    },

    getLayout() {
      let layout: Map<string, { offset: number; length: number }> =
        this._ZkappClass._layout();
      let stateLayout = layout.get(this._key);
      if (stateLayout === undefined) {
        throw new Error(`state ${this._key} not found`);
      }
      return stateLayout;
    },

    set(a: A) {
      if (!this._initialized)
        throw Error(
          'set can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = this.getLayout();
      let stateAsFields = this._ty.toFields(a);
      let e: ExecutionState = this._this.executionState();

      stateAsFields.forEach((x, i) => {
        Party.setValue(e.party.body.update.appState[layout.offset + i], x);
      });
    },

    assertEquals(a: A) {
      if (!this._initialized)
        throw Error(
          'assertEquals can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = this.getLayout();
      let stateAsFields = this._ty.toFields(a);
      let e: ExecutionState = this._this.executionState();

      stateAsFields.forEach((x, i) => {
        e.party.body.preconditions.account.state[layout.offset + i].isSome =
          Bool(true);
        e.party.body.preconditions.account.state[layout.offset + i].value = x;
      });
    },

    get() {
      if (!this._initialized)
        throw Error(
          'get can only be called when the State is assigned to a SmartContract @state.'
        );
      let layout = this.getLayout();

      let address: PublicKey = this._this.address;
      let stateAsFields: Field[];
      let inProver = GlobalContext.inProver();
      if (!GlobalContext.inCompile()) {
        let a: Account;
        try {
          a = Mina.getAccount(address);
        } catch (err) {
          // TODO: there should also be a reasonable error here
          if (inProver) {
            throw err;
          }
          throw Error(
            `${this._key}.get() failed, because the zkapp account was not found in the cache. ` +
              `Try calling \`await fetchAccount(zkappAddress)\` first.`
          );
        }
        if (a.zkapp === undefined) {
          // if the account is not a zkapp account, let the default state be all zeroes
          stateAsFields = Array(layout.length).fill(Field.zero);
        } else {
          stateAsFields = [];
          for (let i = 0; i < layout.length; ++i) {
            stateAsFields.push(a.zkapp.appState[layout.offset + i]);
          }
        }
        // in prover, create a new witness with the state values
        // outside, just return the state values
        stateAsFields = inProver
          ? Circuit.witness(
              Circuit.array(Field, layout.length),
              () => stateAsFields
            )
          : stateAsFields;
      } else {
        // in compile, we don't need the witness values
        stateAsFields = Circuit.witness(
          Circuit.array(Field, layout.length),
          (): Field[] => {
            throw Error('this should never happen');
          }
        );
      }
      let state = this._ty.ofFields(stateAsFields);
      (this._ty as any).check?.(state);
      return state;
    },

    async fetch() {
      if (!this._initialized)
        throw Error(
          'fetch can only be called when the State is assigned to a SmartContract @state.'
        );
      if (Mina.currentTransaction !== undefined)
        throw Error(
          'fetch is not intended to be called inside a transaction block.'
        );
      let layout = this.getLayout();
      let address: PublicKey = this._this.address;
      let { account } = await fetchAccount(address);
      if (account === undefined) return undefined;
      let stateAsFields: Field[];
      if (account.zkapp === undefined) {
        stateAsFields = Array(layout.length).fill(Field.zero);
      } else {
        stateAsFields = [];
        for (let i = 0; i < layout.length; ++i) {
          stateAsFields.push(account.zkapp.appState[layout.offset + i]);
        }
      }
      return this._ty.ofFields(stateAsFields);
    },
  };
}

type InternalStateType = ReturnType<typeof createState>;

const reservedPropNames = new Set(['_states', '_layout', '_methods', '_']);

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
export function state<A>(ty: AsFieldElements<A>) {
  return function (
    target: SmartContract & { constructor: any },
    key: string,
    _descriptor?: PropertyDescriptor
  ) {
    const ZkappClass = target.constructor;
    if (reservedPropNames.has(key)) {
      throw Error(`Property name ${key} is reserved.`);
    }

    if (ZkappClass._states == undefined) {
      ZkappClass._states = [];
      let layout: Map<string, { offset: number; length: number }>;
      ZkappClass._layout = () => {
        if (layout === undefined) {
          layout = new Map();

          let offset = 0;
          ZkappClass._states.forEach(([key, ty]: [any, any]) => {
            let length = ty.sizeInFields();
            layout.set(key, { offset, length });
            offset += length;
          });
        }
        return layout;
      };
    }

    ZkappClass._states.push([key, ty]);

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
        v._init(key, ty, this, ZkappClass);
        (this._ ?? (this._ = {}))[key] = v;
      },
    });
  };
}

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
  ZkappClass._methods ??= [];
  ZkappClass._methods.push({
    methodName,
    witnessArgs,
    proofArgs,
    args,
  });
  let argsLength = args.length;
  let func = descriptor.value;
  descriptor.value = wrapMethod(func, argsLength, ZkappClass);
}

// do different things when calling a method, depending on the circumstance
function wrapMethod(
  method: Function,
  argsLength: number,
  ZkappClass: typeof SmartContract
) {
  function wrappedMethod(this: SmartContract, ...args: any[]) {
    let actualArgs = args.slice(0, argsLength);
    let shouldCallDirectly = args[argsLength] as undefined | boolean;
    if (Mina.currentTransaction === undefined || shouldCallDirectly === true) {
      // outside a transaction, just call the method
      return method.apply(this, actualArgs);
    } else {
      // in a transaction, also add a lazy proof to the self party
      // (if there's no other authorization set)
      let auth = this.self.authorization;
      if (!('kind' in auth || 'proof' in auth || 'signature' in auth)) {
        this.self.authorization = {
          kind: 'lazy-proof',
          method,
          args: actualArgs,
          ZkappClass,
        };
      }
      return method.apply(this, actualArgs);
    }
  }
  return wrappedMethod;
}

type methodEntry<T> = {
  methodName: keyof T & string;
  witnessArgs: AsFieldElements<unknown>[];
  proofArgs: unknown[];
  args: { type: string; index: number }[];
  witnessValues?: unknown[];
};

function isAsFields(typ: Object) {
  return (
    !!typ && ['toFields', 'ofFields', 'sizeInFields'].every((s) => s in typ)
  );
}
function isProof(typ: any) {
  return false; // TODO
}

/**
 * A Statement consists of certain hashes of the transaction and of the proving Party which is constructed during method execution.

  In SmartContract.prove, a method is run twice: First outside the proof, to obtain the statement, and once in the prover,
  which takes the statement as input. The current transaction is hashed again inside the prover, which asserts that the result equals the input statement,
  as part of the snark circuit. The block producer will also hash the transaction they receive and pass it as a public input to the verifier.
  Thus, the transaction is fully constrained by the proof - the proof couldn't be used to attest to a different transaction.
 */
type Statement = { transaction: Field; atParty: Field };

type Proof = unknown; // opaque
type Prover = (statement: Statement) => Promise<Proof>;

function toStatement(self: Party, tail: Field) {
  // TODO hash together party with tail in the right way
  let atParty = self.hash();
  let transaction = Ledger.hashTransactionChecked(atParty);
  return { transaction, atParty };
}

function checkStatement(
  { transaction, atParty }: Statement,
  self: Party,
  tail: Field
) {
  // ATM, we always compute the statement in checked mode to make assertEqual pass
  let otherStatement = toStatement(self, tail);
  atParty.assertEquals(otherStatement.atParty);
  transaction.assertEquals(otherStatement.transaction);
}

function picklesRuleFromFunction(
  name: string,
  func: (...args: unknown[]) => void,
  witnessTypes: AsFieldElements<unknown>[]
) {
  function main(statement: Statement) {
    let { self, witnesses } = getContext();
    witnesses = witnessTypes.map(
      witnesses
        ? (type, i) => Circuit.witness(type, () => witnesses![i])
        : emptyWitness
    );
    func(...witnesses);
    let tail = Field.zero;
    // FIXME: figure out correct way to constrain statement https://github.com/o1-labs/snarkyjs/issues/98
    statement.transaction.assertEquals(statement.transaction);
    // checkStatement(statement, self, tail);
  }

  return [0, name, main] as [0, string, typeof main];
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

  _executionState?: ExecutionState;
  static _methods?: methodEntry<SmartContract>[];
  static _provers?: Prover[];
  static _verificationKey?: { data: string; hash: Field };

  constructor(address: PublicKey) {
    this.address = address;
  }

  static async compile(address?: PublicKey) {
    // TODO: think about how address should be passed in
    // if address is not provided, create a random one
    // TODO: maybe PublicKey should just become a variable? Then compile doesn't need to know the address, which seems more natural
    address ??= PrivateKey.random().toPublicKey();
    let instance = new this(address);

    let rules = (this._methods ?? []).map(({ methodName, witnessArgs }) =>
      picklesRuleFromFunction(
        methodName,
        (...args: unknown[]) => (instance[methodName] as any)(...args),
        witnessArgs
      )
    );

    let [, { getVerificationKeyArtifact, provers, verify }] = withContext(
      { self: Party.defaultParty(address), inCompile: true },
      () => Pickles.compile(rules)
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

  async prove(methodName: keyof this, args: unknown[], provers?: Prover[]) {
    // TODO could just pass in the method instead of method name -> cleaner API
    let ZkappClass = this.constructor as never as typeof SmartContract;
    provers ??= ZkappClass._provers;
    if (provers === undefined)
      throw Error(
        `Cannot produce execution proof - no provers found. Try calling \`await ${ZkappClass.name}.compile()\` first.`
      );
    let provers_ = provers;
    let i = ZkappClass._methods!.findIndex((m) => m.methodName === methodName);
    if (i === -1) throw Error(`Method ${methodName} not found!`);
    let [statement, selfParty] = Circuit.runAndCheck(() => {
      let [selfParty] = withContext(
        { self: Party.defaultParty(this.address), inProver: true },
        () => {
          (this[methodName] as any)(...args, true);
          // method(...args, true);
        }
      );

      // TODO dont create full transaction in here, properly build up atParty
      let txJson = Mina.createUnsignedTransaction(() => {
        Mina.setCurrentTransaction({
          parties: [selfParty],
          nextPartyIndex: 1,
          fetchMode: 'cached',
        });
      }).toJSON();
      let statement = Ledger.transactionStatement(txJson, 0);
      return [statement, selfParty];
    });

    // TODO lazy proof?
    let [, proof] = await withContextAsync(
      {
        self: Party.defaultParty(this.address),
        witnesses: args,
        inProver: true,
      },
      () => provers_[i](statement)
    );
    // FIXME call calls Parties.to_json outside a prover, which seems to cause an error when variables are extracted
    return { proof, statement, selfParty };
  }

  async runAndCheck(methodName: keyof this, args: unknown[]) {
    let ZkappClass = this.constructor as never as typeof SmartContract;
    let i = ZkappClass._methods!.findIndex((m) => m.methodName === methodName);
    if (i === -1) throw Error(`Method ${methodName} not found!`);
    let ctx = { self: Party.defaultParty(this.address) };
    let [statement, selfParty] = Circuit.runAndCheck(() => {
      let [selfParty] = withContext(
        { self: Party.defaultParty(this.address), inProver: true },
        () => {
          (this[methodName] as any)(...args);
        }
      );
      let statementVar = toStatement(ctx.self, Field.zero);
      return [
        {
          transaction: statementVar.transaction.toConstant(),
          atParty: statementVar.atParty.toConstant(),
        },
        selfParty,
      ];
    });
    return { statement, selfParty };
  }

  executionState(): ExecutionState {
    // TODO reconcile mainContext with currentTransaction
    if (mainContext !== undefined) {
      return {
        transactionId: 0,
        partyIndex: 0,
        party: mainContext.self,
      };
    }

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
      const party = new Party(body);
      Mina.currentTransaction.parties.push(party);

      const s = {
        transactionId: id,
        partyIndex: index,
        party,
      };
      this._executionState = s;
      return s;
    }
  }

  get self() {
    return this.executionState().party;
  }

  get balance() {
    return this.self.balance;
  }

  get nonce() {
    return this.self.setNoncePrecondition();
  }

  setValue<T>(maybeValue: SetOrKeep<T>, value: T) {
    Party.setValue(maybeValue, value);
  }

  // TBD: do we want to have setters for updates, e.g. this.permissions = ... ?
  // I'm hesitant to make the API even more magical / less explicit
  setPermissions(permissions: Permissions) {
    this.setValue(this.self.update.permissions, permissions);
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

type DeployArgs = {
  verificationKey?: { data: string; hash: string | Field };
  zkappKey?: PrivateKey;
};

type ExecutionState = {
  transactionId: number;
  partyIndex: number;
  party: Party;
};

function emptyWitness<A>(typ: AsFieldElements<A>) {
  // return typ.ofFields(Array(typ.sizeInFields()).fill(Field.zero));
  return Circuit.witness(typ, () =>
    typ.ofFields(Array(typ.sizeInFields()).fill(Field.zero))
  );
}

// functions designed to be called from a CLI

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
  }: {
    zkappKey: PrivateKey;
    verificationKey: { data: string; hash: string | Field };
    initialBalance?: number | string;
    feePayerKey?: PrivateKey;
    shouldSignFeePayer?: boolean;
    transactionFee?: string | number;
    feePayerNonce?: string | number;
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

async function call<S extends typeof SmartContract>(
  SmartContract: S,
  address: PublicKey,
  methodName: string,
  methodArguments: any,
  provers: Prover[],
  // TODO: remove, create a nicer intf to check proofs
  verify?: (statement: Statement, proof: unknown) => Promise<boolean>
) {
  let zkapp = new SmartContract(address);
  let { selfParty, proof, statement } = await zkapp.prove(
    methodName as any,
    methodArguments,
    provers
  );
  selfParty.authorization = { proof: Pickles.proofToString(proof) };
  if (verify !== undefined) {
    let ok = await verify(statement, proof);
    if (!ok) throw Error('Proof failed to verify!');
  }
  let tx = Mina.createUnsignedTransaction(() => {
    Mina.setCurrentTransaction({
      parties: [selfParty],
      nextPartyIndex: 1,
      fetchMode: 'cached',
    });
  });
  return tx.toJSON();
}

async function callUnproved<S extends typeof SmartContract>(
  SmartContract: S,
  address: PublicKey,
  methodName: string,
  methodArguments: any,
  zkappKey?: PrivateKey
) {
  let zkapp = new SmartContract(address);
  let { selfParty, statement } = await zkapp.runAndCheck(
    methodName as any,
    methodArguments
  );
  selfParty.signInPlace(zkappKey);
  let tx = Mina.createUnsignedTransaction(() => {
    Mina.setCurrentTransaction({
      parties: [selfParty],
      nextPartyIndex: 1,
      fetchMode: 'cached',
    });
  });
  let txJson = tx.sign().toJSON();
  return txJson;
}

function addFeePayer(
  { feePayer, otherParties }: Parties,
  feePayerKey: PrivateKey | string,
  {
    transactionFee = 0 as number | string,
    feePayerNonce = undefined as number | string | undefined,
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
  feePayer.body.nonce = UInt32.fromString(`${feePayerNonce}`);
  feePayer.body.publicKey = senderAddress;
  feePayer.body.fee = UInt64.fromString(`${transactionFee}`);
  Party.signFeePayerInPlace(feePayer, feePayerKey);
  return { feePayer, otherParties };
}

function signFeePayer(
  transactionJson: string,
  feePayerKey: PrivateKey | string,
  {
    transactionFee = 0 as number | string,
    feePayerNonce = undefined as number | string | undefined,
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
  parties.feePayer.body.nonce = `${feePayerNonce}`;
  parties.feePayer.body.publicKey = Ledger.publicKeyToString(senderAddress);
  parties.feePayer.body.fee = `${transactionFee}`;
  return signJsonTransaction(JSON.stringify(parties), feePayerKey);
}

// alternative API which can replace decorators, works in pure JS

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
