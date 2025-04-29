import {
  AccountUpdate,
  AccountUpdateCommitment,
  AccountUpdateTree,
  AccountUpdateTreeDescription,
  ContextFreeAccountUpdateDescription,
  ContextFreeAccountUpdate,
  DynamicProvable,
} from '../account-update.js';
import { AccountUpdateAuthorizationKind } from '../authorization.js';
import { Account, AccountId } from '../account.js';
import { mapObject, ProvableTuple, ProvableTupleInstances } from '../core.js';
import { getCallerFrame } from '../errors.js';
import { StateDefinition, StateMask, StateLayout, StateReader, StateValues } from '../state.js';
import { checkAndApplyAccountUpdate } from '../zkapp-logic.js';
import { ZkappCommandContext } from '../transaction.js';
import { Cache } from '../../../proof-system/cache.js';
import { Method as ZkProgramMethod, Proof, ZkProgram } from '../../../proof-system/zkprogram.js';
import { Bool } from '../../../provable/bool.js';
import { Field } from '../../../provable/field.js';
import { UInt32, UInt64 } from '../../../provable/int.js';
import { Provable } from '../../../provable/provable.js';
import { PublicKey } from '../../../provable/crypto/signature.js';
import { Unconstrained } from '../../../provable/types/unconstrained.js';
import { VerificationKey } from '../../../proof-system/verification-key.js';
import { ZkappConstants } from '../../v1/constants.js';
import { MinaAmount } from '../currency.js';

export {
  MinaProgramEnv,
  MinaProgramMethodReturn,
  MinaProgramMethodImpl,
  MinaProgramMethodProver,
  MinaProgramDescription,
  MinaProgram,
};

class MinaProgramEnv<State extends StateLayout> {
  private expectedPreconditions: Unconstrained<{
    balance?: MinaAmount;
    nonce?: UInt32;
    receiptChainHash?: Field;
    delegate?: PublicKey;
    state: StateMask<State>;
    actionState?: Field;
    isProven?: Bool;
  }>;

  constructor(
    public State: StateDefinition<State>,
    private account: Unconstrained<Account<State>>,
    // TODO: we can actually remove this since the verification key will always be set on an
    //       account before we call a method on it
    private verificationKey: Unconstrained<VerificationKey>
  ) {
    this.expectedPreconditions = Unconstrained.from({
      state: StateMask.create(State),
    });
  }

  get accountId(): AccountId {
    return Provable.witness(AccountId, () => this.account.get().accountId);
  }

  get accountVerificationKeyHash(): Field {
    return Provable.witness(Field, () => this.account.get().zkapp.verificationKey.hash);
  }

  get programVerificationKey(): VerificationKey {
    return Provable.witness(VerificationKey, () => this.verificationKey.get());
  }

  get balance(): MinaAmount {
    return Provable.witness(UInt64, () => {
      const balance = this.account.get().balance;
      this.expectedPreconditions.get().balance = balance;
      return balance;
    });
  }

  get nonce(): UInt32 {
    return Provable.witness(UInt32, () => {
      const nonce = this.account.get().nonce;
      this.expectedPreconditions.get().nonce = nonce;
      return nonce;
    });
  }

  get receiptChainHash(): Field {
    return Provable.witness(Field, () => {
      const receiptChainHash = this.account.get().receiptChainHash;
      this.expectedPreconditions.get().receiptChainHash = receiptChainHash;
      return receiptChainHash;
    });
  }

  get delegate(): PublicKey {
    return Provable.witness(PublicKey, () => {
      const delegate = this.account.get().delegate ?? this.account.get().accountId.publicKey;
      this.expectedPreconditions.get().delegate = delegate;
      return delegate;
    });
  }

  get state(): StateReader<State> {
    const accountState = Provable.witness(Unconstrained<StateValues<State>>, () => {
      return Unconstrained.from(this.account.get().zkapp.state);
    });
    const accountStateMask = Provable.witness(Unconstrained<StateMask<State>>, () => {
      return Unconstrained.from(this.expectedPreconditions.get().state);
    });
    return StateReader.create(this.State, accountState, accountStateMask);
  }

  // only returns the most recent action state for an account
  get actionState(): Field {
    return Provable.witness(Field, () => {
      const actionState =
        this.account.get().zkapp.actionState[ZkappConstants.ACCOUNT_ACTION_STATE_BUFFER_SIZE - 1];
      this.expectedPreconditions.get().actionState = actionState;
      return actionState;
    });
  }

  get isProven(): Bool {
    return Provable.witness(Bool, () => {
      const isProven = this.account.get().zkapp.isProven;
      this.expectedPreconditions.get().isProven = isProven;
      return isProven;
    });
  }

  static sizeInFields(): number {
    return 0;
  }

