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

export { BatchReducer, ActionBatch, ActionBatchProof };

/**
 * A reducer to process actions in fixed-size batches.
 */
function BatchReducer<ActionType, BatchSize extends number = number>(
  actionType: ActionType,
  batchSize: BatchSize
): BatchReducer<ActionType, BatchSize> {
  class BatchReducer_ extends BatchReducerBase<ActionType, BatchSize> {
    get batchSize() {
      return batchSize;
    }
    get actionType() {
      return actionType;
    }
  }

  return new BatchReducer_();
}

type BatchReducer<
  ActionType,
  BatchSize extends number = number
> = BatchReducerBase<ActionType, BatchSize>;

type BatchReducerContract = SmartContract & {
  reducer?: undefined;
  actionState: State<Field>;
};

/**
 * A reducer to process actions in fixed-size batches.
 */
class BatchReducerBase<ActionType, BatchSize extends number = number> {
  get batchSize(): BatchSize {
    throw Error('Batch size must be defined in a subclass');
  }
  get actionType(): ActionType {
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
    let contract = assertDefined(
      this._contract,
      'Contract instance must be set before dispatching actions'
    );
    notImplemented();
  }

  /**
   * Process the next batch of actions.
   *
   * Verifies the validity of the processed batch of actions against the onchain action state,
   * with the help of the provided proof that you can create with `proveNextBatch()`.
   *
   * **Warning**: Calling this twice in the same contract doesn't mean processing two different batches of actions,
   * but rather processing the same batch of actions twice (= the current next batch according to onchain state).
   */
  async processNextBatch(
    proof: Proof<Field, Field>,
    callback: (action: InferProvable<ActionType>, isDummy: Bool) => void
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
  proveNextBatch(): Promise<ActionBatchProof> {
    let contract = assertDefined(
      this._contract,
      'Contract instance must be set before proving actions'
    );
    notImplemented();
  }

  /**
   * Fetch a batch of actions to process, starting from a given action state.
   *
   * **Warning**: This is a lower-level API to give you additional flexibility.
   * For typical use cases, {@link processNextBatch} does exactly what's needed
   * inside your smart contract method to process the next batch of actions.
   */
  getActions<N extends number = BatchSize>(
    fromActionState: Field,
    batchSize?: N
  ): Promise<ActionBatch<InferProvable<ActionType>, N>> {
    let contract = assertDefined(
      this._contract,
      'Contract instance must be set before fetching actions'
    );
    notImplemented();
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
): typeof ActionBatchBase<InferProvable<ActionType>, BatchSize> {
  return class ActionBatch_ extends ActionBatchBase<
    InferProvable<ActionType>,
    BatchSize
  > {
    get batchSize() {
      return batchSize;
    }

    provable = provableFromClass(
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
   */
  forEach(callback: (action: Action, isDummy: Bool) => void): void {
    notImplemented();
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

  provable: ProvableExtended<ActionBatch<Action, BatchSize>> = undefined as any;
}

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
