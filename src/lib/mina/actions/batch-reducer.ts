import { MerkleList, MerkleListIterator } from '../../provable/merkle-list.js';
import { TupleN } from '../../util/types.js';
import { Proof, SelfProof } from '../../proof-system/zkprogram.js';
import { Bool, Field } from '../../provable/wrapped.js';
import { SmartContract } from '../zkapp.js';
import { assertDefined } from '../../util/assert.js';
import { From, InferValue } from '../../../bindings/lib/provable-generic.js';
import {
  InferProvable,
  ProvableExtended,
} from '../../provable/types/struct.js';
import { Provable } from '../../provable/provable.js';
import { provableFromClass } from '../../provable/types/provable-derivers.js';
import { Actionable } from './offchain-state-serialization.js';
import {
  ProvableHashable,
  hashWithPrefix,
} from '../../provable/crypto/poseidon.js';
import { prefixes } from '../../../bindings/crypto/constants.js';
import { Actions } from '../account-update.js';
import { contract } from '../smart-contract-context.js';
import { State } from '../state.js';
import { Option } from '../../provable/option.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { fetchActions, getProofsEnabled } from '../mina-instance.js';
import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { hashWithPrefix as hashWithPrefixBigint } from '../../../mina-signer/src/poseidon-bigint.js';

// external API
export { BatchReducer, ActionBatch };

// internal API
export { actionBatchProgram, proveActionBatch };

/**
 * A reducer to process actions in fixed-size batches.
 */
class BatchReducer<
  ActionType extends Actionable<any>,
  BatchSize extends number = number,
  Action = InferProvable<ActionType>
> {
  batchSize: BatchSize;
  actionType: Actionable<Action>;
  program: ActionBatchProgram;
  Proof: typeof Proof<Field, Field>;

  constructor({
    actionType,
    batchSize,
    maxUpdatesPerProof = 100,
  }: {
    actionType: ActionType;
    batchSize: BatchSize;
    maxUpdatesPerProof?: number;
  }) {
    this.batchSize = batchSize;
    this.actionType = actionType as Actionable<Action>;
    this.program = actionBatchProgram(maxUpdatesPerProof);
    this.Proof = ZkProgram.Proof(this.program);
  }

  static get initialActionState() {
    return Actions.emptyActionState();
  }

  _contract?: BatchReducerContract;
  contract() {
    let contract_ = assertDefined(
      this._contract,
      'Contract instance must be set before calling this method'
    );
    return contract(contract_.constructor) as BatchReducerContract;
  }

  /**
   * Set the smart contract instance this reducer is connected with.
   *
   * Note: This is a required step before using `dispatch()`, `proveNextBatch()` or `processNextBatch()`.
   */
  setContractInstance(contract: BatchReducerContract) {
    this._contract = contract;
  }

  /**
   * Submit an action.
   */
  dispatch(action: From<ActionType>) {
    let update = this.contract().self;
    let fields = this.actionType.toFields(this.actionType.fromValue(action));
    update.body.actions = Actions.pushEvent(update.body.actions, fields);
  }

  /**
   * Process the next batch of actions.
   *
   * Verifies the validity of the processed batch of actions against the onchain action state,
   * with the help of the provided proof that you can create with `proveNextBatch()`.
   *
   * **Important**: The callback exposes the action's value along with an `isDummy` flag.
   * This is necessary because we process a dynamically-sized list in a fixed number of steps. Dummies will be passed to your callback
   * once the actual actions are exhausted. There are no guarantees about the `value` in case that `isDummy` is `true`,
   * so make sure to handle the `isDummy` case appropriately.
   *
   * **Warning**: Calling `processNextBatch()` twice in the same contract doesn't mean processing two different batches of actions,
   * but rather, processing the same batch of actions twice (= the current next batch according to onchain state).
   */
  async processNextBatch(
    proof: Proof<Field, Field>,
    callback: (action: Action, isDummy: Bool) => void
  ): Promise<void> {
    let contract = this.contract();

    // get actions based on the current action state
    let initialActionState = contract.actionState.getAndRequireEquals();
    let actions = await this.getActionBatch(initialActionState, this.batchSize);

    // verify the actions & proof against the onchain action state
    let finalActionState = contract.account.actionState.getAndRequireEquals();
    actions.verify(initialActionState, finalActionState, proof);

    // process the actions
    actions.forEach(callback);

    // update the action state
    contract.actionState.set(actions.batchActions.hash);
  }

  /**
   * Compile the recursive action batch prover.
   */
  async compile() {
    return await this.program.compile();
  }

  /**
   * Create a proof which helps guarantee the correctness of the next actions batch.
   */
  async proveNextBatch(): Promise<ActionBatchProof> {
    let contract = assertDefined(
      this._contract,
      'Contract instance must be set before proving actions'
    );
    let actionState = assertDefined(
      await contract.actionState.fetch(),
      'Could not fetch action state'
    ).toBigInt();
    let actions = await fetchActionBatch(
      contract,
      actionState,
      this.actionType,
      this.batchSize
    );
    return actions.prove(this.program);
  }

  /**
   * Fetch a batch of actions to process, starting from a given action state.
   *
   * **Warning**: This is a lower-level API to give you additional flexibility.
   * For typical cases, use {@link processNextBatch}. It calls this method internally and
   * does exactly what's needed inside your smart contract method to process the next batch of actions
   * while verifying that it's valid against the onchain state.
   */
  async getActionBatch<N extends number = BatchSize>(
    fromActionState: Field,
    batchSize?: N
  ): Promise<ActionBatch<Action, N>> {
    let contract = assertDefined(
      this._contract,
      'Contract instance must be set before fetching actions'
    );
    let batchSize_ = (batchSize ?? this.batchSize) as N;
    const ActionB = ActionBatch(this.actionType, batchSize_);
    return Provable.witnessAsync(ActionB.provable, () =>
      fetchActionBatch(
        contract,
        fromActionState.toBigInt(),
        this.actionType,
        batchSize_
      )
    );
  }
}

