import {
  Circuit,
  Field,
  AsFieldElements,
  Ledger,
  Pickles,
  Types,
  Rule,
} from '../snarky';
import { cloneCircuitValue } from './circuit_value';
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
import {
  withContext,
  getContext,
  inCompile,
  mainContext,
} from './global-context';
import {
  assertPreconditionInvariants,
  cleanPreconditionsCache,
} from './precondition';

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
type Statement = Field[]; // [transaction, atParty]

type Proof = unknown; // opaque
type Prover = (
  statement: Statement,
  previousStatements: Statement[]
) => Promise<Proof>;

function toStatement(self: Party, tail: Field) {
  // TODO hash together party with tail in the right way
  let atParty = self.hash();
  let transaction = Ledger.hashTransactionChecked(atParty);
  return { transaction, atParty };
}

function checkStatement(
  [transaction, atParty]: Statement,
  self: Party,
  tail: Field
) {
  // ATM, we always compute the statement in checked mode to make assertEqual pass
  let otherStatement = toStatement(self, tail);
  atParty.assertEquals(otherStatement.atParty);
  transaction.assertEquals(otherStatement.transaction);
}

function picklesRuleFromFunction(
  identifier: string,
  func: (...args: unknown[]) => void,
  witnessTypes: AsFieldElements<unknown>[]
): Rule {
  function main(statement: Statement, previousStatements: Statement[]) {
    let { self, witnesses } = getContext();
    witnesses = witnessTypes.map(
      witnesses
        ? (type, i) => Circuit.witness(type, () => witnesses![i])
        : emptyWitness
    );
    func(...witnesses);
    let tail = Field.zero;
    // FIXME: figure out correct way to constrain statement https://github.com/o1-labs/snarkyjs/issues/98
    statement[0].assertEquals(statement[0]);
    // checkStatement(statement, self, tail);

    // check the self party right after calling the method
    // TODO: this needs to be done in a unified way for all parties that are created
    assertPreconditionInvariants(self);
    cleanPreconditionsCache(self);
    return [];
  }

  return { identifier, main, proofsToVerify: [] };
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
      { self: selfParty(address), inCompile: true },
      () => Pickles.compile(rules, 2)
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

  private executionState(): ExecutionState {
    // TODO reconcile mainContext with currentTransaction
    if (mainContext !== undefined) {
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

  setValue<T>(maybeValue: SetOrKeep<T>, value: T) {
    Party.setValue(maybeValue, value);
  }

  // TBD: do we want to have setters for updates, e.g. this.permissions = ... ?
  // I'm hesitant to make the API even more magical / less explicit
  setPermissions(permissions: Permissions) {
    this.setValue(this.self.update.permissions, permissions);
  }
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

function emptyValue<A>(typ: AsFieldElements<A>) {
  return typ.ofFields(Array(typ.sizeInFields()).fill(Field.zero));
}

function emptyWitness<A>(typ: AsFieldElements<A>) {
  // return typ.ofFields(Array(typ.sizeInFields()).fill(Field.zero));
  return Circuit.witness(typ, () =>
    typ.ofFields(Array(typ.sizeInFields()).fill(Field.zero))
  );
}

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
