"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinaProgram = exports.MinaProgramEnv = void 0;
const account_update_js_1 = require("../account-update.js");
const authorization_js_1 = require("../authorization.js");
const account_js_1 = require("../account.js");
const core_js_1 = require("../core.js");
const errors_js_1 = require("../errors.js");
const state_js_1 = require("../state.js");
const zkapp_logic_js_1 = require("../zkapp-logic.js");
const zkprogram_js_1 = require("../../../proof-system/zkprogram.js");
const bool_js_1 = require("../../../provable/bool.js");
const field_js_1 = require("../../../provable/field.js");
const int_js_1 = require("../../../provable/int.js");
const provable_js_1 = require("../../../provable/provable.js");
const signature_js_1 = require("../../../provable/crypto/signature.js");
const unconstrained_js_1 = require("../../../provable/types/unconstrained.js");
const verification_key_js_1 = require("../../../proof-system/verification-key.js");
const constants_js_1 = require("../../v1/constants.js");
class MinaProgramEnv {
    constructor(State, account, 
    // TODO: we can actually remove this since the verification key will always be set on an
    //       account before we call a method on it
    verificationKey) {
        this.State = State;
        this.account = account;
        this.verificationKey = verificationKey;
        this.expectedPreconditions = unconstrained_js_1.Unconstrained.from({
            state: state_js_1.StateMask.create(State),
        });
    }
    get accountId() {
        return provable_js_1.Provable.witness(account_js_1.AccountId, () => this.account.get().accountId);
    }
    get accountVerificationKeyHash() {
        return provable_js_1.Provable.witness(field_js_1.Field, () => this.account.get().zkapp.verificationKey.hash);
    }
    get programVerificationKey() {
        return provable_js_1.Provable.witness(verification_key_js_1.VerificationKey, () => this.verificationKey.get());
    }
    get balance() {
        return provable_js_1.Provable.witness(int_js_1.UInt64, () => {
            const balance = this.account.get().balance;
            this.expectedPreconditions.get().balance = balance;
            return balance;
        });
    }
    get nonce() {
        return provable_js_1.Provable.witness(int_js_1.UInt32, () => {
            const nonce = this.account.get().nonce;
            this.expectedPreconditions.get().nonce = nonce;
            return nonce;
        });
    }
    get receiptChainHash() {
        return provable_js_1.Provable.witness(field_js_1.Field, () => {
            const receiptChainHash = this.account.get().receiptChainHash;
            this.expectedPreconditions.get().receiptChainHash = receiptChainHash;
            return receiptChainHash;
        });
    }
    get delegate() {
        return provable_js_1.Provable.witness(signature_js_1.PublicKey, () => {
            const delegate = this.account.get().delegate ?? this.account.get().accountId.publicKey;
            this.expectedPreconditions.get().delegate = delegate;
            return delegate;
        });
    }
    get state() {
        const accountState = provable_js_1.Provable.witness((unconstrained_js_1.Unconstrained), () => {
            return unconstrained_js_1.Unconstrained.from(this.account.get().zkapp.state);
        });
        const accountStateMask = provable_js_1.Provable.witness((unconstrained_js_1.Unconstrained), () => {
            return unconstrained_js_1.Unconstrained.from(this.expectedPreconditions.get().state);
        });
        return state_js_1.StateReader.create(this.State, accountState, accountStateMask);
    }
    // only returns the most recent action state for an account
    get actionState() {
        return provable_js_1.Provable.witness(field_js_1.Field, () => {
            const actionState = this.account.get().zkapp.actionState[constants_js_1.ZkappConstants.ACCOUNT_ACTION_STATE_BUFFER_SIZE - 1];
            this.expectedPreconditions.get().actionState = actionState;
            return actionState;
        });
    }
    get isProven() {
        return provable_js_1.Provable.witness(bool_js_1.Bool, () => {
            const isProven = this.account.get().zkapp.isProven;
            this.expectedPreconditions.get().isProven = isProven;
            return isProven;
        });
    }
    static sizeInFields() {
        return 0;
    }
    static toFields(_x) {
        return [];
    }
    static toAuxiliary(x) {
        // if(x === undefined) throw new Error('invalid call to MinaProgram#toAuxiliary');
        // eww... how do I handle the undefined MinaProgramEnv situation?
        return [x?.account, x?.verificationKey];
    }
    static fromFields(_fields, aux) {
        return new MinaProgramEnv('GenericState', aux[0], aux[1]);
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static check(_x) {
        // TODO NOW
        //throw new Error('TODO');
    }
}
exports.MinaProgramEnv = MinaProgramEnv;
// TODO really need to fix the types here...
function zkProgramMethod(State, Event, Action, impl) {
    return {
        privateInputs: [MinaProgramEnv, ...impl.privateInputs],
        auxiliaryOutput: account_update_js_1.AccountUpdateTree,
        // async method(env: MinaProgramEnv<State>, ...inputs: ProvableTupleInstances<PrivateInputs>) {
        async method(...[env, ...inputs]) {
            const describedUpdate = await impl.method(env, ...inputs);
            let describedUpdate2;
            if (describedUpdate instanceof account_update_js_1.ContextFreeAccountUpdate) {
                // TODO: is it ok that we allow signature and proof as an option here, but don't let the description return such an authorization kind?
                if (!describedUpdate.authorizationKind.isProved.toBoolean()) {
                    throw new Error('TODO: error message');
                }
                describedUpdate2 = describedUpdate;
            }
            else {
                describedUpdate2 = {
                    ...describedUpdate,
                    authorizationKind: authorization_js_1.AccountUpdateAuthorizationKind.Proof(),
                };
            }
            const callData = /* TODO */ new field_js_1.Field(0);
            const updateTree = account_update_js_1.AccountUpdateTree.from({
                ...describedUpdate2,
                accountId: env.accountId,
                // TODO: take the verification key from the account state after the virtual update application
                verificationKeyHash: env.programVerificationKey.hash,
                callData,
            }, 
            // TODO: return the specialized version...
            (descr) => new account_update_js_1.AccountUpdate(State, Event, Action, descr));
            // const freeUpdate = ContextFreeAccountUpdate.from(State, Event, Action, describedUpdate2);
            // const update = new AccountUpdate(State, Event, Action, {
            //   accountId: env.accountId,
            //   verificationKeyHash: env.verificationKeyHash,
            //   callData,
            //   update: freeUpdate,
            // })
            if (provable_js_1.Provable.inProver()) {
                // env.checkAndApplyUpdateAsProver(update);
            }
            // TODO: return update as auxiliary output
            return {
                publicOutput: updateTree.rootAccountUpdate.commit('testnet' /* TODO */),
                auxiliaryOutput: account_update_js_1.AccountUpdateTree.mapRoot(updateTree, (accountUpdate) => accountUpdate.toGeneric()),
            };
        },
    };
}
function proverMethod(State, Event, Action, getVerificationKey, rawProver, _impl) {
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
    return async (ctx, accountId, ...inputs) => {
        const callSite = (0, errors_js_1.getCallerFrame)();
        const verificationKey = getVerificationKey();
        const genericAccount = ctx.ledger.getAccount(accountId) ?? account_js_1.Account.empty(accountId);
        // TODO: This conversion is safe only under the assumption that the account is new or the
        //       verification key matches the current program's verification key. Assert this is true,
        //       or throw an error.
        const account = account_js_1.Account.fromGeneric(genericAccount, State);
        const env = new MinaProgramEnv(account.State, unconstrained_js_1.Unconstrained.from(account), unconstrained_js_1.Unconstrained.from(verificationKey));
        const { proof, auxiliaryOutput: genericAccountUpdateTree } = await rawProver(env, ...inputs);
        genericAccountUpdateTree.rootAccountUpdate.proof = proof;
        // TODO: We currently throw an error here if there are any children, until we solve the
        //       problems around account update tracing and not adding duplicate child updates
        //       to the root (when calling this prover method).
        if (genericAccountUpdateTree.children.length !== 0)
            throw new Error('TODO: support nested account updates');
        // TODO HACK: Currently, the rawProver is only able to return the generic state representation,
        //            so we must convert it again for the return value.
        const accountUpdateTree = account_update_js_1.AccountUpdateTree.mapRoot(genericAccountUpdateTree, (accountUpdate) => account_update_js_1.AccountUpdate.fromGeneric(accountUpdate, State, Event, Action));
        // apply only the root update and not the children (see above for details)
        const applied = (0, zkapp_logic_js_1.checkAndApplyAccountUpdate)(ctx.chain, account, accountUpdateTree.rootAccountUpdate, ctx.feeExcessState);
        let errors;
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
function MinaProgram(descr) {
    const programMethods = (0, core_js_1.mapObject)(descr.methods, (key) => zkProgramMethod(descr.State, descr.Event, descr.Action, descr.methods[key]));
    const Program = (0, zkprogram_js_1.ZkProgram)({
        name: descr.name,
        publicInput: undefined,
        publicOutput: account_update_js_1.AccountUpdateCommitment,
        methods: programMethods /* TODO */,
    });
    // TODO: proper verification key caching
    let verificationKey = null;
    function getVerificationKey() {
        if (verificationKey === null) {
            throw new Error('You must compile a MinaProgram before calling any of methods on it.');
        }
        return verificationKey;
    }
    // TODO: this is wrong -- we need to check and interact with options, not just forward them.
    // A proper fix here is probably to refactor the compile interface for ZkProgram... this cache pattern is odd.
    async function compile(options) {
        const compiledProgram = await Program.compile(options);
        verificationKey = new verification_key_js_1.VerificationKey(compiledProgram.verificationKey);
        return compiledProgram;
    }
    const proverMethods = (0, core_js_1.mapObject)(descr.methods, (key) => proverMethod(descr.State, descr.Event, descr.Action, getVerificationKey, Program[key] /* TODO */, descr.methods[key]));
    return {
        name: descr.name,
        State: descr.State,
        Event: descr.Event,
        Action: descr.Action,
        compile,
        ...proverMethods,
    };
}
exports.MinaProgram = MinaProgram;
