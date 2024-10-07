import { AccountUpdate, AccountUpdateCommitment, AccountUpdateTree, AccountUpdateTreeDescription, ContextFreeAccountUpdateDescription, ContextFreeAccountUpdate, DynamicProvable } from '../mina/account-update.js';
import { AccountUpdateAuthorizationKind } from '../mina/authorization.js';
import { Account } from '../mina/account.js';
import { AccountId, ProvableTuple, ProvableTupleInstances } from '../mina/core.js';
import { StateDefinition, StateLayout } from '../mina/state.js';
import { Cache } from '../../proof-system/cache.js';
import { Method as ZkProgramMethod, Proof, VerificationKey, ZkProgram } from '../../proof-system/zkprogram.js';
import { Field } from '../../provable/field.js';
import { Provable } from '../../provable/provable.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';

// TODO: move
// boo typescript
function mapObject<In extends {[key: string]: any}, Out extends {[key in keyof In]: any}>(
  object: In,
  f: <Key extends keyof In>(key: Key) => Out[Key]
): {[key in keyof In]: Out[key]} {
  const newObject: Partial<{[key in keyof In]: Out[key]}> = {};
  for(const key in object) {
    newObject[key] = f(key);
  }
  return newObject as {[key in keyof In]: Out[key]};
}

/*
// TODO: move
export type ZkProgramMethod<
  PublicInput,
  PublicOutput,
  PrivateInputs extends ProvableTuple
> =
  {
    privateInputs: PrivateInputs,
    // TODO: simplify so that we can use ProvableTupleInstances here instead
    method(
      ...inputs:
        PublicInput extends undefined
          ? ProvableTupleInstances<PrivateInputs>
          : [PublicInput, ...ProvableTupleInstances<PrivateInputs>]
    ): Promise<PublicOutput extends undefined ? void : PublicOutput>
  };
*/

export class MinaProgramEnv<State extends StateLayout> {
  // TODO: reader interface
  constructor(
    private account: Unconstrained<Account<State>>,
    private verificationKey: Unconstrained<VerificationKey>
  ) {}

  // TODO: cache witnesses (per-circuit)
  get accountId(): AccountId {
    return Provable.witness(AccountId, () => this.account.get().accountId);
  }

  get accountVerificationKeyHash(): Field {
    return Provable.witness(Field, () => this.account.get().verificationKeyHash);
  }