type BatchReducerContract = SmartContract & {
  reducer?: undefined;
  actionState: State<Field>;
};

/**
 * Provable type that represents a batch of actions.
 *
 * This comes with the built-in guarantee that the given `batch` exactly contains the same actions
 * as `batchActions` with the initial state `initialActionState`.
 *
 * The `prove()` and `verify()` methods are intended to prove the missing part: namely, that the batch
 * is connected to a given final action state (typically stored onchain) by the `remainingActions`.
 */
function ActionBatch<
  ActionType extends Actionable<any>,
  BatchSize extends number = number
>(
  actionType: ActionType,
  batchSize: BatchSize,
  { maxActionsPerUpdate = 4 } = {}
): typeof ActionBatchBase<InferProvable<ActionType>, BatchSize> & {
  provable: ProvableExtended<ActionBatch<InferProvable<ActionType>, BatchSize>>;
} {
  return class ActionBatch_ extends ActionBatchBase<
    InferProvable<ActionType>,
    BatchSize
  > {
    get batchSize() {
      return batchSize;
    }
    get maxActionsPerUpdate() {
      return maxActionsPerUpdate;
    }
    get actionType() {
      return actionType as Actionable<InferProvable<ActionType>>;
    }

    static provable = provableFromClass(
      ActionBatch_,
      provableBase(actionType, batchSize)
    );
  };
}

type ActionBatch<Action, BatchSize extends number = number> = ActionBatchBase<
  Action,
  BatchSize
>;

class ActionBatchBase<Action, BatchSize extends number = number> {
  // provable properties

  batch: TupleN<Option<Action>, BatchSize>;
  initialActionState: Field;
  batchActions: MerkleListIterator<MerkleList<Field>>;
  remainingActions: Unconstrained<(bigint | undefined)[]>;

  get actionStateAfterBatch(): Field {
    return this.batchActions.hash;
  }

  // static data defining the constraints

