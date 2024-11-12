import { SelfProof } from '../../proof-system/zkprogram.js';
import { Proof } from '../../proof-system/proof.js';
import { Bool, Field } from '../../provable/wrapped.js';
import { SmartContract } from '../zkapp.js';
import { assert, assertDefined } from '../../util/assert.js';
import { Constructor, From } from '../../../bindings/lib/provable-generic.js';
import { Struct, InferProvable } from '../../provable/types/struct.js';
import { Provable } from '../../provable/provable.js';
import { Actionable } from './offchain-state-serialization.js';
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
  HashedAction,
  MerkleActionHashes,
  MerkleActions,
  emptyActionState,
} from './action-types.js';
import {
  ProvableHashable,
  ProvablePure,
  ProvableType,
} from '../../provable/types/provable-intf.js';

// external API
export { BatchReducer, ActionBatch };

// internal API
export { actionStackProgram, proveActionStack };

/**
 * A reducer to process actions in fixed-size batches.
 *
 * ```ts
 * let batchReducer = new BatchReducer({ actionType: Action, batchSize: 5 });
 *
 * // in contract: concurrent dispatching of actions
 * batchReducer.dispatch(action);
 *
 * // reducer logic
 * // outside contract: prepare a list of { batch, proof } objects which cover all pending actions
 * let batches = await batchReducer.prepareBatches();
 *
 * // in contract: process a single batch
 * // create one transaction that does this for each batch!
 * batchReducer.processBatch({ batch, proof }, (action, isDummy) => {
 *   // ...
 * });
 * ```
 */
class BatchReducer<
  ActionType extends Actionable<any>,
  BatchSize extends number = number,
  Action = InferProvable<ActionType>