  static toFields<State extends StateLayout>(_x: MinaProgramEnv<State>): Field[] {
    return [];
  }

  static toAuxiliary<State extends StateLayout>(x?: MinaProgramEnv<State>): any[] {
    // if(x === undefined) throw new Error('invalid call to MinaProgram#toAuxiliary');
    // eww... how do I handle the undefined MinaProgramEnv situation?
    return [x?.account, x?.verificationKey];
  }

  static fromFields(_fields: Field[], aux: any[]): MinaProgramEnv<'GenericState'> {
    return new MinaProgramEnv('GenericState', aux[0], aux[1]);
  }

  static toValue<State extends StateLayout>(x: MinaProgramEnv<State>): MinaProgramEnv<State> {
    return x;
  }

  static fromValue<State extends StateLayout>(x: MinaProgramEnv<State>): MinaProgramEnv<State> {
    return x;
  }

  static check<State extends StateLayout>(_x: MinaProgramEnv<State>) {
    // TODO NOW
    //throw new Error('TODO');
  }
}

type MinaProgramMethodReturn<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> =
  | Omit<
      AccountUpdateTreeDescription<
        ContextFreeAccountUpdateDescription<State, Event, Action>,
        AccountUpdate
      >,
      'authorizationKind'
    >
  | ContextFreeAccountUpdate<State, Event, Action>;

type MinaProgramMethodImpl<
  State extends StateLayout,
  Event,
  Action,
  PrivateInputs extends ProvableTuple
> = {
  privateInputs: PrivateInputs;
  method(
    env: MinaProgramEnv<State>,
    ...args: ProvableTupleInstances<PrivateInputs>
  ): Promise<MinaProgramMethodReturn<State, Event, Action>>;
};

// TODO: return the tree, not the proof and the single update
type MinaProgramMethodProver<
  State extends StateLayout,
  Event,
  Action,
  PrivateInputs extends ProvableTuple
> = (
  env: ZkappCommandContext,
  accountId: AccountId,
  ...args: ProvableTupleInstances<PrivateInputs>
) => Promise<AccountUpdateTree<AccountUpdate<State, Event, Action>, AccountUpdate>>;

interface MinaProgramDescription<
  State extends StateLayout,
  Event,
  Action,
  MethodPrivateInputs extends { [key: string]: ProvableTuple }
> {
  name: string;
  State: StateDefinition<State>;
  Event: DynamicProvable<Event>;
  Action: DynamicProvable<Action>;
  methods: {
    [key in keyof MethodPrivateInputs]: MinaProgramMethodImpl<
      State,
      Event,
      Action,
      MethodPrivateInputs[key]
    >;
  };
}

// TODO: use ZkProgram types to help construct this
type MinaProgram<
  State extends StateLayout,
  Event,
  Action,
  MethodPrivateInputs extends { [key: string]: ProvableTuple }
> = {
  name: string;
  State: StateDefinition<State>;
  Event: DynamicProvable<Event>;
  Action: DynamicProvable<Action>;
  compile(options?: { cache?: Cache; forceRecompile?: boolean }): Promise<{
    verificationKey: {
      data: string;
      hash: Field;
    };
  }>;
} & {
  [key in keyof MethodPrivateInputs]: MinaProgramMethodProver<
    State,
    Event,
    Action,
    MethodPrivateInputs[key]
  >;
};

// TODO really need to fix the types here...
function zkProgramMethod<
  State extends StateLayout,
  Event,
  Action,
  PrivateInputs extends ProvableTuple
>(
  State: StateDefinition<State>,
  Event: DynamicProvable<Event>,
  Action: DynamicProvable<Action>,
  impl: MinaProgramMethodImpl<State, Event, Action, PrivateInputs>
): ZkProgramMethod<
  undefined,
  AccountUpdateCommitment,
  {
    privateInputs: [Provable<MinaProgramEnv<State>>, ...PrivateInputs];
    auxiliaryOutput: typeof AccountUpdateTree<AccountUpdate>;
  }
