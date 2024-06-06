import { MerkleList } from '../../provable/merkle-list.js';
import { TupleN } from '../../util/types.js';
import { Proof } from '../../proof-system/zkprogram.js';
import { Field } from '../../provable/wrapped.js';
import { SmartContract } from '../zkapp.js';

export { BatchReducer, ActionBatch, ActionBatchProof };

/**
 * A reducer to process actions in fixed-size batches.
 */
type BatchReducer<ActionType, BatchSize extends number = number> = {
  _batchSize: BatchSize;
  _contract?: SmartContract & { reducer?: undefined };

  /**
   * Set the smart contract instance this reducer is connected with.
   *
   * Note: This is a required step before using `dispatch()` or `processNextBatch()`.
   */
  setContractInstance(contract: SmartContract): void;

  /**
   * Submit an action.
   */
  dispatch(action: ActionType): void;

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
    callback: (action: ActionType, actionsProof: Proof<Field, Field>) => void
  ): Promise<void>;

  /**
   * Create a proof which helps guarantee the correctness of the next actions batch.
   */
  proveNextBatch(): Promise<ActionBatchProof>;

  /**
   * Fetch a batch of actions to process, starting from a given action state.
   *
   * **Warning**: This is a lower-level API to give you additional flexibility.
   * For typical use cases, {@link processNextBatch} does exactly what's needed
   * inside your smart contract method to process the next batch of actions.
   */
  getActions<N extends number>(
    fromActionState: Field,
    batchSize: N
  ): Promise<ActionBatch<ActionType, N>>;
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
type ActionBatch<ActionType, BatchSize extends number = number> = {
  batch: TupleN<ActionType, BatchSize>;
  batchSize: BatchSize;

  initialActionState: Field;
  get finalActionState(): Field;

  batchActions: MerkleList<MerkleList<Field>>;
  remainingActions: MerkleList<MerkleList<Field>>;

  /**
   * Iterate over the actions in this batch.
   *
   * Note: This is simply a for-loop over the fixed-size `batchActions`.
   */
  forEach(callback: (action: ActionType) => void): void;

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
