import { MerkleList } from '../../provable/merkle-list.js';
import { TupleN } from '../../util/types.js';
import { Proof } from '../../proof-system/zkprogram.js';
import { Bool, Field } from '../../provable/wrapped.js';
import { SmartContract } from '../zkapp.js';
import { assertDefined } from '../../util/errors.js';
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
import { fetchActions } from '../mina-instance.js';

export { BatchReducer, ActionBatch, ActionBatchProof };

/**
 * A reducer to process actions in fixed-size batches.
 */
function BatchReducer<
  ActionType extends Actionable<unknown>,
  BatchSize extends number = number
>(
  actionType: ActionType,
  batchSize: BatchSize
): BatchReducer<ActionType, BatchSize> {
  class BatchReducer_ extends BatchReducerBase<ActionType, BatchSize> {
    get batchSize() {
      return batchSize;
    }
    get actionType() {
      return actionType as any;
    }
  }

  return new BatchReducer_();
}

type BatchReducer<
  ActionType extends Actionable<unknown>,
  BatchSize extends number = number
> = BatchReducerBase<ActionType, BatchSize>;

type BatchReducerContract = SmartContract & {
  reducer?: undefined;
  actionState: State<Field>;
};

/**
 * A reducer to process actions in fixed-size batches.
 */
class BatchReducerBase<
  ActionType extends Actionable<unknown>,
  BatchSize extends number = number,
  Action = InferProvable<ActionType>
> {
  get batchSize(): BatchSize {
    throw Error('Batch size must be defined in a subclass');
  }
  get actionType(): Actionable<Action> {
    throw Error('Action type must be defined in a subclass');
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
    let actionState = contract.actionState.getAndRequireEquals();
    let actions = await this.getActions(actionState, this.batchSize);

    // verify the actions & proof against the onchain action state
    let finalActionState = contract.account.actionState.getAndRequireEquals();
    actions.verify(actionState, finalActionState, proof);

    // process the actions
    actions.forEach(callback);

    // update the action state
    contract.actionState.set(actions.batchActions.hash);
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
    );
    let actions = await fetchActionBatch(
      contract,
      actionState,
      this.actionType,
      this.batchSize
    );
    return await actions.prove();
  }

  /**
   * Fetch a batch of actions to process, starting from a given action state.
   *
   * **Warning**: This is a lower-level API to give you additional flexibility.
   * For typical use cases, {@link processNextBatch} does exactly what's needed
   * inside your smart contract method to process the next batch of actions.
   */
  async getActions<N extends number = BatchSize>(
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
      fetchActionBatch(contract, fromActionState, this.actionType, batchSize_)
    );
  }
}

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
  batchSize: BatchSize
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
  get batchSize(): BatchSize {
    throw Error('Batch size must be defined in a subclass');
  }

  batch: TupleN<Option<Action>, BatchSize>;

  initialActionState: Field;
  get finalActionState(): Field {
    return this.remainingActions.hash;
  }

  batchActions: MerkleList<MerkleList<Field>>;
  remainingActions: MerkleList<MerkleList<Field>>;

  constructor(input: {
    batch: TupleN<Action, BatchSize>;
    initialActionState: Field;
    batchActions: MerkleList<MerkleList<Field>>;
    remainingActions: MerkleList<MerkleList<Field>>;
  }) {
    Object.assign(this, input);
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
      callback(value, isSome);
    }
  }

  /**
   * Verify the validity of this batch of actions against the given initial & final action states and the provided proof.
   */
  verify(
    initialActionState: Field,
    finalActionState: Field,
    actionBatchProof: ActionBatchProof
  ): void {
    notImplemented();
  }

  /**
   * Prove the validity of this batch of actions, by showing that the `remainingActions`, when applied after the
   * `batchActions`, result in a final state that forms the proof's public output.
   */
  prove(): Promise<ActionBatchProof> {
    notImplemented();
  }

  static check(value: ActionBatchBase<any, any>) {
    notImplemented();
  }

  static provable?: ProvableExtended<any> = undefined;
}

// helpers for fetching actions

async function fetchActionBatch<Action, N extends number>(
  contract: { address: PublicKey; tokenId: Field },
  fromActionState: Field,
  actionType: Actionable<Action>,
  batchSize: N
): Promise<ActionBatch<Action, N>> {
  let result = await fetchActions(
    contract.address,
    { fromActionState },
    contract.tokenId
  );
  if ('error' in result) throw Error(JSON.stringify(result));

  let actionFields = result.map(({ actions }) =>
    actions.map((action) => action.map(Field.from)).reverse()
  );
  let sliced = sliceFirstBatch(actionFields, batchSize);

  let batch = TupleN.fromArray(
    batchSize,
    sliced.batch.flatMap((actions) =>
      actions.map((action) => actionType.fromFields(action))
    )
  );
  let batchActions = actionFieldsToMerkleList(sliced.batch);
  let remainingActions = actionFieldsToMerkleList(sliced.remaining);

  return new (ActionBatch(actionType, batchSize))({
    batch,
    initialActionState: fromActionState,
    batchActions,
    remainingActions,
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

function actionFieldsToMerkleList(actions: Field[][][]): FieldListList {
  let hashes = actions.map((actions) =>
    actions.map((action) => hashWithPrefix(prefixes.event, action))
  );
  let lists = hashes.map((hashes) => FieldList.from(hashes.map(Field)));
  return FieldListList.from(lists);
}

// types

type ActionBatchProof = Proof<Field, Field>;

class FieldList extends MerkleList.create<Field>(
  Field,
  (actionsHash: Field, actionHash: Field): Field =>
    hashWithPrefix(prefixes.sequenceEvents, [actionsHash, actionHash]),
  Actions.empty().hash
) {}

class FieldListList extends MerkleList.create<MerkleList<Field>>(
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
  batchActions: FieldListList.provable,
  remainingActions: FieldListList.provable,
});

function notImplemented(): never {
  throw Error('Not implemented');
}