  get batchSize(): BatchSize {
    throw Error('Batch size must be defined in a subclass');
  }
  /**
   * How many actions can fit in a single inner Merkle list.
   *
   * The default is 4.
   */
  get maxActionsPerUpdate(): number {
    return 4;
  }
  get actionType(): Actionable<Action> {
    throw Error('Action type must be defined in a subclass');
  }

  constructor(input: {
    batch: TupleN<Option<Action>, BatchSize>;
    initialActionState: Field;
    batchActions: MerkleListIterator<MerkleList<Field>>;
    remainingActions: Unconstrained<ActionHashes>;
  }) {
    this.batch = input.batch;
    this.initialActionState = input.initialActionState;
    this.batchActions = input.batchActions;
    this.remainingActions = input.remainingActions;
  }

  /**
   * Iterate over the actions in this batch.
   *
   * Note: This is simply a for-loop over the fixed-size `batch`.
   *
   * **Warning**: The callback exposes the action's value along with an `isDummy` flag.
   * This is necessary because we process a dynamically-sized list in a fixed number of steps.
   * There are no guarantees about the `value` in case that `isDummy` is `true`, so make sure to handle this case appropriately.
   */
  forEach(callback: (action: Action, isDummy: Bool) => void): void {
    for (let i = 0; i < this.batchSize; i++) {
      let { isSome, value } = this.batch[i];
      callback(value, isSome.not());
    }
  }

  /**
   * Create a proof that connects this action batch with a final action state.
   */
  prove(program: ActionBatchProgram): Promise<ActionBatchProof> {
    return proveActionBatch(
      this.actionStateAfterBatch,
      this.remainingActions.get(),
      program
    );
  }

  /**
   * Verify the validity of this batch of actions against the given initial & final action states and the provided proof.
   */
  verify(
    initialActionState: Field,
    finalActionState: Field,
    actionBatchProof: ActionBatchProof
  ): void {
    // verify the proof
    actionBatchProof.verify();

    // initial action state consistency
    this.initialActionState.assertEquals(initialActionState);

    // action state after batch consistency
    this.actionStateAfterBatch.assertEquals(actionBatchProof.publicInput);

    // final action state consistency
    finalActionState.assertEquals(actionBatchProof.publicOutput);
  }

  /**
   * `check` proves the consistency of `batch`, `batchActions` and `initialActionState`:
   * When applying the actions in `batch` to the initial action state `initialActionState`,
   * we obtain the same hash that `batchActions` represents.
   *
   * Note: `check()` doesn't prove anything about the `remainingActions` -- this has to be done separately
   * with a recursive proof, created using `proveActionBatch()` and verified in provable code using `verify()`.
   */
  static check<Action>(value: ActionBatchBase<Action>) {
    let {
      batch,
      initialActionState,
      batchActions,
      maxActionsPerUpdate,
      batchSize,
      actionType,
    } = value;
    const optionType = Option(actionType);

    // check basic type properties
    batch.forEach((action) => optionType.check(action));

    // linearize `batchActions` into a flat MerkleList
    batchActions.currentHash.assertEquals(initialActionState);
    let batchActionsFlat = FieldList.empty();

    for (let i = 0; i < batchSize; i++) {
      batchActions.next().forEach(maxActionsPerUpdate, (action, isDummy) => {
        batchActionsFlat.pushIf(isDummy.not(), action);
      });
    }
    batchActions.assertAtEnd();
    batchActions.jumpToStart();
    batchActions.currentHash = initialActionState;

    // similarly, push `batch` into a flat list of dynamic size
    let batchFlat = FieldList.empty();

    for (let i = 0; i < batchSize; i++) {
      let { isSome, value } = batch[i];
      batchFlat.pushIf(isSome, hashAction(actionType.toFields(value)));
    }

    // check that the two flat lists are equal
    batchActionsFlat.hash.assertEquals(batchFlat.hash);
  }

  static provable?: ProvableExtended<any> = undefined;
}

// helpers for fetching actions