> {
  return {
    privateInputs: [MinaProgramEnv, ...impl.privateInputs],
    auxiliaryOutput: AccountUpdateTree,
    // async method(env: MinaProgramEnv<State>, ...inputs: ProvableTupleInstances<PrivateInputs>) {
    async method(
      ...[env, ...inputs]: [MinaProgramEnv<State>, ...ProvableTupleInstances<PrivateInputs>]
    ) {
      const describedUpdate = await impl.method(env, ...inputs);
      let describedUpdate2;
      if (describedUpdate instanceof ContextFreeAccountUpdate) {
        // TODO: is it ok that we allow signature and proof as an option here, but don't let the description return such an authorization kind?
        if (!describedUpdate.authorizationKind.isProved.toBoolean()) {
          throw new Error('TODO: error message');
        }
        describedUpdate2 = describedUpdate;
      } else {
        describedUpdate2 = {
          ...describedUpdate,
          authorizationKind: AccountUpdateAuthorizationKind.Proof(),
        };
      }

      const callData = /* TODO */ new Field(0);
      const updateTree = AccountUpdateTree.from(
        {
          ...describedUpdate2,
          accountId: env.accountId,
          // TODO: take the verification key from the account state after the virtual update application
          verificationKeyHash: env.programVerificationKey.hash,
          callData,
        },
        // TODO: return the specialized version...
        (descr) => new AccountUpdate(State, Event, Action, descr)
      );

      // const freeUpdate = ContextFreeAccountUpdate.from(State, Event, Action, describedUpdate2);
      // const update = new AccountUpdate(State, Event, Action, {
      //   accountId: env.accountId,
      //   verificationKeyHash: env.verificationKeyHash,
      //   callData,
      //   update: freeUpdate,
      // })

      if (Provable.inProver()) {
        // env.checkAndApplyUpdateAsProver(update);
      }

      // TODO: return update as auxiliary output
      return {
        publicOutput: updateTree.rootAccountUpdate.commit('testnet' /* TODO */),
        auxiliaryOutput: AccountUpdateTree.mapRoot(updateTree, (accountUpdate) =>
          accountUpdate.toGeneric()
        ),
      };
    },
  } as unknown as ZkProgramMethod<
    undefined,
    AccountUpdateCommitment,
    {
      privateInputs: [Provable<MinaProgramEnv<State>>, ...PrivateInputs];
      auxiliaryOutput: typeof AccountUpdateTree<AccountUpdate>;
    }
  >;
}

function proverMethod<
  State extends StateLayout,
  Event,
  Action,
  PrivateInputs extends ProvableTuple
>(
  State: StateDefinition<State>,
  Event: DynamicProvable<Event>,
  Action: DynamicProvable<Action>,
  getVerificationKey: () => VerificationKey,
  rawProver: (
    env: MinaProgramEnv<State>,
    ...inputs: ProvableTupleInstances<PrivateInputs>
  ) => Promise<{
    proof: Proof<undefined, AccountUpdateCommitment>;
    auxiliaryOutput: AccountUpdateTree<AccountUpdate>;
  }>,
  _impl: MinaProgramMethodImpl<State, Event, Action, PrivateInputs>
): MinaProgramMethodProver<State, Event, Action, PrivateInputs> {
  // TODO HORRIBLE HACK:
  // In order to circumvent the lack of support for nested program calls, some hard assumptions are
  // made within this function which will only work if certain rules are followed when prover
  // methods are invoked externally.
  //
  // We perform shallow evaluation on the roots of account update trees returned by method
  // invocations. This requires that all child updates were manually applied before invoking the
  // method call. Importantly, with this restriction, methods cannot actually generate new
  // children, the children must be passed in as private inputs and constrained accordingly.
  // Unproven update arguments which are not at the root of the tree returned by a method must be
  // manually applied to the ledger in the correct order.

  return async (
    ctx: ZkappCommandContext,
    accountId: AccountId,
    ...inputs: ProvableTupleInstances<PrivateInputs>
  ) => {
    const callSite = getCallerFrame();
    const verificationKey = getVerificationKey();
    const genericAccount = ctx.ledger.getAccount(accountId) ?? Account.empty(accountId);

    // TODO: This conversion is safe only under the assumption that the account is new or the
    //       verification key matches the current program's verification key. Assert this is true,
    //       or throw an error.
    const account: Account<State> = Account.fromGeneric(genericAccount, State);

    const env = new MinaProgramEnv(
      account.State,
      Unconstrained.from(account),
      Unconstrained.from(verificationKey)
    );

    const { proof, auxiliaryOutput: genericAccountUpdateTree } = await rawProver(env, ...inputs);
    genericAccountUpdateTree.rootAccountUpdate.proof = proof;

    // TODO: We currently throw an error here if there are any children, until we solve the
    //       problems around account update tracing and not adding duplicate child updates
    //       to the root (when calling this prover method).
    if (genericAccountUpdateTree.children.length !== 0)
      throw new Error('TODO: support nested account updates');

    // TODO HACK: Currently, the rawProver is only able to return the generic state representation,
    //            so we must convert it again for the return value.
    const accountUpdateTree = AccountUpdateTree.mapRoot(genericAccountUpdateTree, (accountUpdate) =>
      AccountUpdate.fromGeneric(accountUpdate, State, Event, Action)
    );

    // apply only the root update and not the children (see above for details)
    const applied = checkAndApplyAccountUpdate(
      ctx.chain,
      account,
      accountUpdateTree.rootAccountUpdate,
      ctx.feeExcessState
    );

    let errors: Error[];
    switch (applied.status) {
      case 'Applied':
        ctx.ledger.setAccount(applied.updatedAccount.toGeneric());
        ctx.feeExcessState = applied.updatedFeeExcessState;
        errors = [];
        break;
      case 'Failed':
        errors = applied.errors;
        break;
    }

    const trace = {
      accountId,
      callSite,
      errors,
      // TODO (for now, we throw an error above if there are children)
      childTraces: [],
    };

    ctx.unsafeAddWithoutApplying(genericAccountUpdateTree, trace);

    // TODO: do we need to clone the accountUpdate here so that we have fresh variables?
    return accountUpdateTree;
  };
}

