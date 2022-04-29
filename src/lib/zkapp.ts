import {
  Circuit,
  Field,
  Bool,
  Poseidon,
  AsFieldElements,
  Ledger,
  Pickles,
} from '../snarky';
import { CircuitValue } from './circuit_value';
import {
  ProtocolStatePredicate,
  Body,
  Party,
  PartyBalance,
  signJsonTransaction,
  Parties,
  Permissions,
  PartyWithFullAccountPrecondition,
} from './party';
import { PrivateKey, PublicKey } from './signature';
import * as Mina from './mina';
import { toParty, toProtocolState } from './party-conversion';
import { UInt32, UInt64 } from './int';

export {
  deploy,
  compile,
  call,
  callUnproved,
  signFeePayer,
  declareState,
  declareMethodArguments,
};

/**
 * Gettable and settable state that can be checked for equality.
 */
export type State<A> = {
  get(): A;
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
    _ZkappClass: undefined as never as SmartContract & { _layout: () => any }, // defined by @state

    _init(key: string, ty: AsFieldElements<A>, _this: any, ZkappClass: any) {
      this._initialized = true;
      this._key = key;
      this._ty = ty;
      this._this = _this;
      this._ZkappClass = ZkappClass;
    },

    getLayout() {
      const layout: Map<string, { offset: number; length: number }> =
        this._ZkappClass._layout();
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
        e.party.body.accountPrecondition.state[r.offset + i].check = new Bool(
          true
        );
        e.party.body.accountPrecondition.state[r.offset + i].value = x;
      });
    },

    get() {
      if (!this._initialized)
        throw Error(
          'get can only be called when the State is assigned to a SmartContract @state.'
        );
      const r = this.getLayout();

      let addr: PublicKey = this._this.address;
      let p: Field[];

      if (Circuit.inProver()) {
        let a = Mina.getAccount(addr);

        const xs: Field[] = [];
        for (let i = 0; i < r.length; ++i) {
          xs.push(a.zkapp.appState[r.offset + i]);
        }
        p = Circuit.witness(Circuit.array(Field, r.length), () => xs);
      } else {
        p = Circuit.witness(Circuit.array(Field, r.length), (): Field[] => {
          throw Error('this should never happen');
        });
      }
      let xs = p;
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
    // TBD: I think the runtime error below is unnecessary, because having target: SmartContract
    // means TS will not let the code build if @state is used on an incompatible class
    // if (!(ZkappClass.prototype instanceof SmartContract)) {
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
  _descriptor?: PropertyDescriptor
) {
  const ZkappClass = target.constructor;
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
  ZkappClass._methods ??= [];
  ZkappClass._methods.push({
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

function toStatement(self: Party, tail: Field, checked = true) {
  // TODO hash together party with tail in the right way
  if (checked) {
    let atParty = Ledger.hashPartyChecked(toParty(self));
    let protocolStateHash = Ledger.hashProtocolStateChecked(
      toProtocolState(ProtocolStatePredicate.ignoreAll())
    );
    let transaction = Ledger.hashTransactionChecked(atParty, protocolStateHash);
    return { transaction, atParty };
  } else {
    let atParty = Ledger.hashParty(toParty(self));
    let protocolStateHash = Ledger.hashProtocolState(
      toProtocolState(ProtocolStatePredicate.ignoreAll())
    );
    let transaction = Ledger.hashTransaction(atParty, protocolStateHash);
    return { transaction, atParty };
  }
}

function checkStatement(
  { transaction, atParty }: Statement,
  self: Party,
  tail: Field
) {
  // ATM, we always compute the statement in checked mode to make assertEqual pass
  let otherStatement = toStatement(self, tail, true);
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

  constructor(address: PublicKey) {
    this.address = address;
  }

  static compile(address?: PublicKey) {
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

    let [, output] = withContext({ self: Party.defaultParty(address) }, () =>
      Pickles.compile(rules)
    );
    return output;
  }

  deploy({
    verificationKey,
    zkappKey,
  }: {
    verificationKey?: string;
    zkappKey?: PrivateKey;
  }) {
    if (verificationKey !== undefined) {
      this.self.update.verificationKey.set = Bool(true);
      this.self.update.verificationKey.value = verificationKey;
    }
    this.self.update.permissions.setValue(Permissions.default());
    this.self.body.incrementNonce = Bool(true);
    this.self.sign(zkappKey);
  }

  async prove(provers: any[], methodName: keyof this, args: unknown[]) {
    let ZkappClass = this.constructor as never as typeof SmartContract;
    let i = ZkappClass._methods!.findIndex((m) => m.methodName === methodName);
    if (!(i + 1)) throw Error(`Method ${methodName} not found!`);
    let [statement, selfParty] = Circuit.runAndCheckSync(() => {
      let [selfParty] = withContext(
        { self: Party.defaultParty(this.address) },
        () => {
          (this[methodName] as any)(...args);
          // FIXME: a proof-authorized party shouldn't need to increment nonce, this is needed due to a protocol bug
        }
      );
      selfParty.body.incrementNonce = Bool(true);

      // TODO dont create full transaction in here, properly build up atParty
      let txJson = Mina.createUnsignedTransaction(() => {
        Mina.setCurrentTransaction({ parties: [selfParty], nextPartyIndex: 1 });
      }).toJSON();
      let statement = Ledger.transactionStatement(txJson, 0);
      // let statementVar = toStatement(ctx.self, Field.zero);
      // let statement = {
      //   transaction: statementVar.transaction.toConstant(),
      //   atParty: statementVar.atParty.toConstant(),
      // };
      return [statement, selfParty];
    });

    // TODO lazy proof?
    let [, proof] = await withContextAsync(
      { self: Party.defaultParty(this.address), witnesses: args },
      () => provers[i](statement)
    );
    // FIXME call calls Parties.to_json outside a prover, which seems to cause an error when variables are extracted
    return { proof, statement, selfParty };
  }

  async runAndCheck(methodName: keyof this, args: unknown[]) {
    let ZkappClass = this.constructor as never as typeof SmartContract;
    let i = ZkappClass._methods!.findIndex((m) => m.methodName === methodName);
    if (!(i + 1)) throw Error(`Method ${methodName} not found!`);
    let ctx = { self: Party.defaultParty(this.address) };
    let [statement, selfParty] = Circuit.runAndCheckSync(() => {
      let [selfParty] = withContext(
        { self: Party.defaultParty(this.address) },
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
        party: mainContext.self as PartyWithFullAccountPrecondition,
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
      const party = new Party(body) as PartyWithFullAccountPrecondition;
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

  get balance(): PartyBalance {
    return this.self.balance;
  }

  get nonce() {
    let nonce: UInt32;
    if (Circuit.inProver()) {
      let a = Mina.getAccount(this.address);
      nonce = Circuit.witness(UInt32, () => a.nonce);
    } else {
      const res = Circuit.witness(UInt32, () => {
        throw Error('this should never happen');
      });
      nonce = res;
    }

    this.executionState().party.body.accountPrecondition.nonce.assertBetween(
      nonce,
      nonce
    );
    return nonce;
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

type ExecutionState = {
  transactionId: number;
  partyIndex: number;
  party: PartyWithFullAccountPrecondition;
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
  }: {
    zkappKey: PrivateKey;
    verificationKey: string;
    initialBalance?: number | string;
    feePayerKey?: PrivateKey;
    shouldSignFeePayer?: boolean;
    transactionFee?: string | number;
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
      let amount = UInt64.fromString(String(initialBalance));
      let party = Party.createSigned(feePayerKey, { isSameAsFeePayer: true });
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
    await addFeePayer(tx.transaction, feePayerKey, { transactionFee });
  }
  // TODO modifying the json after calling to ocaml would avoid extra vk serialization.. but need to compute vk hash
  return tx.sign().toJSON();
}

async function call<S extends typeof SmartContract>(
  SmartContract: S,
  address: PublicKey,
  methodName: string,
  methodArguments: any,
  provers: ((statement: Statement) => Promise<unknown>)[],
  // TODO: remove, create a nicer intf to check proofs
  verify?: (statement: Statement, proof: unknown) => Promise<boolean>
) {
  let zkapp = new SmartContract(address);
  let { selfParty, proof, statement } = await zkapp.prove(
    provers,
    methodName as any,
    methodArguments
  );
  selfParty.authorization = {
    kind: 'proof',
    value: Pickles.proofToString(proof),
  };
  if (verify !== undefined) {
    let ok = await verify(statement, proof);
    if (!ok) throw Error('Proof failed to verify!');
  }
  let tx = Mina.createUnsignedTransaction(() => {
    Mina.setCurrentTransaction({ parties: [selfParty], nextPartyIndex: 1 });
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
  selfParty.sign(zkappKey);
  selfParty.body.incrementNonce = Bool(true);
  let tx = Mina.createUnsignedTransaction(() => {
    Mina.setCurrentTransaction({ parties: [selfParty], nextPartyIndex: 1 });
  });
  let txJson = tx.sign().toJSON();
  return txJson;
}

async function addFeePayer(
  { feePayer }: Parties,
  feePayerKey: PrivateKey | string,
  {
    transactionFee = 0 as number | string,
    feePayerNonce = undefined as number | string | undefined,
  }
) {
  if (typeof feePayerKey === 'string')
    feePayerKey = PrivateKey.fromBase58(feePayerKey);
  let senderAddress = feePayerKey.toPublicKey();
  if (feePayerNonce === undefined) {
    let senderAccount = await Mina.getAccount(senderAddress);
    feePayerNonce = senderAccount.nonce.toString();
  }
  feePayer.body.accountPrecondition = UInt32.fromString(`${feePayerNonce}`);
  feePayer.body.publicKey = senderAddress;
  feePayer.balance.subInPlace(UInt64.fromString(`${transactionFee}`));
  feePayer.sign(feePayerKey);
}

async function signFeePayer(
  transactionJson: string,
  feePayerKey: PrivateKey | string,
  {
    transactionFee = 0 as number | string,
    feePayerNonce = undefined as number | string | undefined,
  }
) {
  let parties = JSON.parse(transactionJson);
  if (typeof feePayerKey === 'string')
    feePayerKey = PrivateKey.fromBase58(feePayerKey);
  let senderAddress = feePayerKey.toPublicKey();
  if (feePayerNonce === undefined) {
    let senderAccount = await Mina.getAccount(senderAddress);
    feePayerNonce = senderAccount.nonce.toString();
  }
  parties.feePayer.body.accountPrecondition = `${feePayerNonce}`;
  parties.feePayer.body.publicKey = Ledger.publicKeyToString(senderAddress);
  parties.feePayer.body.balanceChange = `${transactionFee}`;
  return signJsonTransaction(JSON.stringify(parties), feePayerKey);
}

async function compile<S extends typeof SmartContract>(
  SmartContract: S,
  address: PublicKey
) {
  // TODO: instead of returning provers, return an artifact from which provers can be recovered
  let { getVerificationKeyArtifact, provers, verify } =
    SmartContract.compile(address);
  return {
    verificationKey: getVerificationKeyArtifact(),
    provers,
    verify,
  };
}

// alternative API which can replace decorators, works in pure JS

function declareState<T extends typeof SmartContract>(
  SmartContract: T,
  states: Record<string, AsFieldElements<unknown>>
) {
  for (let key in states) {
    let CircuitValue = states[key];
    state(CircuitValue)(SmartContract.prototype, key);
  }
}

function declareMethodArguments<T extends typeof SmartContract>(
  SmartContract: T,
  methodArguments: Record<string, AsFieldElements<unknown>[]>
) {
  for (let key in methodArguments) {
    let argumentTypes = methodArguments[key];
    Reflect.metadata('design:paramtypes', argumentTypes)(
      SmartContract.prototype,
      key
    );
    method(SmartContract.prototype, key as any);
  }
}

// TODO reconcile mainContext with currentTransaction
let mainContext = undefined as
  | {
      witnesses?: unknown[];
      self: PartyWithFullAccountPrecondition;
      expectedAccesses: number | undefined;
      actualAccesses: number;
    }
  | undefined;
type PartialContext = {
  witnesses?: unknown[];
  self: PartyWithFullAccountPrecondition;
  expectedAccesses?: number;
  actualAccesses?: number;
};

function withContext<T>(
  {
    witnesses = undefined,
    expectedAccesses = undefined,
    actualAccesses = 0,
    self,
  }: PartialContext,
  f: () => T
) {
  mainContext = { witnesses, expectedAccesses, actualAccesses, self };
  let result = f();
  mainContext = undefined;
  return [self, result] as [PartyWithFullAccountPrecondition, T];
}

// TODO: this is unsafe, the mainContext will be overridden if we invoke this function multiple times concurrently
// at the moment, we solve this by detecting unsafe use and throwing an error
async function withContextAsync<T>(
  {
    witnesses = undefined,
    expectedAccesses = 1,
    actualAccesses = 0,
    self,
  }: PartialContext,
  f: () => Promise<T>
) {
  mainContext = { witnesses, expectedAccesses, actualAccesses, self };
  let result = await f();
  if (mainContext.actualAccesses !== mainContext.expectedAccesses)
    throw Error(contextConflictMessage);
  mainContext = undefined;
  return [self, result] as [PartyWithFullAccountPrecondition, T];
}

let contextConflictMessage =
  "It seems you're running multiple provers concurrently within" +
  ' the same JavaScript thread, which, at the moment, is not supported and would lead to bugs.';
function getContext() {
  if (mainContext === undefined) throw Error(contextConflictMessage);
  mainContext.actualAccesses++;
  if (
    mainContext.expectedAccesses !== undefined &&
    mainContext.actualAccesses > mainContext.expectedAccesses
  )
    throw Error(contextConflictMessage);
  return mainContext;
}