async function fetchActionBatch<Action, N extends number>(
  contract: { address: PublicKey; tokenId: Field },
  fromActionState: bigint,
  actionType: Actionable<Action>,
  batchSize: N
): Promise<ActionBatch<Action, N>> {
  let result = await fetchActions(
    contract.address,
    { fromActionState: Field(fromActionState) },
    contract.tokenId
  );
  if ('error' in result) throw Error(JSON.stringify(result));

  let actionFields = result.map(({ actions }) =>
    actions.map((action) => action.map(BigInt)).reverse()
  );
  let sliced = sliceFirstBatch(actionFields, batchSize);

  let incompleteBatch = sliced.batch.flatMap((actions) =>
    actions.map((action) => actionType.fromFields(action.map(Field.from)))
  );
  const OptionAction = Option(actionType);
  let batch: Option<Action>[] = Array(batchSize);

  for (let i = 0; i < batchSize; i++) {
    batch[i] = OptionAction.from(incompleteBatch[i]);
  }

  let batchActions = actionFieldsToMerkleList(
    fromActionState,
    sliced.batch
  ).startIterating();
  let remainingActions = actionFieldsToHashes(sliced.remaining);

  return new (ActionBatch(actionType, batchSize))({
    batch: TupleN.fromArray(batchSize, batch),
    initialActionState: Field(fromActionState),
    batchActions,
    remainingActions: Unconstrained.from(remainingActions),
  });
}

/**
 * Slice two lists of lists of actions such that the first list contains at most `batchSize` actions _in total_,
 * and the second list contains the remaining actions.
 */
function sliceFirstBatch<Action>(
  actions: Action[][],
  batchSize: number
): { batch: Action[][]; remaining: Action[][] } {
  let totalSize = 0;
  let batch: Action[][] = [];
  let remaining: Action[][] = [...actions];

  for (let i = 0; i < actions.length; i++) {
    totalSize += remaining[0].length;
    if (totalSize > batchSize) break;

    batch.push(remaining.shift()!);
  }
  return { batch, remaining };
}

function actionFieldsToMerkleList(initialState: bigint, actions: bigint[][][]) {
  let hashes = actions.map((actions) => actions.map(hashAction));
  let lists = hashes.map((hashes) => FieldList.from(hashes));

  class FieldListList extends MerkleList.create<MerkleList<Field>>(
    FieldList.provable,
    (hash: Field, actions: FieldList): Field =>
      Actions.updateSequenceState(hash, actions.hash),
    Field(initialState)
  ) {}

  return FieldListList.from(lists);
}

function actionFieldsToHashes(actions: bigint[][][]) {
  return actions.map((actions) =>
    actions.reduce(pushAction, Actions.empty().hash.toBigInt())
  );
}

function pushAction(actionsHash: bigint, action: bigint[]): bigint {
  return hashWithPrefixBigint(prefixes.sequenceEvents, [
    actionsHash,
    hashWithPrefixBigint(prefixes.event, action),
  ]);
}

function hashAction(action: (Field | bigint)[]): Field {
  return hashWithPrefix(prefixes.event, action.map(Field.from));
}

// types

type ActionBatchProof = Proof<Field, Field>;

class FieldList extends MerkleList.create<Field>(
  Field,
  (actionsHash: Field, actionHash: Field) =>
    hashWithPrefix(prefixes.sequenceEvents, [actionsHash, actionHash]),
  Actions.empty().hash
) {}

class FieldListIterator extends MerkleListIterator.create<MerkleList<Field>>(
  FieldList.provable,
  (hash: Field, actions: FieldList): Field =>
    Actions.updateSequenceState(hash, actions.hash),
  Actions.emptyActionState()
) {}

const provableBase = <ActionType extends Actionable<any>, N extends number>(
  actionType: ActionType,
  batchSize: N
) => ({
  batch: Provable.Array(
    Option(actionType),
    batchSize
  ) as unknown as ProvableHashable<
    TupleN<Option<InferProvable<ActionType>>, N>,
    TupleN<InferValue<ActionType> | undefined, N>
  >,
  initialActionState: Field,
  batchActions: FieldListIterator.provable,
  remainingActions: UnconstrainedActionHashes,
});