function MinaProgram<
  State extends StateLayout,
  Event,
  Action,
  MethodPrivateInputs extends { [key: string]: ProvableTuple }
>(
  descr: MinaProgramDescription<State, Event, Action, MethodPrivateInputs>
): MinaProgram<State, Event, Action, MethodPrivateInputs> {
  const programMethods = mapObject<
    {
      [key in keyof MethodPrivateInputs]: MinaProgramMethodImpl<
        State,
        Event,
        Action,
        MethodPrivateInputs[key]
      >;
    },
    {
      [key in keyof MethodPrivateInputs]: ZkProgramMethod<
        undefined,
        AccountUpdateCommitment,
        {
          privateInputs: [Provable<MinaProgramEnv<State>>, ...MethodPrivateInputs[key]];
          auxiliaryOutput: typeof AccountUpdateTree<AccountUpdate>;
        }
      >;
    }
  >(
    descr.methods,
    <Key extends keyof MethodPrivateInputs>(
      key: Key
    ): ZkProgramMethod<
      undefined,
      AccountUpdateCommitment,
      {
        privateInputs: [Provable<MinaProgramEnv<State>>, ...MethodPrivateInputs[Key]];
        auxiliaryOutput: typeof AccountUpdateTree<AccountUpdate>;
      }
    > => zkProgramMethod(descr.State, descr.Event, descr.Action, descr.methods[key])
  );

  const Program = ZkProgram<
    {
      publicInput: undefined;
      publicOutput: typeof AccountUpdateCommitment;
      methods: {
        [key in keyof MethodPrivateInputs]: {
          privateInputs: [Provable<MinaProgramEnv<State>>, ...MethodPrivateInputs[key]];
          auxiliaryOutput: typeof AccountUpdateTree;
        };
      };
    },
    {
      [key in keyof MethodPrivateInputs]: {
        // method(...privateInputs: [MinaProgramEnv<State>, ...({ [I in keyof MethodPrivateInputs[key]]: InferProvable<MethodPrivateInputs[key][I]>} & any[]) ]): Promise<{publicOutput: AccountUpdateCommitment, auxiliaryOutput: AccountUpdate}>
        method(...privateInputs: any[]): Promise<any>;
      };
      // [key in keyof MethodPrivateInputs]: ZkProgramMethod<
      //   any,
      //   any,
      //   any
      //   // undefined,
      //   // typeof AccountUpdateCommitment,
      //   // {
      //   //   privateInputs: [Provable<MinaProgramEnv<State>>, ...MethodPrivateInputs[key]],
      //   //   auxiliaryOutput: typeof AccountUpdate
      //   // }
      // >
    }
  >({
    name: descr.name,
    publicInput: undefined,
    publicOutput: AccountUpdateCommitment,

    methods: programMethods as any /* TODO */,
  });

  // TODO: proper verification key caching
  let verificationKey: VerificationKey | null = null;

  function getVerificationKey() {
    if (verificationKey === null) {
      throw new Error('You must compile a MinaProgram before calling any of methods on it.');
    }
    return verificationKey;
  }

  // TODO: this is wrong -- we need to check and interact with options, not just forward them.
  // A proper fix here is probably to refactor the compile interface for ZkProgram... this cache pattern is odd.
  async function compile(options?: {
    cache?: Cache;
    forceRecompile?: boolean;
    proofsEnabled?: boolean;
  }): Promise<{
    verificationKey: { data: string; hash: Field };
  }> {
    const compiledProgram = await Program.compile(options);
    verificationKey = new VerificationKey(compiledProgram.verificationKey);
    return compiledProgram;
  }

  const proverMethods = mapObject(descr.methods, (key: keyof MethodPrivateInputs) =>
    proverMethod(
      descr.State,
      descr.Event,
      descr.Action,
      getVerificationKey,
      Program[key] as any /* TODO */,
      descr.methods[key]
    )
  );

  return {
    name: descr.name,
    State: descr.State,
    Event: descr.Event,
    Action: descr.Action,
    compile,
    ...proverMethods,
  };
}
