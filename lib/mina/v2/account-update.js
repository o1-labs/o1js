"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionsHashConfig = exports.EventsHashConfig = exports.CommittedList = exports.AccountUpdateCommitment = exports.ContextFreeAccountUpdate = exports.AccountUpdateTree = exports.GenericData = exports.Authorized = exports.AccountUpdate = void 0;
const account_js_1 = require("./account.js");
const authorization_js_1 = require("./authorization.js");
const core_js_1 = require("./core.js");
const permissions_js_1 = require("./permissions.js");
const preconditions_js_1 = require("./preconditions.js");
const state_js_1 = require("./state.js");
const bindings_js_1 = require("../../../bindings.js");
const bool_js_1 = require("../../provable/bool.js");
const field_js_1 = require("../../provable/field.js");
const int_js_1 = require("../../provable/int.js");
const zkprogram_js_1 = require("../../proof-system/zkprogram.js");
const poseidon_js_1 = require("../../provable/crypto/poseidon.js");
const signature_js_1 = require("../../provable/crypto/signature.js");
const constants_js_1 = require("../../../bindings/crypto/constants.js");
const Bindings = require("../../../bindings/mina-transaction/v2/index.js");
const PoseidonBigint = require("../../../mina-signer/src/poseidon-bigint.js");
const signature_js_2 = require("../../../mina-signer/src/signature.js");
const struct_js_1 = require("../../provable/types/struct.js");
const verification_key_js_1 = require("../../../lib/proof-system/verification-key.js");
class AccountUpdateCommitment extends (0, struct_js_1.Struct)({
    accountUpdateCommitment: field_js_1.Field,
}) {
    constructor(accountUpdateCommitment) {
        super({ accountUpdateCommitment });
    }
}
exports.AccountUpdateCommitment = AccountUpdateCommitment;
// TODO: move elsewhere
const GenericData = {
    toFields(x) {
        return x;
    },
    toAuxiliary(x) {
        return [x.length];
    },
    fromFieldsDynamic(fields, aux) {
        const [_len] = aux;
        let len = _len ?? fields.length;
        return { value: fields.slice(0, len), fieldsConsumed: len };
    },
};
exports.GenericData = GenericData;
function EventsHashConfig(T) {
    return {
        emptyPrefix: 'MinaZkappEventsEmpty',
        consPrefix: constants_js_1.prefixes.events,
        hash(x) {
            const fields = T.toFields(x);
            return (0, poseidon_js_1.hashWithPrefix)(constants_js_1.prefixes.event, fields);
        },
    };
}
exports.EventsHashConfig = EventsHashConfig;
function ActionsHashConfig(T) {
    return {
        emptyPrefix: 'MinaZkappActionsEmpty',
        consPrefix: constants_js_1.prefixes.sequenceEvents,
        hash(x) {
            const fields = T.toFields(x);
            return (0, poseidon_js_1.hashWithPrefix)(constants_js_1.prefixes.event, fields);
        },
    };
}
exports.ActionsHashConfig = ActionsHashConfig;
// TODO: move elsewhere
class CommittedList {
    constructor({ Item, data, hash }) {
        this.Item = Item;
        this.data = data;
        this.hash = hash;
    }
    toInternalRepr() {
        return {
            data: this.data.map(this.Item.toFields),
            hash: this.hash,
        };
    }
    // IMPORTANT: It is the callers responsibility to ensure the commitment will compute the same
    //            after mapping the list (this function does not check this for you at runtime).
    mapUnsafe(NewItem, f) {
        return new CommittedList({
            Item: NewItem,
            data: this.data.map(f),
            hash: this.hash,
        });
    }
    static hashList(config, items) {
        let hash = (0, poseidon_js_1.emptyHashWithPrefix)(config.emptyPrefix);
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            hash = (0, poseidon_js_1.hashWithPrefix)(config.consPrefix, [hash, config.hash(item)]);
        }
        return hash;
    }
    static from(Item, config, value) {
        if (value instanceof CommittedList)
            return value;
        let items;
        //let hash;
        if (value === undefined) {
            items = [];
        }
        else if (value instanceof Array) {
            items = value;
        }
        else {
            // TODO: think about this a bit more... we don't have the aux data here, so we should do
            // something to restrict the types
            if ('fromFields' in Item) {
                items = value.data.map((fields) => Item.fromFields(fields, []));
            }
            else {
                items = value.data.map((fields) => {
                    const { value: result, fieldsConsumed } = Item.fromFieldsDynamic(fields, []);
                    if (fieldsConsumed !== fields.length)
                        throw new Error('expected all fields to be consumed when casting dynamic item');
                    return result;
                });
            }
            //hash = value.hash;
        }
        //hash = hash ?? CommittedList.hashList(config, items);
        return new CommittedList({
            Item,
            data: items,
            hash: CommittedList.hashList(config, items),
        });
    }
}
exports.CommittedList = CommittedList;
// TODO: CONSIDER -- merge this logic into AccountUpdate
//  class AccountUpdateTree<AccountUpdateType> {
class AccountUpdateTree {
    constructor(rootAccountUpdate, children) {
        this.rootAccountUpdate = rootAccountUpdate;
        this.children = children;
    }
    // depth first traversal (parents before children)
    static forEachNode(tree, depth, f) {
        f(tree.rootAccountUpdate, depth);
        tree.children.forEach((child) => AccountUpdateTree.forEachNode(child, depth + 1, f));
    }
    // inverted depth first traversal (children before parents)
    static forEachNodeInverted(tree, depth, f) {
        tree.children.forEach((child) => AccountUpdateTree.forEachNodeInverted(child, depth + 1, f));
        f(tree.rootAccountUpdate, depth);
    }
    static reduce(tree, f) {
        const childValues = tree.children.map((child) => AccountUpdateTree.reduce(child, f));
        return f(tree.rootAccountUpdate, childValues);
    }
    // TODO: delete (realized I didn't need it part way through writing)
    // // build context as we descend the tree, map, then reduce as we ascend
    // static mapReduceWithContext<T, Ctx, R>(
    //   tree: AccountUpdateTree<T>,
    //   context: Ctx,
    //   mapContext: (ctx: Ctx, index: number) => Ctx,
    //   map: (ctx: Ctx, accountUpdate: T) => R,
    //   reduce: (values: R[]) => R
    // ): R {
    //   if(tree.children.length === 0) {
    //     return map(context, tree.rootAccountUpdate);
    //   } else {
    //     const reducedValues = tree.children.map((child, index) =>
    //       AccountUpdateTree.mapReduceWithContext(
    //         child,
    //         mapContext(context, index),
    //         mapContext,
    //         map,
    //         reduce
    //       );
    //     );
    //     return reduce(reducedValues);
    //   }
    // }
    // TODO: refactor the type parameter interfaces
    static mapRoot(tree, f) {
        const newAccountUpdate = f(tree.rootAccountUpdate);
        return new AccountUpdateTree(newAccountUpdate, tree.children);
    }
    static async map(tree, f) {
        const newAccountUpdate = await f(tree.rootAccountUpdate);
        const newChildren = await AccountUpdateTree.mapForest(tree.children, f);
        return new AccountUpdateTree(newAccountUpdate, newChildren);
    }
    static mapForest(forest, f) {
        return Promise.all(forest.map((tree) => AccountUpdateTree.map(tree, f)));
    }
    // TODO: I think this can be safely made polymorphic over the account update state, actions, and events representations
    // TODO: Field, not bigint
    static hash(tree, networkId) {
        // TODO: is it ok to do this and ignore the toValue encodings entirely?
        const accountUpdateFieldInput = tree.rootAccountUpdate.toInput();
        const accountUpdateBigintInput = {
            fields: accountUpdateFieldInput.fields?.map((f) => f.toBigInt()),
            packed: accountUpdateFieldInput.packed?.map(([f, n]) => [
                f.toBigInt(),
                n,
            ]),
        };
        // TODO: negotiate between this implementation and AccountUpdate#hash to figure out what is correct
        // TODO NOW: ^ this was done, but we need to update this function to share code still
        const accountUpdateCommitment = PoseidonBigint.hashWithPrefix((0, signature_js_2.zkAppBodyPrefix)(networkId), PoseidonBigint.packToFields(accountUpdateBigintInput));
        const childrenCommitment = AccountUpdateTree.hashForest(networkId, tree.children);
        return PoseidonBigint.hashWithPrefix(constants_js_1.prefixes.accountUpdateNode, [
            accountUpdateCommitment,
            childrenCommitment,
        ]);
    }
    // TODO: Field, not bigint
    static hashForest(networkId, forest) {
        const consHash = (acc, tree) => PoseidonBigint.hashWithPrefix(constants_js_1.prefixes.accountUpdateCons, [
            AccountUpdateTree.hash(tree, networkId),
            acc,
        ]);
        return [...forest].reverse().reduce(consHash, 0n);
    }
    static unrollForest(forest, f) {
        const seq = [];
        forest.forEach((tree) => AccountUpdateTree.forEachNode(tree, 0, (accountUpdate, depth) => seq.push(f(accountUpdate, depth))));
        return seq;
    }
    static sizeInFields() {
        return AccountUpdate.sizeInFields();
    }
    static toFields(x) {
        return AccountUpdate.toFields(x.rootAccountUpdate);
    }
    static toAuxiliary(x) {
        return [AccountUpdate.toAuxiliary(x?.rootAccountUpdate), x?.children ?? []];
    }
    static fromFields(fields, aux) {
        return new AccountUpdateTree(AccountUpdate.fromFields(fields, aux[0]), aux[1]);
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static check(_x) {
        // TODO
    }
    static from(descr, createAccountUpdate) {
        return new AccountUpdateTree(createAccountUpdate(descr), descr.children ?? []);
    }
}
exports.AccountUpdateTree = AccountUpdateTree;
// in a ZkModule context: ContextFreeAccountUpdate is an AccountUpdate without an account id and call data
class ContextFreeAccountUpdate {
    constructor(State, Event, Action, descr) {
        function castUpdate(value, defaultValue, f) {
            if (value instanceof core_js_1.Update) {
                return value;
            }
            else {
                return core_js_1.Update.from((0, core_js_1.mapUndefined)(value, f), defaultValue);
            }
        }
        this.State = State;
        this.authorizationKind = authorization_js_1.AccountUpdateAuthorizationKind.from(descr.authorizationKind);
        this.preconditions =
            (0, core_js_1.mapUndefined)(descr.preconditions, (x) => preconditions_js_1.Preconditions.from(State, x)) ??
                preconditions_js_1.Preconditions.emptyPoly(State);
        this.balanceChange = descr.balanceChange ?? int_js_1.Int64.create(int_js_1.UInt64.zero);
        this.incrementNonce = descr.incrementNonce ?? new bool_js_1.Bool(false);
        this.useFullCommitment = descr.useFullCommitment ?? new bool_js_1.Bool(false);
        this.implicitAccountCreationFee = descr.implicitAccountCreationFee ?? new bool_js_1.Bool(false);
        this.mayUseToken = descr.mayUseToken ?? {
            parentsOwnToken: new bool_js_1.Bool(false),
            inheritFromParent: new bool_js_1.Bool(false),
        };
        this.pushEvents = CommittedList.from(Event, EventsHashConfig(Event), descr.pushEvents);
        this.pushActions = CommittedList.from(Action, ActionsHashConfig(Action), descr.pushActions);
        if (descr instanceof ContextFreeAccountUpdate) {
            this.stateUpdates = descr.stateUpdates;
            this.permissionsUpdate = descr.permissionsUpdate;
            this.delegateUpdate = descr.delegateUpdate;
            this.verificationKeyUpdate = descr.verificationKeyUpdate;
            this.zkappUriUpdate = descr.zkappUriUpdate;
            this.tokenSymbolUpdate = descr.tokenSymbolUpdate;
            this.timingUpdate = descr.timingUpdate;
            this.votingForUpdate = descr.votingForUpdate;
        }
        else {
            this.stateUpdates = descr.setState ?? state_js_1.StateUpdates.empty(State);
            this.permissionsUpdate = castUpdate(descr.setPermissions, permissions_js_1.Permissions.empty(), permissions_js_1.Permissions.from);
            this.delegateUpdate = core_js_1.Update.from(descr.setDelegate, signature_js_1.PublicKey.empty());
            this.verificationKeyUpdate = core_js_1.Update.from(descr.setVerificationKey, verification_key_js_1.VerificationKey.empty());
            this.zkappUriUpdate = castUpdate(descr.setZkappUri, core_js_1.ZkappUri.empty(), core_js_1.ZkappUri.from);
            this.tokenSymbolUpdate = castUpdate(descr.setTokenSymbol, poseidon_js_1.TokenSymbol.empty(), poseidon_js_1.TokenSymbol.from);
            this.timingUpdate = core_js_1.Update.from(descr.setTiming, account_js_1.AccountTiming.empty());
            this.votingForUpdate = core_js_1.Update.from(descr.setVotingFor, field_js_1.Field.empty());
        }
    }
    toGeneric() {
        return ContextFreeAccountUpdate.generic({
            authorizationKind: this.authorizationKind,
            preconditions: this.preconditions.toGeneric(),
            balanceChange: this.balanceChange,
            incrementNonce: this.incrementNonce,
            useFullCommitment: this.useFullCommitment,
            implicitAccountCreationFee: this.implicitAccountCreationFee,
            mayUseToken: this.mayUseToken,
            pushEvents: this.pushEvents.mapUnsafe(GenericData, this.pushEvents.Item.toFields),
            pushActions: this.pushActions.mapUnsafe(GenericData, this.pushActions.Item.toFields),
            setState: state_js_1.StateUpdates.toGeneric(this.State, this.stateUpdates),
            setPermissions: this.permissionsUpdate,
            setDelegate: this.delegateUpdate,
            setVerificationKey: this.verificationKeyUpdate,
            setZkappUri: this.zkappUriUpdate,
            setTokenSymbol: this.tokenSymbolUpdate,
            setTiming: this.timingUpdate,
            setVotingFor: this.votingForUpdate,
        });
    }
    static fromGeneric(x, State, Event, Action) {
        // TODO: this method is broken because we aren't storing aux data in the generic format...
        return new ContextFreeAccountUpdate(State, Event, Action, {
            authorizationKind: x.authorizationKind,
            preconditions: preconditions_js_1.Preconditions.fromGeneric(x.preconditions, State),
            balanceChange: x.balanceChange,
            incrementNonce: x.incrementNonce,
            useFullCommitment: x.useFullCommitment,
            implicitAccountCreationFee: x.implicitAccountCreationFee,
            mayUseToken: x.mayUseToken,
            pushEvents: x.pushEvents.mapUnsafe(Event, (fields) => 
            // TODO: this is really unsafe, make it safe
            'fromFieldsDynamic' in Event
                ? Event.fromFieldsDynamic(fields, []).value
                : Event.fromFields(fields, [])),
            pushActions: x.pushActions.mapUnsafe(Action, (fields) => 
            // TODO: this is really unsafe, make it safe
            'fromFieldsDynamic' in Action
                ? Action.fromFieldsDynamic(fields, []).value
                : Action.fromFields(fields, [])),
            setState: state_js_1.StateUpdates.fromGeneric(x.stateUpdates, State),
            setPermissions: x.permissionsUpdate,
            setDelegate: x.delegateUpdate,
            setVerificationKey: x.verificationKeyUpdate,
            setZkappUri: x.zkappUriUpdate,
            setTokenSymbol: x.tokenSymbolUpdate,
            setTiming: x.timingUpdate,
            setVotingFor: x.votingForUpdate,
        });
    }
    static generic(descr) {
        return new ContextFreeAccountUpdate('GenericState', GenericData, GenericData, descr);
    }
    static emptyPoly(State, Event, Action) {
        return new ContextFreeAccountUpdate(State, Event, Action, {
            authorizationKind: authorization_js_1.AccountUpdateAuthorizationKind.None(),
        });
    }
    static empty() {
        return ContextFreeAccountUpdate.emptyPoly('GenericState', GenericData, GenericData);
    }
    static from(State, Event, Action, x) {
        if (x instanceof ContextFreeAccountUpdate)
            return x;
        if (x === undefined)
            return ContextFreeAccountUpdate.emptyPoly(State, Event, Action);
        return new ContextFreeAccountUpdate(State, Event, Action, x);
    }
}
exports.ContextFreeAccountUpdate = ContextFreeAccountUpdate;
class AccountUpdate extends ContextFreeAccountUpdate {
    // TODO: circuit friendly representation (we really don't want to toBoolean() in the constructor here...)
    // proof: {pending: true, isRequired: Bool} | Proof<undefined, AccountUpdateCommitment>;
    constructor(State, Event, Action, descr) {
        // TODO NOW: THIS PATTERN IS BROKEN (we are casting and update into a description, which only works because the missing fields are all optional)
        const superInput = 'update' in descr ? descr.update : descr;
        super(State, Event, Action, superInput);
        if (this.authorizationKind.isProved.toBoolean()) {
            this.proof = 'proof' in descr && descr.proof !== undefined ? descr.proof : 'ProofPending';
        }
        else {
            if ('proof' in descr && descr.proof !== undefined) {
                throw new Error('proof was provided when constructing an AccountUpdate that does not require a proof');
            }
            this.proof = 'NoProofRequired';
        }
        this.accountId = descr.accountId;
        this.verificationKeyHash =
            descr.verificationKeyHash ?? new field_js_1.Field(constants_js_1.mocks.dummyVerificationKeyHash);
        this.callData = descr.callData ?? new field_js_1.Field(0);
    }
    get authorizationKindWithZkappContext() {
        return new authorization_js_1.AccountUpdateAuthorizationKindWithZkappContext(this.authorizationKind, this.verificationKeyHash);
    }
    toInternalRepr(callDepth) {
        return {
            authorizationKind: this.authorizationKindWithZkappContext,
            publicKey: this.accountId.publicKey,
            tokenId: this.accountId.tokenId.value,
            callData: this.callData,
            callDepth: callDepth,
            balanceChange: this.balanceChange,
            incrementNonce: this.incrementNonce,
            useFullCommitment: this.useFullCommitment,
            implicitAccountCreationFee: this.implicitAccountCreationFee,
            mayUseToken: this.mayUseToken,
            events: this.pushEvents.toInternalRepr(),
            actions: this.pushActions.toInternalRepr(),
            preconditions: this.preconditions.toInternalRepr(),
            update: {
                appState: state_js_1.StateUpdates.toFieldUpdates(this.State, this.stateUpdates).map((update) => update.toOption()),
                delegate: this.delegateUpdate.toOption(),
                verificationKey: core_js_1.Option.map(this.verificationKeyUpdate.toOption(), (data) => data instanceof verification_key_js_1.VerificationKey ? new verification_key_js_1.VerificationKey(data) : data),
                permissions: this.permissionsUpdate.toOption(),
                zkappUri: this.zkappUriUpdate.toOption(),
                tokenSymbol: this.tokenSymbolUpdate.toOption(),
                timing: this.timingUpdate.toOption(),
                votingFor: this.votingForUpdate.toOption(),
            },
        };
    }
    toInput() {
        return Bindings.Layout.AccountUpdateBody.toInput(this.toInternalRepr(0));
    }
    commit(networkId) {
        const commitment = (0, poseidon_js_1.hashWithPrefix)((0, signature_js_2.zkAppBodyPrefix)(networkId), (0, poseidon_js_1.packToFields)(this.toInput()));
        return new AccountUpdateCommitment(commitment);
    }
    toGeneric() {
        return new AccountUpdate('GenericState', GenericData, GenericData, {
            update: super.toGeneric(),
            proof: this.proof instanceof zkprogram_js_1.Proof ? this.proof : undefined,
            accountId: this.accountId,
            verificationKeyHash: this.verificationKeyHash,
            callData: this.callData,
        });
    }
    static fromGeneric(x, State, Event, Action) {
        return new AccountUpdate(State, Event, Action, {
            update: ContextFreeAccountUpdate.fromGeneric(x, State, Event, Action),
            proof: x.proof instanceof zkprogram_js_1.Proof ? x.proof : undefined,
            accountId: x.accountId,
            verificationKeyHash: x.verificationKeyHash,
            callData: x.callData,
        });
    }
    async authorize(authEnv) {
        let proof = null;
        let signature = null;
        switch (this.proof) {
            case 'NoProofRequired':
                if (this.authorizationKind.isProved.toBoolean()) {
                    throw new Error(`account update proof was marked as not required, but authorization kind was ${this.authorizationKind.identifier()}`);
                }
                else {
                    break;
                }
            case 'ProofPending':
                if (this.authorizationKind.isProved.toBoolean()) {
                    throw new Error(`account update proof is still pending; a proof must be generated and assigned to an account update before calling authorize`);
                }
                else {
                    console.warn(`account update is marked to required a proof, but the authorization kind is ${this.authorizationKind.identifier()} (and the proof is still pending)`);
                    break;
                }
            default:
                if (this.authorizationKind.isProved.toBoolean()) {
                    proof = bindings_js_1.Pickles.proofToBase64Transaction(this.proof.proof);
                }
                else {
                    console.warn(`account update has a proof, but no proof is required by authorization kind ${this.authorizationKind.identifier()}, so it will not be included`);
                }
        }
        if (this.authorizationKind.isSigned.toBoolean()) {
            let txnCommitment;
            if (this.useFullCommitment.toBoolean()) {
                if (authEnv.fullTransactionCommitment === undefined) {
                    throw new Error('unable to authorize account update: useFullCommitment is true, but not full transaction commitment was provided in authorization environment');
                }
                txnCommitment = authEnv.fullTransactionCommitment;
            }
            else {
                txnCommitment = authEnv.accountUpdateForestCommitment;
            }
            const privateKey = await authEnv.getPrivateKey(this.accountId.publicKey);
            const sig = (0, signature_js_2.signFieldElement)(txnCommitment, privateKey.toBigInt(), authEnv.networkId);
            signature = signature_js_2.Signature.toBase58(sig);
        }
        return new Authorized({ proof, signature }, this);
    }
    static create(x) {
        return new AccountUpdate('GenericState', GenericData, GenericData, x);
    }
    static fromInternalRepr(x) {
        return new AccountUpdate('GenericState', GenericData, GenericData, {
            accountId: new account_js_1.AccountId(x.publicKey, new core_js_1.TokenId(x.tokenId)),
            verificationKeyHash: x.authorizationKind.verificationKeyHash,
            authorizationKind: new authorization_js_1.AccountUpdateAuthorizationKind(x.authorizationKind),
            callData: x.callData,
            balanceChange: int_js_1.Int64.create(x.balanceChange.magnitude, x.balanceChange.sgn),
            incrementNonce: x.incrementNonce,
            useFullCommitment: x.useFullCommitment,
            implicitAccountCreationFee: x.implicitAccountCreationFee,
            mayUseToken: x.mayUseToken,
            pushEvents: CommittedList.from(GenericData, EventsHashConfig(GenericData), x.events),
            pushActions: CommittedList.from(GenericData, ActionsHashConfig(GenericData), x.actions),
            preconditions: preconditions_js_1.Preconditions.fromInternalRepr(x.preconditions),
            setState: new state_js_1.GenericStateUpdates(x.update.appState.map(core_js_1.Update.fromOption)),
            setDelegate: core_js_1.Update.fromOption(x.update.delegate),
            setVerificationKey: core_js_1.Update.fromOption(x.update.verificationKey),
            setPermissions: core_js_1.Update.fromOption(core_js_1.Option.map(x.update.permissions, permissions_js_1.Permissions.fromInternalRepr)),
            setZkappUri: core_js_1.Update.fromOption(core_js_1.Option.map(x.update.zkappUri, (uri) => new core_js_1.ZkappUri(uri))),
            setTokenSymbol: core_js_1.Update.fromOption(core_js_1.Option.map(x.update.tokenSymbol, (symbol) => new poseidon_js_1.TokenSymbol(symbol))),
            setTiming: core_js_1.Update.fromOption(core_js_1.Option.map(x.update.timing, (timing) => new account_js_1.AccountTiming(timing))),
            setVotingFor: core_js_1.Update.fromOption(x.update.votingFor),
        });
    }
    static sizeInFields() {
        return Bindings.Layout.AccountUpdateBody.sizeInFields();
    }
    static toFields(x) {
        return Bindings.Layout.AccountUpdateBody.toFields(x.toInternalRepr(0));
    }
    static toAuxiliary(x, callDepth) {
        return Bindings.Layout.AccountUpdateBody.toAuxiliary(x?.toInternalRepr(callDepth ?? 0));
    }
    static fromFields(fields, aux) {
        return AccountUpdate.fromInternalRepr(Bindings.Layout.AccountUpdateBody.fromFields(fields, aux));
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static check(_x) {
        // TODO
    }
    static empty() {
        return new AccountUpdate('GenericState', GenericData, GenericData, {
            accountId: account_js_1.AccountId.empty(),
            callData: field_js_1.Field.empty(),
            update: ContextFreeAccountUpdate.empty(),
        });
    }
}
exports.AccountUpdate = AccountUpdate;
// TODO NOW: un-namespace this
/*
type ContextFreeDescription<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> = ContextFreeAccountUpdateDescription<State, Event, Action>;
type ContextFree<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> = ContextFreeAccountUpdate<State, Event, Action>;
const ContextFree = ContextFreeAccountUpdate;
*/
// TODO: can we enforce that Authorized account updates are immutable?
class Authorized {
    constructor(authorization, update) {
        this.authorization = authorization;
        this.update = update;
    }
    toAccountUpdate() {
        return this.update;
    }
    get State() {
        return this.update.State;
    }
    get authorizationKind() {
        return this.update.authorizationKind;
    }
    get accountId() {
        return this.update.accountId;
    }
    get verificationKeyHash() {
        return this.update.verificationKeyHash;
    }
    get callData() {
        return this.update.callData;
    }
    get preconditions() {
        return this.update.preconditions;
    }
    get balanceChange() {
        return this.update.balanceChange;
    }
    get incrementNonce() {
        return this.update.incrementNonce;
    }
    get useFullCommitment() {
        return this.update.useFullCommitment;
    }
    get implicitAccountCreationFee() {
        return this.update.implicitAccountCreationFee;
    }
    get mayUseToken() {
        return this.update.mayUseToken;
    }
    get pushEvents() {
        return this.update.pushEvents;
    }
    get pushActions() {
        return this.update.pushActions;
    }
    get stateUpdates() {
        return this.update.stateUpdates;
    }
    get permissionsUpdate() {
        return this.update.permissionsUpdate;
    }
    get delegateUpdate() {
        return this.update.delegateUpdate;
    }
    get verificationKeyUpdate() {
        return this.update.verificationKeyUpdate;
    }
    get zkappUriUpdate() {
        return this.update.zkappUriUpdate;
    }
    get tokenSymbolUpdate() {
        return this.update.tokenSymbolUpdate;
    }
    get timingUpdate() {
        return this.update.timingUpdate;
    }
    get votingForUpdate() {
        return this.update.votingForUpdate;
    }
    get authorizationKindWithZkappContext() {
        return this.update.authorizationKindWithZkappContext;
    }
    hash(netId) {
        let input = Bindings.Layout.ZkappAccountUpdate.toInput(this.toInternalRepr(0));
        return (0, poseidon_js_1.hashWithPrefix)((0, signature_js_2.zkAppBodyPrefix)(netId), (0, poseidon_js_1.packToFields)(input));
    }
    toInternalRepr(callDepth) {
        return {
            authorization: {
                proof: this.authorization.proof === null ? undefined : this.authorization.proof,
                signature: this.authorization.signature === null ? undefined : this.authorization.signature,
            },
            body: this.update.toInternalRepr(callDepth),
        };
    }
    static fromInternalRepr(x) {
        return new Authorized({
            // when the internal representation is returned from the previous version when casting from fields,
            // (if there is no proof or authorization, values are set to false rather than to undefined)
            proof: x.authorization.proof !== false ? x.authorization.proof ?? null : null,
            signature: x.authorization.proof !== false ? x.authorization.signature ?? null : null,
        }, AccountUpdate.fromInternalRepr(x.body));
    }
    toJSON(callDepth) {
        return Authorized.toJSON(this, callDepth);
    }
    toInput() {
        return Authorized.toInput(this);
    }
    toFields() {
        return Authorized.toFields(this);
    }
    static empty() {
        return new Authorized({ proof: null, signature: null }, AccountUpdate.empty());
    }
    static sizeInFields() {
        return Bindings.Layout.ZkappAccountUpdate.sizeInFields();
    }
    static toJSON(x, callDepth) {
        return Bindings.Layout.ZkappAccountUpdate.toJSON(x.toInternalRepr(callDepth));
    }
    static toInput(x) {
        return Bindings.Layout.ZkappAccountUpdate.toInput(x.toInternalRepr(0));
    }
    static toFields(x) {
        return Bindings.Layout.ZkappAccountUpdate.toFields(x.toInternalRepr(0));
    }
    static toAuxiliary(x, callDepth) {
        return Bindings.Layout.ZkappAccountUpdate.toAuxiliary(x?.toInternalRepr(callDepth ?? 0));
    }
    static fromFields(fields, aux) {
        return Authorized.fromInternalRepr(Bindings.Layout.ZkappAccountUpdate.fromFields(fields, aux));
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static check(_x) {
        throw new Error('TODO');
    }
}
exports.Authorized = Authorized;
