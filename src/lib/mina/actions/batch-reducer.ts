import {
  MerkleList,
  MerkleListIterator,
  emptyHash,
} from '../../provable/merkle-list.js';
import { TupleN } from '../../util/types.js';
import { Proof, SelfProof } from '../../proof-system/zkprogram.js';
import { Bool, Field } from '../../provable/wrapped.js';
import { SmartContract } from '../zkapp.js';
import { assert, assertDefined } from '../../util/assert.js';
import {
  Constructor,
  From,
  InferValue,
} from '../../../bindings/lib/provable-generic.js';
import {
  Struct,
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
import { Actions as ActionsBigint } from '../../../bindings/mina-transaction/transaction-leaves-bigint.js';
import {
  FlatActions,
  MerkleActionHashes,
  MerkleActions,
  emptyActionState,
} from './action-types.js';

// external API
export { BatchReducer, ActionBatch, ActionStackHints };

// internal API
export {
  actionBatchProgram,
  proveActionBatch,
  actionStackProgram,
  proveActionStack,
};

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
  stackProgram: ActionStackProgram;
  Proof: typeof Proof<Field, Field>;
  StackProof: typeof Proof<Field, ActionStackState>;
  maxUpdatesFinalProof: number;
  maxActionsPerUpdate: number;

  constructor({
    actionType,
    batchSize,
    maxUpdatesPerProof = 300,
    maxUpdatesFinalProof = 100,
    maxActionsPerUpdate = batchSize,
  }: {
    actionType: ActionType;
    batchSize: BatchSize;
    maxUpdatesPerProof?: number;
    maxUpdatesFinalProof?: number;
    maxActionsPerUpdate?: number;
  }) {
    this.batchSize = batchSize;
    this.actionType = actionType as Actionable<Action>;
    this.program = actionBatchProgram(maxUpdatesPerProof);
    this.Proof = ZkProgram.Proof(this.program);
    this.maxUpdatesFinalProof = maxUpdatesFinalProof;
    this.stackProgram = actionStackProgram(maxUpdatesPerProof);
    this.StackProof = ZkProgram.Proof(this.stackProgram);

    assert(
      maxActionsPerUpdate <= batchSize,
      'Invalid maxActionsPerUpdate, must be smaller than the batch size because we process entire updates at once.'
    );
    this.maxActionsPerUpdate = maxActionsPerUpdate;
  }

  static get initialActionState() {
    return Actions.emptyActionState();
  }
  static get initialActionStack() {
    return Actions.emptyActionState();
  }

  _contract?: BatchReducerContract;
  _contractClass?: BatchReducerContractClass;

  contractClass(): BatchReducerContractClass {
    return assertDefined(
      this._contractClass,
      'Contract instance or class must be set before calling this method'
    );
  }

  contract(): BatchReducerContract {
    let Contract = this.contractClass();
    return contract(Contract);
  }

  /**
   * Set the smart contract instance this reducer is connected with.
   *
   * Note: This is a required step before using `dispatch()`, `proveNextBatch()` or `processNextBatch()`.
   */
  setContractInstance(contract: BatchReducerContract) {
    this._contract = contract;
    this._contractClass = contract.constructor as BatchReducerContractClass;
  }

  /**
   * Set the smart contract class this reducer is connected with.
   *
   * Note: You can use either this method or `setContractInstance()` before calling `compile()`.
   * However, `setContractInstance()` is required for `proveNextBatch()`.
   */
  setContractClass(contractClass: BatchReducerContractClass) {
    this._contractClass = contractClass;
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
    let actions = await this.getActionBatch(
      initialActionState,
      this.batchSize,
      contract
    );

    // verify the actions & proof against the onchain action state
    let finalActionState = contract.account.actionState.getAndRequireEquals();
    actions.verify(initialActionState, finalActionState, proof);

    // process the actions
    actions.forEach(callback);

    // update the action state
    contract.actionState.set(actions.batchActions.hash);
  }

  /**
   * Process a batch of actions.
   */
  async processBatch(
    proof: Proof<Field, ActionStackState>,
    hints: ActionStackHints<Action>,
    callback: (action: Action, isDummy: Bool, i: number) => void
  ): Promise<void> {
    let { actionType, batchSize } = this;
    let contract = this.contract();

    // step 0: validate onchain states

    let {
      useOnchainStack,
      processedActionState,
      onchainActionState,
      onchainStack,
    } = hints;
    let useNewStack = useOnchainStack.not();

    // we definitely need to know the processed action state, because we will update it
    contract.actionState.requireEquals(processedActionState);

    // only require the onchain stack if we use it
    contract.actionStack.requireEqualsIf(useOnchainStack, onchainStack);

    // only require the onchain action state if we are recomputing the stack (otherwise, the onchain stack is known to be valid)
    contract.account.actionState.requireEqualsIf(
      useNewStack,
      onchainActionState
    );

    // step 1: continue the proof that pops pending onchain actions to build up the final stack

    let { isRecursive } = hints;
    proof.verifyIf(isRecursive);

    // if the proof is valid, it has to start from onchain action state
    Provable.assertEqualIf(
      isRecursive,
      Field,
      proof.publicInput,
      onchainActionState
    );

    // the final piece of the proof either starts from the onchain action state + an empty stack,
    // or from the previous proof output
    let initialState = { actions: onchainActionState, stack: emptyActionState };
    let startState = Provable.if(
      isRecursive,
      ActionStackState,
      proof.publicOutput,
      initialState
    );

    // finish creating the new stack
    let stackingResult = actionStackChunk(
      this.maxUpdatesFinalProof,
      startState,
      hints.witnesses
    );

    // step 2. pick the correct stack of actions to process

    // if we use the new stack, make sure it's correct: it has to go all the way back
    // from `onchainActionState` to `processedActionState`
    Provable.assertEqualIf(
      useNewStack,
      Field,
      stackingResult.actions,
      processedActionState
    );

    let stackToUse = Provable.if(
      useOnchainStack,
      onchainStack,
      stackingResult.stack
    );

    // our input hint gives us the actual actions contained in this stack
    let { stack } = hints;
    stack = stack.clone(); // defend against this code running twice
    stack.hash.assertEquals(stackToUse);

    // invariant: from this point on, the stack contains actual pending action lists in their correct (reversed) order

    // step 3. pop off the actions we want to process from the stack

    // we should take as many actions as possible, within the constraints that:
    // - we process entire lists (= account updates) at once
    // - we process at most `this.batchSize` actions
    // - we can't process more than the stack contains
    let nActionLists = Unconstrained.witness(() => {
      let lists = stack.toArrayUnconstrained().get();
      let n = 0;
      let totalSize = 0;
      for (let list of lists.reverse()) {
        totalSize += list.lengthUnconstrained().get();
        if (totalSize > batchSize) break;
        n++;
      }
      return n;
    });

    // linearize the stack into a flat list which contains exactly the actions we process
    let flatActions = FlatActions(actionType).empty();

    for (let i = 0; i < batchSize; i++) {
      // note: we allow the prover to pop off as many actions as they want (up to `batchSize`)
      // if they pop off less than possible, it doesn't violate our invariant that the stack contains pending actions in correct order
      let shouldPop = Provable.witness(Bool, () => i < nActionLists.get());
      let actionList = stack.popIfUnsafe(shouldPop);

      // if we didn't pop, must guarantee that the action list is empty
      actionList = Provable.if(
        shouldPop,
        stack.innerProvable,
        actionList,
        stack.innerProvable.empty()
      );

      // push all actions to the flat list
      actionList.forEach(this.maxActionsPerUpdate, (action, isDummy) => {
        flatActions.pushIf(isDummy.not(), action);
      });

      // if we pop, we also update the processed action state
      let nextActionState = Actions.updateSequenceState(
        processedActionState,
        actionList.hash
      );
      processedActionState = Provable.if(
        shouldPop,
        nextActionState,
        processedActionState
      );
    }

    // step 4. run user logic on the actions

    // note: only here we do the work of unhashing the actions
    // we also make it easier to write the reducer code by making sure dummy actions have dummy values
    flatActions.forEach(batchSize, (action, isDummy, i) => {
      let actionValue = Provable.if(
        isDummy,
        actionType,
        actionType.empty(),
        action.unhash()
      );
      callback(actionValue, isDummy, i);
    });

    // step 5. update the onchain processed action state and stack

    contract.actionState.set(processedActionState);
    contract.actionStack.set(stack.hash);
  }

  /**
   * Compile the recursive action batch prover.
   */
  async compile() {
    // TODO remove this.program
    // return await this.program.compile();
    return await this.stackProgram.compile();
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
   * Create a proof which returns the next actions batch(es) to process and helps guarantee their correctness.
   */
  async prepareBatches(): Promise<
    { proof: ActionStackProof; hints: ActionStackHints<Action> }[]
  > {
    let { batchSize, actionType } = this;
    let contract = assertDefined(
      this._contract,
      'Contract instance must be set before proving actions'
    );
    let fromActionState = assertDefined(
      await contract.actionState.fetch(),
      'Could not fetch action state'
    ).toBigInt();

    // TODO witnesses is just a dumbed down representation of `actions`, we could compute them from actions
    let { endActionState, witnesses, actions } = await fetchActionWitnesses(
      contract,
      fromActionState,
      this.actionType
    );

    // if there are no pending actions, there is no need to call the reducer
    if (witnesses.length === 0) return [];

    let { proof, isRecursive, finalWitnesses } = await provePartialActionStack(
      endActionState,
      witnesses,
      this.stackProgram,
      this.maxUpdatesFinalProof
    );

    // create the stack from full actions
    let stack = MerkleActions(actionType).fromReverse(
      actions.toArrayUnconstrained().get()
    );

    let batches: ActionStackHints<Action>[] = [];
    let baseHint = {
      isRecursive,
      onchainActionState: Field(endActionState),
      witnesses: finalWitnesses,
    };

    // for the remaining batches, trace the steps of the zkapp method
    // in updating processedActionState, stack, onchainStack
    let stackArray = stack.toArrayUnconstrained().get();
    let processedActionState = Field(fromActionState);
    let onchainStack = Field(0); // incorrect, but not used in the first batch
    let useOnchainStack = Bool(false);
    let i = stackArray.length - 1;

    // add batches as long as we haven't emptied the stack
    while (i >= 0) {
      batches.push({
        ...baseHint,
        useOnchainStack,
        processedActionState,
        onchainStack,
        stack: stack.clone(),
      });

      // pop off actions as long as we can fit them in a batch
      let currentBatchSize = 0;
      while (i >= 0) {
        currentBatchSize += stackArray[i].lengthUnconstrained().get();
        if (currentBatchSize > batchSize) break;
        let actionList = stack.pop();
        processedActionState = Actions.updateSequenceState(
          processedActionState,
          actionList.hash
        );
        i--;
      }
      onchainStack = stack.hash;
      useOnchainStack = Bool(true);
    }

    // sanity check: we should have put all actions in batches
    stack.isEmpty().assertTrue();

    return batches.map((hints) => ({ proof, hints }));
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
    batchSize = this.batchSize as number as N,
    contract = assertDefined(
      this._contract,
      'Contract instance must be set before fetching actions'
    )
  ): Promise<ActionBatch<Action, N>> {
    const ActionB = ActionBatch(this.actionType, batchSize);
    return Provable.witnessAsync(ActionB.provable, () =>
      fetchActionBatch(
        contract,
        fromActionState.toBigInt(),
        this.actionType,
        batchSize
      )
    );
  }
}

type BatchReducerContract = SmartContract & {
  reducer?: undefined;
  actionState: State<Field>;
  actionStack: State<Field>;
};
type BatchReducerContractClass = typeof SmartContract &
  Constructor<BatchReducerContract>;

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

// hints for the action stack reducer

/**
 * Inputs to a single call of `processBatch()`.
 *
 * `proveNextBatches()` will prepare as many of these as we need to catch up with the chain.
 */
type ActionStackHints<Action> = {
  /**
   * Whether to use the onchain stack or the new one we compute.
   */
  useOnchainStack: Bool;

  /**
   * Current onchain fields, kept track of externally for robustness.
   *
   * Note:
   * - If `useOnchainStack = true`, the `onchainActionState` doesn't have to be correct (we only need it to prove validity of a new stack).
   * - If `useOnchainStack = false`, the `onchainStack` doesn't have to be correct as we don't use it.
   */
  processedActionState: Field;
  onchainActionState: Field;
  onchainStack: Field;

  /**
   * The stack of actions to process.
   *
   * Note: this is either the current onchain stack or the new stack, + witnesses which contain the actual actions.
   */
  stack: MerkleActions<Action>;

  /**
   * Whether a recursive proof was needed to compute the stack, or not.
   */
  isRecursive: Bool;

  /**
   * Witnesses needed to finalize the stack computation.
   */
  witnesses: Unconstrained<ActionWitnesses>;
};

function ActionStackHints<A extends Actionable<any>>(actionType: A) {
  return Struct({
    useOnchainStack: Bool,
    processedActionState: Field,
    onchainActionState: Field,
    onchainStack: Field,
    stack: MerkleActions(actionType).provable,
    isRecursive: Bool,
    witnesses: Unconstrained.provableWithEmpty<ActionWitnesses>([]),
  });
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

async function fetchActionWitnesses<T>(
  contract: { address: PublicKey; tokenId: Field },
  fromActionState: bigint,
  actionType: Actionable<T>
) {
  let result = await fetchActions(
    contract.address,
    { fromActionState: Field(fromActionState) },
    contract.tokenId
  );
  if ('error' in result) throw Error(JSON.stringify(result));

  let actionFields = result.map(({ actions }) =>
    actions.map((action) => action.map(BigInt)).reverse()
  );
  let actions = MerkleActions.fromFields(
    actionType,
    actionFields,
    fromActionState
  );

  let actionState = fromActionState;
  let witnesses: ActionWitnesses = [];

  for (let actionsHash of actionFieldsToHashes(actionFields)) {
    witnesses.push({ hash: actionsHash, stateBefore: actionState });
    actionState = ActionsBigint.updateSequenceState(actionState, actionsHash);
  }
  return { endActionState: actionState, witnesses, actions };
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
    actions.reduce(pushAction, ActionsBigint.empty().hash)
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

type ActionBatchProof = Proof<Field, Field>;

type ActionBatchProgram = {
  name: string;
  publicInputType: typeof Field;
  publicOutputType: typeof Field;

  compile(): Promise<{ verificationKey: { data: string; hash: Field } }>;

  proveChunk(
    startState: Field,
    proofSoFar: ActionBatchProof,
    isRecursive: Bool,
    actionHashes: Unconstrained<ActionHashes>
  ): Promise<ActionBatchProof>;

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
          Provable.assertEqualIf(
            isRecursive,
            Field,
            startState,
            proofSoFar.publicInput
          );
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

// recursive action stacking proof

/**
 * Prove that a list of actions can be stacked in reverse order.
 *
 * Does not process reversing of all input actions - instead, we leave a final chunk of actions unprocessed.
 * The final chunk will be done in the smart contract which also verifies the proof.
 */
async function provePartialActionStack(
  endActionState: bigint,
  witnesses: ActionWitnesses,
  program: ActionStackProgram,
  finalChunkSize: number
) {
  let finalActionsChunk = witnesses.slice(0, finalChunkSize);
  let remainingActions = witnesses.slice(finalChunkSize);

  let { isEmpty, proof } = await proveActionStack(
    endActionState,
    remainingActions,
    program
  );

  return {
    proof,
    isRecursive: isEmpty.not(),
    finalWitnesses: Unconstrained.from(finalActionsChunk),
  };
}

async function proveActionStack(
  endActionState: bigint | Field,
  actions: ActionWitnesses,
  program: ActionStackProgram
): Promise<{
  isEmpty: Bool;
  proof: ActionStackProof;
}> {
  endActionState = Field(endActionState);
  let { maxUpdatesPerProof } = program;
  const ActionStackProof = ZkProgram.Proof(program);

  let n = actions.length;
  let isEmpty = Bool(n === 0);

  // compute the final stack up front: actions in reverse order
  let stack = MerkleActionHashes().empty();
  for (let action of [...actions].reverse()) {
    if (action === undefined) continue;
    stack.push(Field(action.hash));
  }

  // if proofs are disabled, return a dummy proof
  if (!getProofsEnabled()) {
    let startActionState = actions[0]?.stateBefore ?? endActionState;
    let proof = await ActionStackProof.dummy(
      endActionState,
      { actions: Field(startActionState), stack: stack.hash },
      1,
      14
    );
    return { isEmpty, proof };
  }

  // split actions in chunks of `maxUpdatesPerProof` each
  let chunks: Unconstrained<ActionWitnesses>[] = [];
  let nChunks = Math.ceil(n / maxUpdatesPerProof);

  for (let i = 0, k = 0; i < nChunks; i++) {
    let batch: ActionWitnesses = [];
    for (let j = 0; j < maxUpdatesPerProof; j++, k++) {
      batch[j] = actions[k];
    }
    chunks[i] = Unconstrained.from(batch);
  }

  // dummy proof; will be returned if there are no actions
  let proof = await ActionStackProof.dummy(
    Field(0),
    ActionStackState.empty(),
    1,
    14
  );

  for (let i = nChunks - 1; i >= 0; i--) {
    let isRecursive = Bool(i < nChunks - 1);
    proof = await program.proveChunk(
      endActionState,
      proof,
      isRecursive,
      chunks[i]
    );
  }
  // sanity check
  proof.publicOutput.stack.assertEquals(stack.hash, 'Stack hash mismatch');

  return { isEmpty, proof };
}

/**
 * Intermediate result of popping from a list of actions and stacking them in reverse order.
 */
class ActionStackState extends Struct({
  actions: Field,
  stack: Field,
}) {}

type ActionStackProof = Proof<Field, ActionStackState>;
type ActionWitnesses = ({ hash: bigint; stateBefore: bigint } | undefined)[];

class OptionActionWitness extends Option(
  Struct({ hash: Field, stateBefore: Field })
) {}

type ActionStackProgram = {
  name: string;
  publicInputType: typeof Field;
  publicOutputType: typeof ActionStackState;

  compile(): Promise<{ verificationKey: { data: string; hash: Field } }>;

  proveChunk(
    input: Field,
    proofSoFar: ActionStackProof,
    isRecursive: Bool,
    actionWitnesses: Unconstrained<ActionWitnesses>
  ): Promise<ActionStackProof>;

  maxUpdatesPerProof: number;
};

/**
 * Process a chunk of size `maxUpdatesPerProof` from the input actions,
 * stack them in reverse order.
 */
function actionStackChunk(
  maxUpdatesPerProof: number,
  startState: ActionStackState,
  witnesses: Unconstrained<ActionWitnesses>
): ActionStackState {
  // we pop off actions from the input merkle list (= input.actions + actionHashes),
  // and push them onto a new merkle list
  let stack = MerkleActionHashes(startState.stack).empty();
  let actions = startState.actions;

  for (let i = maxUpdatesPerProof - 1; i >= 0; i--) {
    let { didPop, state, hash } = pop(actions, i, witnesses);
    stack.pushIf(didPop, hash);
    actions = state;
  }

  return new ActionStackState({ actions, stack: stack.hash });
}

/**
 * Create program that pops actions from a hash list and pushes them to a new list in reverse order.
 */
function actionStackProgram(maxUpdatesPerProof: number) {
  let program = ZkProgram({
    name: 'action-stack-prover',

    // input: actions to pop from
    publicInput: Field,

    // output: actions after popping, and the new stack
    publicOutput: ActionStackState,

    methods: {
      proveChunk: {
        privateInputs: [
          SelfProof,
          Bool,
          Unconstrained.provableWithEmpty<ActionWitnesses>([]),
        ],

        async method(
          input: Field,
          proofSoFar: ActionStackProof,
          isRecursive: Bool,
          witnesses: Unconstrained<ActionWitnesses>
        ): Promise<ActionStackState> {
          // make this proof extend proofSoFar
          proofSoFar.verifyIf(isRecursive);
          Provable.assertEqualIf(
            isRecursive,
            Field,
            input,
            proofSoFar.publicInput
          );
          let initialState = { actions: input, stack: emptyActionState };
          let startState = Provable.if(
            isRecursive,
            ActionStackState,
            proofSoFar.publicOutput,
            initialState
          );

          return actionStackChunk(maxUpdatesPerProof, startState, witnesses);
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

/**
 * Proves: "Here are some actions that got me from the new state to the current state"
 *
 * Can also return a None option if there are no actions or the prover chooses to skip popping an action.
 */
function pop(
  state: Field,
  i: number,
  witnesses: Unconstrained<ActionWitnesses>
): { didPop: Bool; state: Field; hash: Field } {
  let { isSome, value: witness } = Provable.witness(
    OptionActionWitness,
    () => witnesses.get()[i]
  );
  let impliedState = Actions.updateSequenceState(
    witness.stateBefore,
    witness.hash
  );
  Provable.assertEqualIf(isSome, Field, impliedState, state);
  return {
    didPop: isSome,
    state: Provable.if(isSome, witness.stateBefore, state),
    hash: witness.hash,
  };
}