  get programVerificationKey(): VerificationKey {
    return Provable.witness(VerificationKey, () => this.verificationKey.get());
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

  static fromFields<State extends StateLayout>(_fields: Field[], aux: any[]): MinaProgramEnv<State> {
    return new MinaProgramEnv(aux[0], aux[1]);
  }

  static toValue<State extends StateLayout>(x: MinaProgramEnv<State>): MinaProgramEnv<State> {
    return x;
  }

  static fromValue<State extends StateLayout>(x: MinaProgramEnv<State>): MinaProgramEnv<State> {
    return x;
  }

  static check<State extends StateLayout>(_x: MinaProgramEnv<State>) {
    // TODO NOW
    // throw new Error('TODO');
  }
}

export type MinaProgramMethodReturn<
  State extends StateLayout,
  Event,
  Action
> =
  | Omit<AccountUpdateTreeDescription<ContextFreeAccountUpdateDescription<State, Event, Action>, AccountUpdate>, "authorizationKind">
  | ContextFreeAccountUpdate<State, Event, Action>;

export type MinaProgramMethodImpl<
  State extends StateLayout,
  Event,
  Action,
  PrivateInputs extends ProvableTuple
> =
  {
    privateInputs: PrivateInputs,
    method(env: MinaProgramEnv<State>, ...args: ProvableTupleInstances<PrivateInputs>): Promise<MinaProgramMethodReturn<State, Event, Action>>
  };

// TODO: return the tree, not the proof and the single update
export type MinaProgramMethodProver<
  State extends StateLayout,
  PrivateInputs extends ProvableTuple
> =
  (account: Account<State>, ...args: ProvableTupleInstances<PrivateInputs>) => Promise<AccountUpdateTree<AccountUpdate>>;
  // Promise<{
  //   proof: Proof<undefined, AccountUpdateCommitment>,
  //   auxiliaryOutput: AccountUpdate
  // }>;

export interface MinaProgramDescription<
  State extends StateLayout,
  Event,
  Action,
  MethodPrivateInputs extends {[key: string]: ProvableTuple}
> {
  name: string;
  State: StateDefinition<State>;
  Event: DynamicProvable<Event>;
  Action: DynamicProvable<Action>;
  methods: {[key in keyof MethodPrivateInputs]: MinaProgramMethodImpl<State, Event, Action, MethodPrivateInputs[key]>};
}

// TODO: use ZkProgram types to help construct this
export type MinaProgram<
  State extends StateLayout,
  Event,
  Action,
  MethodPrivateInputs extends {[key: string]: ProvableTuple}
> = {
  name: string;
  State: StateDefinition<State>;
  Event: DynamicProvable<Event>;
  Action: DynamicProvable<Action>;
  compile(options?: {
    cache?: Cache;
    forceRecompile?: boolean;
  }): Promise<{
    verificationKey: {
        data: string;
        hash: Field;
    };
  }>;
} & {
  [key in keyof MethodPrivateInputs]: MinaProgramMethodProver<State, MethodPrivateInputs[key]>
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
): ZkProgramMethod<undefined, AccountUpdateCommitment, {
  privateInputs: [Provable<MinaProgramEnv<State>>, ...PrivateInputs],
  auxiliaryOutput: typeof AccountUpdateTree<AccountUpdate>
}> {
  return {
    privateInputs: [MinaProgramEnv, ...impl.privateInputs],
    auxiliaryOutput: AccountUpdateTree,
    // async method(env: MinaProgramEnv<State>, ...inputs: ProvableTupleInstances<PrivateInputs>) {
    async method(...[env, ...inputs]: [MinaProgramEnv<State>, ...ProvableTupleInstances<PrivateInputs>]) {
      const describedUpdate = await impl.method(env, ...inputs);
      let describedUpdate2;
      if(describedUpdate instanceof ContextFreeAccountUpdate) {
        // TODO: is it ok that we allow signature and proof as an option here, but don't let the description return such an authorization kind?
        if(!describedUpdate.authorizationKind.isProved.toBoolean()) {
          throw new Error('TODO: error message');
        }
        describedUpdate2 = describedUpdate;
      } else {
        describedUpdate2 = {...describedUpdate, authorizationKind: AccountUpdateAuthorizationKind.Proof()}
      }

      const callData = /* TODO */ new Field(0);
      const updateTree = AccountUpdateTree.from(
        {
          ...describedUpdate2,
          accountId: env.accountId,
          // TODO: take the verification key from the account state after the virtual update application
          verificationKeyHash: env.programVerificationKey.hash,
          callData
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

      if(Provable.inProver()) {
        // env.checkAndApplyUpdateAsProver(update);
      }

      // TODO: return update as auxiliary output
      return {
        publicOutput: updateTree.rootAccountUpdate.commit('testnet' /* TODO */),
        auxiliaryOutput: updateTree
      };
    }
  } as unknown as ZkProgramMethod<undefined, AccountUpdateCommitment, {
    privateInputs: [Provable<MinaProgramEnv<State>>, ...PrivateInputs],
    auxiliaryOutput: typeof AccountUpdateTree<AccountUpdate>
  }>;
}

function proverMethod<
  State extends StateLayout,
  Event,
  Action,
  PrivateInputs extends ProvableTuple
>(
  getVerificationKey: () => VerificationKey,
  rawProver: (env: MinaProgramEnv<State>, ...inputs: ProvableTupleInstances<PrivateInputs>) => Promise<{
    proof: Proof<undefined, AccountUpdateCommitment>,
    auxiliaryOutput: AccountUpdateTree<AccountUpdate>
  }>, 
  _impl: MinaProgramMethodImpl<State, Event, Action, PrivateInputs>
): MinaProgramMethodProver<State, PrivateInputs> {
  return async (account: Account<State>, ...inputs: ProvableTupleInstances<PrivateInputs>) => {
    const verificationKey = getVerificationKey();

    // TODO: thread env between calls
    const env = new MinaProgramEnv(
      new Unconstrained(true, account),
      new Unconstrained(true, verificationKey)
    );
    const {proof, auxiliaryOutput: accountUpdateTree} = await rawProver(env, ...inputs);
    accountUpdateTree.rootAccountUpdate.proof = proof;
    // TODO: do we need to clone the accountUpdate here so that we have fresh variables?
    return accountUpdateTree;
  }
}

export function MinaProgram<
  State extends StateLayout,
  Event,
  Action,
  MethodPrivateInputs extends {[key: string]: ProvableTuple}
> (
  descr: MinaProgramDescription<State, Event, Action, MethodPrivateInputs>
): MinaProgram<State, Event, Action, MethodPrivateInputs> {

  const programMethods = mapObject<{
    [key in keyof MethodPrivateInputs]: MinaProgramMethodImpl<State, Event, Action, MethodPrivateInputs[key]>
  }, {
    [key in keyof MethodPrivateInputs]: ZkProgramMethod<undefined, AccountUpdateCommitment, {
      privateInputs: [Provable<MinaProgramEnv<State>>, ...MethodPrivateInputs[key]],
      auxiliaryOutput: typeof AccountUpdateTree<AccountUpdate>
    }>
  }>(
    descr.methods,
    <Key extends keyof MethodPrivateInputs>(key: Key): ZkProgramMethod<undefined, AccountUpdateCommitment, {
      privateInputs: [Provable<MinaProgramEnv<State>>, ...MethodPrivateInputs[Key]],
      auxiliaryOutput: typeof AccountUpdateTree<AccountUpdate>
    }> =>
      zkProgramMethod(descr.State, descr.Event, descr.Action, descr.methods[key])
  );

  const Program = ZkProgram<
    {
      publicInput: undefined,
      publicOutput: typeof AccountUpdateCommitment,
      methods: {
        [key in keyof MethodPrivateInputs]: {
          privateInputs: [Provable<MinaProgramEnv<State>>, ...MethodPrivateInputs[key]],
          auxiliaryOutput: typeof AccountUpdateTree
        }
      }
    },
    {
      [key in keyof MethodPrivateInputs]: {
        // method(...privateInputs: [MinaProgramEnv<State>, ...({ [I in keyof MethodPrivateInputs[key]]: InferProvable<MethodPrivateInputs[key][I]>} & any[]) ]): Promise<{publicOutput: AccountUpdateCommitment, auxiliaryOutput: AccountUpdate}>
        method(...privateInputs: any[]): Promise<any>
      }
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

    methods: programMethods as any /* TODO */
  });

  // TODO: proper verification key caching
  let verificationKey: VerificationKey | null = null;

  function getVerificationKey() {
    if(verificationKey === null) {
      throw new Error('You must compile a MinaProgram before calling any of methods on it.');
    }
    return verificationKey;
  }

  // TODO: this is wrong -- we need to check and interact with options, not just forward them.
  // A proper fix here is probably to refactor the compile interface for ZkProgram... this cache pattern is odd.
  async function compile(
    options?: {cache?: Cache, forceRecompile?: boolean, proofsEnabled?: boolean}
  ): Promise<{
    verificationKey: { data: string; hash: Field };
  }> {
    const compiledProgram = await Program.compile(options);
    verificationKey = new VerificationKey(compiledProgram.verificationKey);
    return compiledProgram;
  }

  const proverMethods = mapObject(
    descr.methods,
    (key: keyof MethodPrivateInputs) => proverMethod(
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
    ...proverMethods
  };
}