> {
  batchSize: BatchSize;
  actionType: ProvableHashable<Action> & ProvablePure<Action>;
  Batch: ReturnType<typeof ActionBatch>;

  program: ActionStackProgram;
  BatchProof: typeof Proof<Field, ActionStackState>;

  maxUpdatesFinalProof: number;
  maxActionsPerUpdate: number;

  constructor({
    actionType,
    batchSize,
    maxUpdatesPerProof = 300,
    maxUpdatesFinalProof = 100,
    maxActionsPerUpdate = Math.min(batchSize, 5),
  }: {
    /**
     * The provable type of actions submitted by this reducer.
     */
    actionType: ActionType;

    /**
     * The number of actions in a batch. The idea is to process one batch per transaction, by calling `processBatch()`.
     *
     * The motivation for processing actions in small batches is to work around the protocol limit on the number of account updates.
     * If every action should result in an account update, then you have to set the batch size low enough to not exceed the limit.
     *
     * If transaction limits are no concern, the `batchSize` could be set based on amount of logic you do per action.
     * A smaller batch size will make proofs faster, but you might need more individual transactions as more batches are needed to process all pending actions.
     */
    batchSize: BatchSize;

    /**
     * The maximum number of action lists (= all actions on an account update) to process in a single recursive proof, in `prepareBatches()`.
     *
     * Default: 300, which will take up about 9000 constraints.
     *
     * The current default should be sensible for most applications, but here are some trade-offs to consider when changing it:
     *
     * - Using a smaller number means a smaller circuit, so recursive proofs will be faster.
     * - Using a bigger number means you'll need fewer recursive proofs in the case a lot of actions are pending.
     *
     * So, go lower if you expect very few actions, and higher if you expect a lot of actions.
     * (Note: A larger circuit causes longer compilation and proof times for your zkApp even if you _never_ need a recursive proof)
     */
    maxUpdatesPerProof?: number;

    /**
     * The maximum number of action lists (= all actions on an account update) to process inside `processBatch()`,
     * i.e. in your zkApp method.
     *
     * Default: 100, which will take up about 3000 constraints.
     *
     * The current default should be sensible for most applications, but here are some trade-offs to consider when changing it:
     *
     * - Using a smaller number means a smaller circuit, so proofs of your method will be faster.
     * - Using a bigger number means it's more likely that you can prove _all_ actions in the method call and won't need a recursive proof.
     *
     * So, go lower if you expect very few actions, and higher if you expect a lot of actions.
     */
    maxUpdatesFinalProof?: number;

    /**
     * The maximum number of actions dispatched in any of the zkApp methods on the contract.
     *
     * Note: This number just has to be an upper bound of the actual maximum, but if it's the precise number,
     * fewer constraints will be used. (The overhead of a higher number is fairly small though.)
     *
     * A restriction is that the number has to be less or equal than the `batchSize`.
     * The reason is that actions in one account update are always processed together, so if you'd have more actions in one than the batch size, we couldn't process them at all.
     *
     * By default, this is set to `Math.min(batchSize, 5)` which should be sensible for most applications.
     */
    maxActionsPerUpdate?: number;
  }) {
    this.batchSize = batchSize;
    this.actionType = ProvableType.get(actionType) as ProvableHashable<Action> &
      ProvablePure<Action>;
    this.Batch = ActionBatch(this.actionType);

    this.maxUpdatesFinalProof = maxUpdatesFinalProof;
    this.program = actionStackProgram(maxUpdatesPerProof);
    this.BatchProof = ZkProgram.Proof(this.program);

    assert(
      maxActionsPerUpdate <= batchSize,
      'Invalid maxActionsPerUpdate, must be smaller than the batch size because we process entire updates at once.'
    );
    this.maxActionsPerUpdate = maxActionsPerUpdate;
  }

  static get initialActionState() {
    return emptyActionState;
  }
  static get initialActionStack() {
    return emptyActionState;
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
    let canonical = Provable.toCanonical(
      this.actionType,
      this.actionType.fromValue(action)
    );
    let fields = this.actionType.toFields(canonical);
    update.body.actions = Actions.pushEvent(update.body.actions, fields);
  }

  /**
   * Conditionally submit an action.
   */
  dispatchIf(condition: Bool, action: From<ActionType>) {
    let update = this.contract().self;
    let canonical = Provable.toCanonical(
      this.actionType,
      this.actionType.fromValue(action)
    );
    let fields = this.actionType.toFields(canonical);
    let newActions = Actions.pushEvent(update.body.actions, fields);
    update.body.actions = Provable.if(
      condition,
      Actions,
      newActions,
      update.body.actions
    );
  }

  /**
   * Process a batch of actions which was created by `prepareBatches()`.
   *
   * **Important**: The callback exposes the action's value along with an `isDummy` flag.
   * This is necessary because we process a dynamically-sized list in a fixed number of steps.
   * Dummies will be passed to your callback once the actual actions are exhausted.
   *
   * Make sure to write your code to account for dummies. For example, when sending MINA from your contract for every action,
   * you probably want to zero out the balance decrease in the `isDummy` case:
   * ```ts
   * processBatch({ batch, proof }, (action, isDummy) => {
   *   // ... other logic ...
   *
   *   let amountToSend = Provable.if(isDummy, UInt64.zero, action.amount);
   *   this.balance.subInPlace(amountToSend);
   * });
   * ```
   *
   * **Warning**: Don't call `processBatch()` on two _different_ batches within the same method. The second call
   * would override the preconditions set by the first call, which would leave the method insecure.
   * To process more actions per method call, increase the `batchSize`.
   */
  processBatch(
    {
      batch,
      proof,
    }: {
      batch: ActionBatch<Action>;
      proof: Proof<Field, ActionStackState>;
    },
    callback: (action: Action, isDummy: Bool, i: number) => void
  ): void {
    let { actionType, batchSize } = this;
    let contract = this.contract();

    // step 0. validate onchain states

    let {
      useOnchainStack,
      processedActionState,
      onchainActionState,
      onchainStack,
    } = batch;
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

    // step 1. continue the proof that pops pending onchain actions to build up the final stack

    let { isRecursive } = batch;
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
      batch.witnesses
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
    let { stack } = batch;
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

    const HashedActionT = HashedAction(actionType);
    const emptyHashedAction = HashedActionT.empty();

    flatActions.forEach(batchSize, (hashedAction, isDummy, i) => {
      // we make it easier to write the reducer code by making sure dummy actions have dummy values
      hashedAction = Provable.if(
        isDummy,
        HashedActionT,
        emptyHashedAction,
        hashedAction
      );

      // note: only here, we do the work of unhashing the action
      callback(hashedAction.unhash(), isDummy, i);
    });

    // step 5. update the onchain processed action state and stack

    contract.actionState.set(processedActionState);
    contract.actionStack.set(stack.hash);
  }

  /**
   * Compile the recursive action stack prover.
   */
  async compile() {
    return await this.program.compile();
  }

  /**
   * Create a proof which returns the next actions batch(es) to process and helps guarantee their correctness.
   */
  async prepareBatches(): Promise<
    { proof: ActionStackProof; batch: ActionBatch<Action> }[]
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
      this.program,
      this.maxUpdatesFinalProof
    );

    // create the stack from full actions
    let stack = MerkleActions(actionType).fromReverse(
      actions.toArrayUnconstrained().get()
    );

    let batches: ActionBatch<Action>[] = [];
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

    return batches.map((batch) => ({ proof, batch }));
  }
}