// recursive action batch proof

async function proveActionBatch(
  initialActionState: Field,
  actions: ActionHashes,
  program: ActionBatchProgram
): Promise<ActionBatchProof> {
  let { maxUpdatesPerProof } = program;
  const ActionBatchProof = ZkProgram.Proof(program);

  // if proofs are disabled, just compute the final action state and return a dummy proof
  if (!getProofsEnabled()) {
    let state = initialActionState;
    for (let action of actions) {
      if (action === undefined) continue;
      state = Actions.updateSequenceState(state, Field(action));
    }
    return await ActionBatchProof.dummy(initialActionState, state, 1, 14);
  }

  // split actions in chunks of `maxUpdatesPerProof` each
  let chunks: Unconstrained<ActionHashes>[] = [];

  let n = actions.length;
  let nChunks = Math.ceil(n / maxUpdatesPerProof);

  // if there are no actions, we still need to create a proof
  if (n === 0) nChunks = 1;

  for (let i = 0, k = 0; i < nChunks; i++) {
    let batch: ActionHashes = [];
    for (let j = 0; j < maxUpdatesPerProof; j++, k++) {
      batch[j] = actions[k];
    }
    chunks[i] = Unconstrained.from(batch);
  }

  let proof = await ActionBatchProof.dummy(Field(0), Field(0), 1, 14);

  for (let i = 0; i < nChunks; i++) {
    let isRecursive = Bool(i > 0);
    proof = await program.proveChunk(
      initialActionState,
      proof,
      isRecursive,
      chunks[i]
    );
  }

  return proof;
}

type ActionBatchProgram = {
  name: string;
  publicInputType: typeof Field;
  publicOutputType: typeof Field;

  compile(): Promise<{ verificationKey: { data: string; hash: Field } }>;

  proveChunk: (
    startState: Field,
    proofSoFar: ActionBatchProof,
    isRecursive: Bool,
    actionHashes: Unconstrained<ActionHashes>
  ) => Promise<ActionBatchProof>;

  maxUpdatesPerProof: number;
};

/**
 * Create program that proves a hash chain from action state A to action state B.
 */
function actionBatchProgram(maxUpdatesPerProof: number) {
  let program = ZkProgram({
    name: 'action-state-prover',
    publicInput: Field, // start action state
    publicOutput: Field, // end action state

    methods: {
      proveChunk: {
        privateInputs: [SelfProof, Bool, UnconstrainedActionHashes],

        async method(
          startState: Field,
          proofSoFar: ActionBatchProof,
          isRecursive: Bool,
          actionHashes: Unconstrained<ActionHashes>
        ): Promise<Field> {
          proofSoFar.verifyIf(isRecursive);
          let proofStart = Provable.if(
            isRecursive,
            startState,
            proofSoFar.publicInput
          );
          proofSoFar.publicInput.assertEquals(proofStart);
          let state = Provable.if(
            isRecursive,
            proofSoFar.publicOutput,
            startState
          );
          for (let i = 0; i < maxUpdatesPerProof; i++) {
            state = update(state, i, actionHashes);
          }
          return state;
        },
      },
    },
  });
  return Object.assign(program, { maxUpdatesPerProof });
}

const OptionField = Option(Field);
type ActionHashes = (bigint | undefined)[];
const UnconstrainedActionHashes = Unconstrained.provableWithEmpty<ActionHashes>(
  []
);

/**
 * Proves: "There are _some_ actions that get me from the previous to the new state"
 */
function update(
  state: Field,
  i: number,
  actionHashes: Unconstrained<ActionHashes>
) {
  let actionHash = Provable.witness(OptionField, () => actionHashes.get()[i]);
  let newState = Actions.updateSequenceState(state, actionHash.value);
  return Provable.if(actionHash.isSome, newState, state);
}
