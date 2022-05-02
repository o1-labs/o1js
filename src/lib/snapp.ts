import {
  Circuit,
  Field,
  Bool,
  Poseidon,
  AsFieldElements,
  picklesCompile,
  Ledger,
} from '../snarky';
import { CircuitValue } from './circuit_value';
import {
  AccountPredicate,
  ProtocolStatePredicate,
  Body,
  Party,
  PartyBalance,
} from './party';
import { PrivateKey, PublicKey } from './signature';
import * as Mina from './mina';
import { toParty, toProtocolState } from './party-conversion';
import { UInt32 } from './int';

export { deploy, compile, declareState, declareMethodArguments };

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
    _SnappClass: undefined as never as SmartContract & { _layout: () => any }, // defined by @state

    _init(key: string, ty: AsFieldElements<A>, _this: any, SnappClass: any) {
      this._initialized = true;
      this._key = key;
      this._ty = ty;
      this._this = _this;
      this._SnappClass = SnappClass;
    },

    getLayout() {
      const layout: Map<string, { offset: number; length: number }> =
        this._SnappClass._layout();
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
        e.party.predicate.state[r.offset + i].check = new Bool(true);
        e.party.predicate.state[r.offset + i].value = x;
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
          xs.push(a.snapp.appState[r.offset + i]);
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
 * A decorator to use within a snapp to indicate what will be stored on-chain.
 * For example, if you want to store a field element `some_state` in a snapp,
 * you can use the following in the declaration of your snapp:
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
    const SnappClass = target.constructor;
    // TBD: I think the runtime error below is unnecessary, because having target: SmartContract
    // means TS will not let the code build if @state is used on an incompatible class
    // if (!(SnappClass.prototype instanceof SmartContract)) {
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

    if (SnappClass._states == undefined) {
      SnappClass._states = [];
      let layout: Map<string, { offset: number; length: number }>;
      SnappClass._layout = () => {
        if (layout === undefined) {
          layout = new Map();

          let offset = 0;
          SnappClass._states.forEach(([key, ty]: [any, any]) => {
            let length = ty.sizeInFields();
            layout.set(key, { offset, length });
            offset += length;
          });
        }

        return layout;
      };
    }

    SnappClass._states.push([key, ty]);

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
        v._init(key, ty, this, SnappClass);
        (this._ ?? (this._ = {}))[key] = v;
      },
    });
  };
}