type BatchReducerContract = SmartContract & {
  reducer?: undefined;
  actionState: State<Field>;
  actionStack: State<Field>;
};
type BatchReducerContractClass = typeof SmartContract &
  Constructor<BatchReducerContract>;

// hints for the batch reducer

/**
 * Inputs to a single call of `processBatch()`.
 *
 * `proveBatches()` will prepare as many of these as we need to catch up with the chain.
 */
type ActionBatch<Action> = {
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

function ActionBatch<A extends Actionable<any>>(actionType: A) {
  return Struct({
    useOnchainStack: Bool,
    processedActionState: Field,
    onchainActionState: Field,
    onchainStack: Field,
    stack: MerkleActions(actionType),
    isRecursive: Bool,
    witnesses: Unconstrained.withEmpty<ActionWitnesses>([]),
  });
}

// helper for fetching actions

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

  let hashes = actionFields.map((actions) =>
    actions.reduce(pushAction, ActionsBigint.empty().hash)
  );
  for (let actionsHash of hashes) {
    witnesses.push({ hash: actionsHash, stateBefore: actionState });
    actionState = ActionsBigint.updateSequenceState(actionState, actionsHash);
  }
  return { endActionState: actionState, witnesses, actions };
}

function pushAction(actionsHash: bigint, action: bigint[]): bigint {
  return hashWithPrefixBigint(prefixes.sequenceEvents, [
    actionsHash,
    hashWithPrefixBigint(prefixes.event, action),
  ]);
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
    { actions: emptyActionState, stack: emptyActionState },
    1,
    14
  );

  for (let i = nChunks - 1; i >= 0; i--) {
    let isRecursive = Bool(i < nChunks - 1);
    ({ proof } = await program.proveChunk(
      endActionState,
      proof,
      isRecursive,
      chunks[i]
    ));
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
  ): Promise<{ proof: ActionStackProof }>;

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
          Unconstrained.withEmpty<ActionWitnesses>([]),
        ],

        async method(
          input: Field,
          proofSoFar: ActionStackProof,
          isRecursive: Bool,
          witnesses: Unconstrained<ActionWitnesses>
        ) {
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
          let publicOutput = actionStackChunk(
            maxUpdatesPerProof,
            startState,
            witnesses
          );
          return { publicOutput };
        },
      },
    },
  });
  return Object.assign(program, { maxUpdatesPerProof });
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
