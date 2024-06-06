import { MerkleList } from '../../provable/merkle-list.js';
import { TupleN } from '../../util/types.js';
import { Proof } from '../../proof-system/zkprogram.js';
import { Field } from '../../provable/wrapped.js';
import { SmartContract } from '../zkapp.js';
import { assertDefined } from '../../util/errors.js';
import { From } from '../../../bindings/lib/provable-generic.js';
import { InferProvable } from '../../provable/types/struct.js';

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

  _contract?: SmartContract;

  /**
   * Set the smart contract instance this reducer is connected with.
   *
   * Note: This is a required step before using `dispatch()`, `proveNextBatch()` or `processNextBatch()`.
   */
  setContractInstance(contract: SmartContract & { reducer?: undefined }) {
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
  processNextBatch(
    proof: Promise<Proof<Field, Field>>,
    callback: (action: InferProvable<ActionType>) => void
  ): Promise<void> {
    let contract = assertDefined(
      this._contract,
      'Contract instance must be set before processing actions'
    );
    notImplemented();
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
type ActionBatch<Action, BatchSize extends number = number> = {
  batch: TupleN<Action, BatchSize>;
  batchSize: BatchSize;

  initialActionState: Field;
  get finalActionState(): Field;

  batchActions: MerkleList<MerkleList<Field>>;
  remainingActions: MerkleList<MerkleList<Field>>;

  /**
   * Iterate over the actions in this batch.
   *
   * Note: This is simply a for-loop over the fixed-size `batch`.
   */
  forEach(callback: (action: Action) => void): void;

  /**
   * Verify the validity of this batch of actions against the given initial & final action states and the provided proof.
   */
  verify(
    initialActionState: Field,
    finalActionState: Field,
    actionBatchProof: ActionBatchProof
  ): void;

  /**
   * Prove the validity of this batch of actions, by showing that the `remainingActions`, when applied after the
   * `batchActions`, result in a final state that forms the proof's public output.
   */
  prove(): Promise<ActionBatchProof>;
};

type ActionBatchProof = Proof<Field, Field>;

function notImplemented(): never {
  throw Error('Not implemented');
}