/**
 * A decorator to use in a snapp to mark a method as callable by anyone.
 * You can use inside your snapp class as:
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
  const SnappClass = target.constructor;
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
  SnappClass._methods ??= [];
  SnappClass._methods.push({
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

type Statement = { transaction: Field; atParty: Field };

function toStatement(
  self: Party,
  tail: Field,
  state: ProtocolStatePredicate,
  checked = true
) {
  // TODO hash together party with tail in the right way
  if (checked) {
    let atParty = Ledger.hashPartyChecked(toParty(self));
    let protocolStateHash = Ledger.hashProtocolStateChecked(
      toProtocolState(state)
    );
    let transaction = Ledger.hashTransactionChecked(atParty, protocolStateHash);
    return { transaction, atParty };
  } else {
    let atParty = Ledger.hashParty(toParty(self));
    let protocolStateHash = Ledger.hashProtocolState(toProtocolState(state));
    let transaction = Ledger.hashTransaction(atParty, protocolStateHash);
    return { transaction, atParty };
  }
}

function checkStatement(
  { transaction, atParty }: Statement,
  self: Party,
  tail: Field,
  protocolState: ProtocolStatePredicate
) {
  // ATM, we always compute the statement in checked mode to make assertEqual pass
  // TODO: are checked / unchecked versions supposed to be compatible?
  let otherStatement = toStatement(self, tail, protocolState, true);
  atParty.assertEquals(otherStatement.atParty);
  transaction.assertEquals(otherStatement.transaction);
}

let mainContext = undefined as
  | {
      witnesses?: unknown[];
      self: Party & { predicate: AccountPredicate };
      protocolState: ProtocolStatePredicate;
    }
  | undefined;

function withContext<T>(context: typeof mainContext, f: () => T) {
  mainContext = context;
  let result = f();
  mainContext = undefined;
  return result;
}

function picklesRuleFromFunction(
  name: string,
  func: (...args: unknown[]) => void,
  witnessTypes: AsFieldElements<unknown>[],
  onStart?: Function,
  onEnd?: Function
) {
  function main(statement: Statement) {
    onStart?.();
    if (mainContext === undefined) throw Error('bug');
    let { self, protocolState, witnesses } = mainContext;
    witnesses = witnessTypes.map(
      witnesses
        ? (type, i) => Circuit.witness(type, () => witnesses![i])
        : emptyWitness
    );
    func(...witnesses);
    let tail = Field.zero;
    checkStatement(statement, self, tail, protocolState);
    onEnd?.();
  }

  return [0, name, main];
}

/**
 * The main snapp class. To write a snapp, extend this class as such:
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

    let output = withContext(
      {
        self: Party.defaultParty(address),
        protocolState: ProtocolStatePredicate.ignoreAll(),
      },
      () => picklesCompile(rules)
    );
    return output;
  }

  async prove(provers: any[], methodName: keyof this, args: unknown[]) {
    let SnappClass = this.constructor as never as typeof SmartContract;
    let i = SnappClass._methods!.findIndex((m) => m.methodName === methodName);
    if (!(i + 1)) throw Error(`Method ${methodName} not found!`);
    let ctx = {
      self: Party.defaultParty(this.address),
      protocolState: ProtocolStatePredicate.ignoreAll(),
    };
    // console.log(
    //   'prove: running method directly in prover mode to get statement'
    // );
    let statement = Circuit.runAndCheckSync(() => {
      mainContext = ctx;
      (this[methodName] as any)(...args);
      mainContext = undefined;
      let statementVar = toStatement(ctx.self, Field.zero, ctx.protocolState);
      return {
        transaction: statementVar.transaction.toConstant(),
        atParty: statementVar.atParty.toConstant(),
      };
    });
    mainContext = {
      self: Party.defaultParty(this.address),
      protocolState: ProtocolStatePredicate.ignoreAll(),
      witnesses: args,
    };
    let proof = await provers[i](statement);
    mainContext = undefined;
    return { proof, statement };
  }

  deploy() {
    try {
      // this.executionState().party.body.update.verificationKey.set = Bool(true);
    } catch {
      throw new Error('Cannot deploy SmartContract outside a transaction.');
    }
  }

  executionState(): ExecutionState {
    // TODO
    if (mainContext !== undefined) {
      return {
        transactionId: 0,
        partyIndex: 0,
        party: mainContext.self as Party & { predicate: AccountPredicate },
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
      const predicate = AccountPredicate.ignoreAll();
      const party = new Party(body, predicate) as Party & {
        predicate: AccountPredicate;
      };
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

  // get protocolState(): ProtocolStatePredicate {
  //   return this.executionState().party.body.protocolState;
  // }

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

    this.executionState().party.predicate.nonce.assertBetween(nonce, nonce);
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
  party: Party & { predicate: AccountPredicate };
};

function emptyWitness<A>(typ: AsFieldElements<A>) {
  // return typ.ofFields(Array(typ.sizeInFields()).fill(Field.zero));
  return Circuit.witness(typ, () =>
    typ.ofFields(Array(typ.sizeInFields()).fill(Field.zero))
  );
}

// functions designed to be called from a CLI

function deploy<S extends typeof SmartContract>(
  SmartContract: S,
  address: PublicKey,
  verificationKey: string
) {
  let i = 0;
  let tx = Mina.createUnsignedTransaction(() => {
    let snapp = new SmartContract(address);
    snapp.deploy();
    i = Mina.currentTransaction!.nextPartyIndex - 1;
    snapp.self.update.verificationKey.set = Bool(true);
    snapp.self.update.verificationKey.value = verificationKey;
  });
  return tx.toJSON();
  // TODO modifying the json after calling to ocaml would avoid deserializing & then serializing the vk
  // but need to compute hash
  // let parties = JSON.parse(tx.toJSON()); // TODO: if we do this anyway, we might want to return the parsed JSON
  // parties.otherParties[i].data.body.update.verificationKey = {
  //   set: Bool(true),
  //   value: {data: verificationKey, hash: Field.zero /* TODO */ },
  // };
  // return JSON.stringify(parties);
}

function compile<S extends typeof SmartContract>(
  SmartContract: S,
  address: PublicKey
) {
  let { getVerificationKeyArtifact } = SmartContract.compile(address);
  return {
    verificationKey: getVerificationKeyArtifact(),
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
