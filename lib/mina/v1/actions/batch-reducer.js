"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proveActionStack = exports.actionStackProgram = exports.ActionBatch = exports.BatchReducer = void 0;
const zkprogram_js_1 = require("../../../proof-system/zkprogram.js");
const wrapped_js_1 = require("../../../provable/wrapped.js");
const assert_js_1 = require("../../../util/assert.js");
const struct_js_1 = require("../../../provable/types/struct.js");
const provable_js_1 = require("../../../provable/provable.js");
const constants_js_1 = require("../../../../bindings/crypto/constants.js");
const account_update_js_1 = require("../account-update.js");
const smart_contract_context_js_1 = require("../smart-contract-context.js");
const option_js_1 = require("../../../provable/option.js");
const mina_instance_js_1 = require("../mina-instance.js");
const zkprogram_js_2 = require("../../../proof-system/zkprogram.js");
const unconstrained_js_1 = require("../../../provable/types/unconstrained.js");
const poseidon_bigint_js_1 = require("../../../../mina-signer/src/poseidon-bigint.js");
const transaction_leaves_bigint_js_1 = require("../../../../bindings/mina-transaction/v1/transaction-leaves-bigint.js");
const action_types_js_1 = require("./action-types.js");
const provable_intf_js_1 = require("../../../provable/types/provable-intf.js");
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
class BatchReducer {
    constructor({ actionType, batchSize, maxUpdatesPerProof = 300, maxUpdatesFinalProof = 100, maxActionsPerUpdate = Math.min(batchSize, 5), }) {
        this.batchSize = batchSize;
        this.actionType = provable_intf_js_1.ProvableType.get(actionType);
        this.Batch = ActionBatch(this.actionType);
        this.maxUpdatesFinalProof = maxUpdatesFinalProof;
        this.program = actionStackProgram(maxUpdatesPerProof);
        this.BatchProof = zkprogram_js_2.ZkProgram.Proof(this.program);
        (0, assert_js_1.assert)(maxActionsPerUpdate <= batchSize, 'Invalid maxActionsPerUpdate, must be smaller than the batch size because we process entire updates at once.');
        this.maxActionsPerUpdate = maxActionsPerUpdate;
    }
    static get initialActionState() {
        return action_types_js_1.emptyActionState;
    }
    static get initialActionStack() {
        return action_types_js_1.emptyActionState;
    }
    contractClass() {
        return (0, assert_js_1.assertDefined)(this._contractClass, 'Contract instance or class must be set before calling this method');
    }
    contract() {
        let Contract = this.contractClass();
        return (0, smart_contract_context_js_1.contract)(Contract);
    }
    /**
     * Set the smart contract instance this reducer is connected with.
     *
     * Note: This is a required step before using `dispatch()`, `proveNextBatch()` or `processNextBatch()`.
     */
    setContractInstance(contract) {
        this._contract = contract;
        this._contractClass = contract.constructor;
    }
    /**
     * Set the smart contract class this reducer is connected with.
     *
     * Note: You can use either this method or `setContractInstance()` before calling `compile()`.
     * However, `setContractInstance()` is required for `proveNextBatch()`.
     */
    setContractClass(contractClass) {
        this._contractClass = contractClass;
    }
    /**
     * Submit an action.
     */
    dispatch(action) {
        let update = this.contract().self;
        let canonical = provable_js_1.Provable.toCanonical(this.actionType, this.actionType.fromValue(action));
        let fields = this.actionType.toFields(canonical);
        update.body.actions = account_update_js_1.Actions.pushEvent(update.body.actions, fields);
    }
    /**
     * Conditionally submit an action.
     */
    dispatchIf(condition, action) {
        let update = this.contract().self;
        let canonical = provable_js_1.Provable.toCanonical(this.actionType, this.actionType.fromValue(action));
        let fields = this.actionType.toFields(canonical);
        let newActions = account_update_js_1.Actions.pushEvent(update.body.actions, fields);
        update.body.actions = provable_js_1.Provable.if(condition, account_update_js_1.Actions, newActions, update.body.actions);
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
    processBatch({ batch, proof, }, callback) {
        let { actionType, batchSize } = this;
        let contract = this.contract();
        // step 0. validate onchain states
        let { useOnchainStack, processedActionState, onchainActionState, onchainStack } = batch;
        let useNewStack = useOnchainStack.not();
        // we definitely need to know the processed action state, because we will update it
        contract.actionState.requireEquals(processedActionState);
        // only require the onchain stack if we use it
        contract.actionStack.requireEqualsIf(useOnchainStack, onchainStack);
        // only require the onchain action state if we are recomputing the stack (otherwise, the onchain stack is known to be valid)
        contract.account.actionState.requireEqualsIf(useNewStack, onchainActionState);
        // step 1. continue the proof that pops pending onchain actions to build up the final stack
        let { isRecursive } = batch;
        proof.verifyIf(isRecursive);
        // if the proof is valid, it has to start from onchain action state
        provable_js_1.Provable.assertEqualIf(isRecursive, wrapped_js_1.Field, proof.publicInput, onchainActionState);
        // the final piece of the proof either starts from the onchain action state + an empty stack,
        // or from the previous proof output
        let initialState = { actions: onchainActionState, stack: action_types_js_1.emptyActionState };
        let startState = provable_js_1.Provable.if(isRecursive, ActionStackState, proof.publicOutput, initialState);
        // finish creating the new stack
        let stackingResult = actionStackChunk(this.maxUpdatesFinalProof, startState, batch.witnesses);
        // step 2. pick the correct stack of actions to process
        // if we use the new stack, make sure it's correct: it has to go all the way back
        // from `onchainActionState` to `processedActionState`
        provable_js_1.Provable.assertEqualIf(useNewStack, wrapped_js_1.Field, stackingResult.actions, processedActionState);
        let stackToUse = provable_js_1.Provable.if(useOnchainStack, onchainStack, stackingResult.stack);
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
        let nActionLists = unconstrained_js_1.Unconstrained.witness(() => {
            let lists = stack.toArrayUnconstrained().get();
            let n = 0;
            let totalSize = 0;
            for (let list of lists.reverse()) {
                totalSize += list.lengthUnconstrained().get();
                if (totalSize > batchSize)
                    break;
                n++;
            }
            return n;
        });
        // linearize the stack into a flat list which contains exactly the actions we process
        let flatActions = (0, action_types_js_1.FlatActions)(actionType).empty();
        for (let i = 0; i < batchSize; i++) {
            // note: we allow the prover to pop off as many actions as they want (up to `batchSize`)
            // if they pop off less than possible, it doesn't violate our invariant that the stack contains pending actions in correct order
            let shouldPop = provable_js_1.Provable.witness(wrapped_js_1.Bool, () => i < nActionLists.get());
            let actionList = stack.popIfUnsafe(shouldPop);
            // if we didn't pop, must guarantee that the action list is empty
            actionList = provable_js_1.Provable.if(shouldPop, stack.innerProvable, actionList, stack.innerProvable.empty());
            // push all actions to the flat list
            actionList.forEach(this.maxActionsPerUpdate, (action, isDummy) => {
                flatActions.pushIf(isDummy.not(), action);
            });
            // if we pop, we also update the processed action state
            let nextActionState = account_update_js_1.Actions.updateSequenceState(processedActionState, actionList.hash);
            processedActionState = provable_js_1.Provable.if(shouldPop, nextActionState, processedActionState);
        }
        // step 4. run user logic on the actions
        const HashedActionT = (0, action_types_js_1.HashedAction)(actionType);
        const emptyHashedAction = HashedActionT.empty();
        flatActions.forEach(batchSize, (hashedAction, isDummy, i) => {
            // we make it easier to write the reducer code by making sure dummy actions have dummy values
            hashedAction = provable_js_1.Provable.if(isDummy, HashedActionT, emptyHashedAction, hashedAction);
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
    async prepareBatches() {
        let { batchSize, actionType } = this;
        let contract = (0, assert_js_1.assertDefined)(this._contract, 'Contract instance must be set before proving actions');
        let fromActionState = (0, assert_js_1.assertDefined)(await contract.actionState.fetch(), 'Could not fetch action state').toBigInt();
        // TODO witnesses is just a dumbed down representation of `actions`, we could compute them from actions
        let { endActionState, witnesses, actions } = await fetchActionWitnesses(contract, fromActionState, this.actionType);
        // if there are no pending actions, there is no need to call the reducer
        if (witnesses.length === 0)
            return [];
        let { proof, isRecursive, finalWitnesses } = await provePartialActionStack(endActionState, witnesses, this.program, this.maxUpdatesFinalProof);
        // create the stack from full actions
        let stack = (0, action_types_js_1.MerkleActions)(actionType).fromReverse(actions.toArrayUnconstrained().get());
        let batches = [];
        let baseHint = {
            isRecursive,
            onchainActionState: (0, wrapped_js_1.Field)(endActionState),
            witnesses: finalWitnesses,
        };
        // for the remaining batches, trace the steps of the zkapp method
        // in updating processedActionState, stack, onchainStack
        let stackArray = stack.toArrayUnconstrained().get();
        let processedActionState = (0, wrapped_js_1.Field)(fromActionState);
        let onchainStack = (0, wrapped_js_1.Field)(0); // incorrect, but not used in the first batch
        let useOnchainStack = (0, wrapped_js_1.Bool)(false);
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
                if (currentBatchSize > batchSize)
                    break;
                let actionList = stack.pop();
                processedActionState = account_update_js_1.Actions.updateSequenceState(processedActionState, actionList.hash);
                i--;
            }
            onchainStack = stack.hash;
            useOnchainStack = (0, wrapped_js_1.Bool)(true);
        }
        // sanity check: we should have put all actions in batches
        stack.isEmpty().assertTrue();
        return batches.map((batch) => ({ proof, batch }));
    }
}
exports.BatchReducer = BatchReducer;
function ActionBatch(actionType) {
    return (0, struct_js_1.Struct)({
        useOnchainStack: wrapped_js_1.Bool,
        processedActionState: wrapped_js_1.Field,
        onchainActionState: wrapped_js_1.Field,
        onchainStack: wrapped_js_1.Field,
        stack: (0, action_types_js_1.MerkleActions)(actionType),
        isRecursive: wrapped_js_1.Bool,
        witnesses: unconstrained_js_1.Unconstrained.withEmpty([]),
    });
}
exports.ActionBatch = ActionBatch;
// helper for fetching actions
async function fetchActionWitnesses(contract, fromActionState, actionType) {
    let result = await (0, mina_instance_js_1.fetchActions)(contract.address, { fromActionState: (0, wrapped_js_1.Field)(fromActionState) }, contract.tokenId);
    if ('error' in result)
        throw Error(JSON.stringify(result));
    let actionFields = result.map(({ actions }) => actions.map((action) => action.map(BigInt)).reverse());
    let actions = action_types_js_1.MerkleActions.fromFields(actionType, actionFields, fromActionState);
    let actionState = fromActionState;
    let witnesses = [];
    let hashes = actionFields.map((actions) => actions.reduce(pushAction, transaction_leaves_bigint_js_1.Actions.empty().hash));
    for (let actionsHash of hashes) {
        witnesses.push({ hash: actionsHash, stateBefore: actionState });
        actionState = transaction_leaves_bigint_js_1.Actions.updateSequenceState(actionState, actionsHash);
    }
    return { endActionState: actionState, witnesses, actions };
}
function pushAction(actionsHash, action) {
    return (0, poseidon_bigint_js_1.hashWithPrefix)(constants_js_1.prefixes.sequenceEvents, [
        actionsHash,
        (0, poseidon_bigint_js_1.hashWithPrefix)(constants_js_1.prefixes.event, action),
    ]);
}
// recursive action stacking proof
/**
 * Prove that a list of actions can be stacked in reverse order.
 *
 * Does not process reversing of all input actions - instead, we leave a final chunk of actions unprocessed.
 * The final chunk will be done in the smart contract which also verifies the proof.
 */
async function provePartialActionStack(endActionState, witnesses, program, finalChunkSize) {
    let finalActionsChunk = witnesses.slice(0, finalChunkSize);
    let remainingActions = witnesses.slice(finalChunkSize);
    let { isEmpty, proof } = await proveActionStack(endActionState, remainingActions, program);
    return {
        proof,
        isRecursive: isEmpty.not(),
        finalWitnesses: unconstrained_js_1.Unconstrained.from(finalActionsChunk),
    };
}
async function proveActionStack(endActionState, actions, program) {
    endActionState = (0, wrapped_js_1.Field)(endActionState);
    let { maxUpdatesPerProof } = program;
    const ActionStackProof = zkprogram_js_2.ZkProgram.Proof(program);
    let n = actions.length;
    let isEmpty = (0, wrapped_js_1.Bool)(n === 0);
    // compute the final stack up front: actions in reverse order
    let stack = (0, action_types_js_1.MerkleActionHashes)().empty();
    for (let action of [...actions].reverse()) {
        if (action === undefined)
            continue;
        stack.push((0, wrapped_js_1.Field)(action.hash));
    }
    // if proofs are disabled, return a dummy proof
    if (!(0, mina_instance_js_1.getProofsEnabled)()) {
        let startActionState = actions[0]?.stateBefore ?? endActionState;
        let proof = await ActionStackProof.dummy(endActionState, { actions: (0, wrapped_js_1.Field)(startActionState), stack: stack.hash }, 1, 14);
        return { isEmpty, proof };
    }
    // split actions in chunks of `maxUpdatesPerProof` each
    let chunks = [];
    let nChunks = Math.ceil(n / maxUpdatesPerProof);
    for (let i = 0, k = 0; i < nChunks; i++) {
        let batch = [];
        for (let j = 0; j < maxUpdatesPerProof; j++, k++) {
            batch[j] = actions[k];
        }
        chunks[i] = unconstrained_js_1.Unconstrained.from(batch);
    }
    // dummy proof; will be returned if there are no actions
    let proof = await ActionStackProof.dummy((0, wrapped_js_1.Field)(0), { actions: action_types_js_1.emptyActionState, stack: action_types_js_1.emptyActionState }, 1, 14);
    for (let i = nChunks - 1; i >= 0; i--) {
        let isRecursive = (0, wrapped_js_1.Bool)(i < nChunks - 1);
        ({ proof } = await program.proveChunk(endActionState, proof, isRecursive, chunks[i]));
    }
    // sanity check
    proof.publicOutput.stack.assertEquals(stack.hash, 'Stack hash mismatch');
    return { isEmpty, proof };
}
exports.proveActionStack = proveActionStack;
/**
 * Intermediate result of popping from a list of actions and stacking them in reverse order.
 */
class ActionStackState extends (0, struct_js_1.Struct)({
    actions: wrapped_js_1.Field,
    stack: wrapped_js_1.Field,
}) {
}
class OptionActionWitness extends (0, option_js_1.Option)((0, struct_js_1.Struct)({ hash: wrapped_js_1.Field, stateBefore: wrapped_js_1.Field })) {
}
/**
 * Process a chunk of size `maxUpdatesPerProof` from the input actions,
 * stack them in reverse order.
 */
function actionStackChunk(maxUpdatesPerProof, startState, witnesses) {
    // we pop off actions from the input merkle list (= input.actions + actionHashes),
    // and push them onto a new merkle list
    let stack = (0, action_types_js_1.MerkleActionHashes)(startState.stack).empty();
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
function actionStackProgram(maxUpdatesPerProof) {
    let program = (0, zkprogram_js_2.ZkProgram)({
        name: 'action-stack-prover',
        // input: actions to pop from
        publicInput: wrapped_js_1.Field,
        // output: actions after popping, and the new stack
        publicOutput: ActionStackState,
        methods: {
            proveChunk: {
                privateInputs: [zkprogram_js_1.SelfProof, wrapped_js_1.Bool, unconstrained_js_1.Unconstrained.withEmpty([])],
                async method(input, proofSoFar, isRecursive, witnesses) {
                    // make this proof extend proofSoFar
                    proofSoFar.verifyIf(isRecursive);
                    provable_js_1.Provable.assertEqualIf(isRecursive, wrapped_js_1.Field, input, proofSoFar.publicInput);
                    let initialState = { actions: input, stack: action_types_js_1.emptyActionState };
                    let startState = provable_js_1.Provable.if(isRecursive, ActionStackState, proofSoFar.publicOutput, initialState);
                    let publicOutput = actionStackChunk(maxUpdatesPerProof, startState, witnesses);
                    return { publicOutput };
                },
            },
        },
    });
    return Object.assign(program, { maxUpdatesPerProof });
}
exports.actionStackProgram = actionStackProgram;
/**
 * Proves: "Here are some actions that got me from the new state to the current state"
 *
 * Can also return a None option if there are no actions or the prover chooses to skip popping an action.
 */
function pop(state, i, witnesses) {
    let { isSome, value: witness } = provable_js_1.Provable.witness(OptionActionWitness, () => witnesses.get()[i]);
    let impliedState = account_update_js_1.Actions.updateSequenceState(witness.stateBefore, witness.hash);
    provable_js_1.Provable.assertEqualIf(isSome, wrapped_js_1.Field, impliedState, state);
    return {
        didPop: isSome,
        state: provable_js_1.Provable.if(isSome, witness.stateBefore, state),
        hash: witness.hash,
    };
}
