"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashedAccountUpdate = exports.hashAccountUpdate = exports.AccountUpdateLayout = exports.AccountUpdateTreeBase = exports.dummySignature = exports.zkAppProver = exports.TokenId = exports.Actions = exports.Events = exports.addMissingProofs = exports.addMissingSignatures = exports.ZkappCommand = exports.Authorization = exports.Body = exports.Preconditions = exports.Permission = exports.AccountUpdateTree = exports.AccountUpdateForest = exports.TransactionVersion = exports.ZkappPublicInput = exports.Permissions = exports.AccountUpdate = void 0;
const struct_js_1 = require("../../provable/types/struct.js");
const provable_derivers_js_1 = require("../../provable/types/provable-derivers.js");
const provable_js_1 = require("../../provable/provable.js");
const wrapped_js_1 = require("../../provable/wrapped.js");
const bindings_js_1 = require("../../../bindings.js");
const js_layout_js_1 = require("../../../bindings/mina-transaction/gen/v1/js-layout.js");
const types_js_1 = require("../../../bindings/mina-transaction/v1/types.js");
const signature_js_1 = require("../../provable/crypto/signature.js");
const int_js_1 = require("../../provable/int.js");
const precondition_js_1 = require("./precondition.js");
Object.defineProperty(exports, "Preconditions", { enumerable: true, get: function () { return precondition_js_1.Preconditions; } });
const zkprogram_js_1 = require("../../proof-system/zkprogram.js");
const memo_js_1 = require("../../../mina-signer/src/memo.js");
const transaction_leaves_js_1 = require("../../../bindings/mina-transaction/v1/transaction-leaves.js");
const base58_encodings_js_1 = require("./base58-encodings.js");
const poseidon_js_1 = require("../../provable/crypto/poseidon.js");
const constants_js_1 = require("../../../bindings/crypto/constants.js");
const signature_js_2 = require("../../../mina-signer/src/signature.js");
const fields_js_1 = require("../../ml/fields.js");
const sign_zkapp_command_js_1 = require("../../../mina-signer/src/sign-zkapp-command.js");
const transaction_context_js_1 = require("./transaction-context.js");
const smart_contract_base_js_1 = require("./smart-contract-base.js");
const mina_instance_js_1 = require("./mina-instance.js");
const merkle_list_js_1 = require("../../provable/merkle-list.js");
const packed_js_1 = require("../../provable/packed.js");
const smart_contract_context_js_1 = require("./smart-contract-context.js");
const assert_js_1 = require("../../util/assert.js");
const auxiliary_js_1 = require("../../provable/types/auxiliary.js");
const TransactionVersion = {
    current: () => int_js_1.UInt32.from(constants_js_1.protocolVersions.txnVersion),
};
exports.TransactionVersion = TransactionVersion;
let zkAppProver = (0, zkprogram_js_1.Prover)();
exports.zkAppProver = zkAppProver;
const MayUseToken = {
    type: transaction_leaves_js_1.MayUseToken,
    No: {
        parentsOwnToken: (0, wrapped_js_1.Bool)(false),
        inheritFromParent: (0, wrapped_js_1.Bool)(false),
    },
    ParentsOwnToken: {
        parentsOwnToken: (0, wrapped_js_1.Bool)(true),
        inheritFromParent: (0, wrapped_js_1.Bool)(false),
    },
    InheritFromParent: {
        parentsOwnToken: (0, wrapped_js_1.Bool)(false),
        inheritFromParent: (0, wrapped_js_1.Bool)(true),
    },
    isNo: ({ body: { mayUseToken: { parentsOwnToken, inheritFromParent }, }, }) => parentsOwnToken.or(inheritFromParent).not(),
    isParentsOwnToken: (a) => a.body.mayUseToken.parentsOwnToken,
    isInheritFromParent: (a) => a.body.mayUseToken.inheritFromParent,
};
const Events = {
    ...transaction_leaves_js_1.Events,
    pushEvent(events, event) {
        events = transaction_leaves_js_1.Events.pushEvent(events, event);
        provable_js_1.Provable.asProver(() => {
            // make sure unconstrained data is stored as constants
            events.data[0] = events.data[0].map((e) => (0, wrapped_js_1.Field)(wrapped_js_1.Field.toBigint(e)));
        });
        return events;
    },
};
exports.Events = Events;
const Actions = {
    ...transaction_leaves_js_1.Actions,
    pushEvent(actions, action) {
        actions = transaction_leaves_js_1.Actions.pushEvent(actions, action);
        provable_js_1.Provable.asProver(() => {
            // make sure unconstrained data is stored as constants
            actions.data[0] = actions.data[0].map((e) => (0, wrapped_js_1.Field)(wrapped_js_1.Field.toBigint(e)));
        });
        return actions;
    },
};
exports.Actions = Actions;
const True = () => (0, wrapped_js_1.Bool)(true);
const False = () => (0, wrapped_js_1.Bool)(false);
class VerificationKeyPermission {
    constructor(auth, txnVersion) {
        this.auth = auth;
        this.txnVersion = txnVersion;
    }
    // TODO this class could be made incompatible with a plain object (breaking change)
    // private _ = undefined;
    static withCurrentVersion(perm) {
        return new VerificationKeyPermission(perm, TransactionVersion.current());
    }
}
let Permission = {
    /**
     * Modification is impossible.
     */
    impossible: () => ({
        constant: True(),
        signatureNecessary: True(),
        signatureSufficient: False(),
    }),
    /**
     * Modification is always permitted
     */
    none: () => ({
        constant: True(),
        signatureNecessary: False(),
        signatureSufficient: True(),
    }),
    /**
     * Modification is permitted by zkapp proofs only
     */
    proof: () => ({
        constant: False(),
        signatureNecessary: False(),
        signatureSufficient: False(),
    }),
    /**
     * Modification is permitted by signatures only, using the private key of the zkapp account
     */
    signature: () => ({
        constant: False(),
        signatureNecessary: True(),
        signatureSufficient: True(),
    }),
    /**
     * Modification is permitted by zkapp proofs or signatures
     */
    proofOrSignature: () => ({
        constant: False(),
        signatureNecessary: False(),
        signatureSufficient: True(),
    }),
    /**
     * Special Verification key permissions.
     *
     * The difference to normal permissions is that `Permission.proof` and `Permission.impossible` are replaced by less restrictive permissions:
     * - `impossible` is replaced by `impossibleDuringCurrentVersion`
     * - `proof` is replaced by `proofDuringCurrentVersion`
     *
     * The issue is that a future hardfork which changes the proof system could mean that old verification keys can no longer
     * be used to verify proofs in the new proof system, and the zkApp would have to be redeployed to adapt the verification key.
     *
     * Having either `impossible` or `proof` would mean that these zkApps can't be upgraded after this hypothetical hardfork, and would become unusable.
     *
     * Such a future hardfork would manifest as an increment in the "transaction version" of zkApps, which you can check with {@link TransactionVersion.current()}.
     *
     * The `impossibleDuringCurrentVersion` and `proofDuringCurrentVersion` have an additional `txnVersion` field.
     * These permissions follow the same semantics of not upgradable, or only upgradable with proofs,
     * _as long as_ the current transaction version is the same as the one on the permission.
     *
     * Once the current transaction version is higher than the one on the permission, the permission is treated as `signature`,
     * and the zkApp can be redeployed with a signature of the original account owner.
     */
    VerificationKey: {
        /**
         * Modification is impossible, as long as the network accepts the current {@link TransactionVersion}.
         *
         * After a hardfork that increments the transaction version, the permission is treated as `signature`.
         */
        impossibleDuringCurrentVersion: () => VerificationKeyPermission.withCurrentVersion(Permission.impossible()),
        /**
         * Modification is always permitted
         */
        none: () => VerificationKeyPermission.withCurrentVersion(Permission.none()),
        /**
         * Modification is permitted by zkapp proofs only; as long as the network accepts the current {@link TransactionVersion}.
         *
         * After a hardfork that increments the transaction version, the permission is treated as `signature`.
         */
        proofDuringCurrentVersion: () => VerificationKeyPermission.withCurrentVersion(Permission.proof()),
        /**
         * Modification is permitted by signatures only, using the private key of the zkapp account
         */
        signature: () => VerificationKeyPermission.withCurrentVersion(Permission.signature()),
        /**
         * Modification is permitted by zkapp proofs or signatures
         */
        proofOrSignature: () => VerificationKeyPermission.withCurrentVersion(Permission.proofOrSignature()),
    },
};
exports.Permission = Permission;
let Permissions = {
    ...Permission,
    /**
     * Default permissions are:
     *
     *   {@link Permissions.editState} = {@link Permission.proof}
     *
     *   {@link Permissions.send} = {@link Permission.signature}
     *
     *   {@link Permissions.receive} = {@link Permission.none}
     *
     *   {@link Permissions.setDelegate} = {@link Permission.signature}
     *
     *   {@link Permissions.setPermissions} = {@link Permission.signature}
     *
     *   {@link Permissions.setVerificationKey} = {@link Permission.signature}
     *
     *   {@link Permissions.setZkappUri} = {@link Permission.signature}
     *
     *   {@link Permissions.editActionState} = {@link Permission.proof}
     *
     *   {@link Permissions.setTokenSymbol} = {@link Permission.signature}
     *
     */
    default: () => ({
        editState: Permission.proof(),
        send: Permission.proof(),
        receive: Permission.none(),
        setDelegate: Permission.signature(),
        setPermissions: Permission.signature(),
        setVerificationKey: Permission.VerificationKey.signature(),
        setZkappUri: Permission.signature(),
        editActionState: Permission.proof(),
        setTokenSymbol: Permission.signature(),
        incrementNonce: Permission.signature(),
        setVotingFor: Permission.signature(),
        setTiming: Permission.signature(),
        access: Permission.none(),
    }),
    initial: () => ({
        editState: Permission.signature(),
        send: Permission.signature(),
        receive: Permission.none(),
        setDelegate: Permission.signature(),
        setPermissions: Permission.signature(),
        setVerificationKey: Permission.VerificationKey.signature(),
        setZkappUri: Permission.signature(),
        editActionState: Permission.signature(),
        setTokenSymbol: Permission.signature(),
        incrementNonce: Permission.signature(),
        setVotingFor: Permission.signature(),
        setTiming: Permission.signature(),
        access: Permission.none(),
    }),
    dummy: () => ({
        editState: Permission.none(),
        send: Permission.none(),
        receive: Permission.none(),
        access: Permission.none(),
        setDelegate: Permission.none(),
        setPermissions: Permission.none(),
        setVerificationKey: Permission.VerificationKey.none(),
        setZkappUri: Permission.none(),
        editActionState: Permission.none(),
        setTokenSymbol: Permission.none(),
        incrementNonce: Permission.none(),
        setVotingFor: Permission.none(),
        setTiming: Permission.none(),
    }),
    allImpossible: () => ({
        editState: Permission.impossible(),
        send: Permission.impossible(),
        receive: Permission.impossible(),
        access: Permission.impossible(),
        setDelegate: Permission.impossible(),
        setPermissions: Permission.impossible(),
        setVerificationKey: Permission.VerificationKey.impossibleDuringCurrentVersion(),
        setZkappUri: Permission.impossible(),
        editActionState: Permission.impossible(),
        setTokenSymbol: Permission.impossible(),
        incrementNonce: Permission.impossible(),
        setVotingFor: Permission.impossible(),
        setTiming: Permission.impossible(),
    }),
    fromString: (permission) => {
        switch (permission) {
            case 'None':
                return Permission.none();
            case 'Either':
                return Permission.proofOrSignature();
            case 'Proof':
                return Permission.proof();
            case 'Signature':
                return Permission.signature();
            case 'Impossible':
                return Permission.impossible();
            default:
                throw Error(`Cannot parse invalid permission. ${permission} does not exist.`);
        }
    },
    fromJSON: (permissions) => {
        return Object.fromEntries(Object.entries(permissions).map(([k, v]) => [
            k,
            Permissions.fromString(typeof v === 'string' ? v : v.auth),
        ]));
    },
};
exports.Permissions = Permissions;
const Body = {
    /**
     * A body that doesn't change the underlying account record
     */
    keepAll(publicKey, tokenId, mayUseToken) {
        let { body } = types_js_1.Types.AccountUpdate.empty();
        body.publicKey = publicKey;
        if (tokenId) {
            body.tokenId = tokenId;
            body.mayUseToken = provable_js_1.Provable.if(tokenId.equals(TokenId.default), AccountUpdate.MayUseToken.type, AccountUpdate.MayUseToken.No, AccountUpdate.MayUseToken.ParentsOwnToken);
        }
        if (mayUseToken) {
            body.mayUseToken = mayUseToken;
        }
        return body;
    },
    dummy() {
        return types_js_1.Types.AccountUpdate.empty().body;
    },
};
exports.Body = Body;
const FeePayerBody = {
    keepAll(publicKey, nonce) {
        return {
            publicKey,
            nonce,
            fee: int_js_1.UInt64.zero,
            validUntil: undefined,
        };
    },
};
const AccountId = (0, provable_derivers_js_1.provable)({ tokenOwner: signature_js_1.PublicKey, parentTokenId: wrapped_js_1.Field });
const TokenId = {
    ...types_js_1.Types.TokenId,
    ...base58_encodings_js_1.TokenId,
    get default() {
        return (0, wrapped_js_1.Field)(1);
    },
    derive(tokenOwner, parentTokenId = (0, wrapped_js_1.Field)(1)) {
        let input = AccountId.toInput({ tokenOwner, parentTokenId });
        return (0, poseidon_js_1.hashWithPrefix)(constants_js_1.prefixes.deriveTokenId, (0, poseidon_js_1.packToFields)(input));
    },
};
exports.TokenId = TokenId;
/**
 * An {@link AccountUpdate} is a set of instructions for the Mina network.
 * It includes {@link Preconditions} and a list of state updates, which need to
 * be authorized by either a {@link Signature} or {@link Proof}.
 */
class AccountUpdate {
    constructor(body, authorization = {}, isSelf = false) {
        /**
         * A human-readable label for the account update, indicating how that update
         * was created. Can be modified by applications to add richer information.
         */
        this.label = '';
        this.lazyAuthorization = undefined;
        this.id = Math.random();
        this.body = body;
        this.authorization = authorization;
        let { account, network, currentSlot } = (0, precondition_js_1.preconditions)(this, isSelf);
        this.account = account;
        this.network = network;
        this.currentSlot = currentSlot;
        this.isSelf = isSelf;
    }
    /**
     * Clones the {@link AccountUpdate}.
     */
    static clone(accountUpdate) {
        let body = (0, struct_js_1.cloneCircuitValue)(accountUpdate.body);
        let authorization = (0, struct_js_1.cloneCircuitValue)(accountUpdate.authorization);
        let cloned = new AccountUpdate(body, authorization, accountUpdate.isSelf);
        cloned.lazyAuthorization = accountUpdate.lazyAuthorization;
        cloned.id = accountUpdate.id;
        cloned.label = accountUpdate.label;
        return cloned;
    }
    get tokenId() {
        return this.body.tokenId;
    }
    send({ to, amount, }) {
        let receiver;
        if (to instanceof AccountUpdate) {
            receiver = to;
            receiver.body.tokenId.assertEquals(this.body.tokenId);
        }
        else if ((0, smart_contract_base_js_1.isSmartContract)(to)) {
            receiver = to.self;
            receiver.body.tokenId.assertEquals(this.body.tokenId);
        }
        else {
            receiver = AccountUpdate.default(to, this.body.tokenId);
            receiver.label = `${this.label ?? 'Unlabeled'}.send()`;
            this.approve(receiver);
        }
        // Sub the amount from the sender's account
        this.body.balanceChange = this.body.balanceChange.sub(amount);
        // Add the amount to the receiver's account
        receiver.body.balanceChange = receiver.body.balanceChange.add(amount);
        return receiver;
    }
    /**
     * Makes another {@link AccountUpdate} a child of this one.
     *
     * The parent-child relationship means that the child becomes part of the "statement"
     * of the parent, and goes into the commitment that is authorized by either a signature
     * or a proof.
     *
     * For a proof in particular, child account updates are contained in the public input
     * of the proof that authorizes the parent account update.
     */
    approve(child) {
        if (child instanceof AccountUpdateForest) {
            (0, smart_contract_context_js_1.accountUpdateLayout)()?.setChildren(this, child);
            return;
        }
        if (child instanceof AccountUpdate) {
            child.body.callDepth = this.body.callDepth + 1;
        }
        (0, smart_contract_context_js_1.accountUpdateLayout)()?.disattach(child);
        (0, smart_contract_context_js_1.accountUpdateLayout)()?.pushChild(this, child);
    }
    get balance() {
        let accountUpdate = this;
        return {
            addInPlace(x) {
                accountUpdate.body.balanceChange = accountUpdate.body.balanceChange.add(x);
            },
            subInPlace(x) {
                accountUpdate.body.balanceChange = accountUpdate.body.balanceChange.sub(x);
            },
        };
    }
    get balanceChange() {
        return this.body.balanceChange;
    }
    set balanceChange(x) {
        this.body.balanceChange = x;
    }
    get update() {
        return this.body.update;
    }
    static setValue(maybeValue, value) {
        maybeValue.isSome = (0, wrapped_js_1.Bool)(true);
        maybeValue.value = value;
    }
    /**
     * Constrain a property to lie between lower and upper bounds.
     *
     * @param property The property to constrain
     * @param lower The lower bound
     * @param upper The upper bound
     *
     * Example: To constrain the account balance of a SmartContract to lie between
     * 0 and 20 MINA, you can use
     *
     * ```ts
     * \@method onlyRunsWhenBalanceIsLow() {
     *   let lower = UInt64.zero;
     *   let upper = UInt64.from(20e9);
     *   AccountUpdate.assertBetween(this.self.body.preconditions.account.balance, lower, upper);
     *   // ...
     * }
     * ```
     */
    static assertBetween(property, lower, upper) {
        property.isSome = (0, wrapped_js_1.Bool)(true);
        property.value.lower = lower;
        property.value.upper = upper;
    }
    // TODO: assertGreaterThan, assertLowerThan?
    /**
     * Fix a property to a certain value.
     *
     * @param property The property to constrain
     * @param value The value it is fixed to
     *
     * Example: To fix the account nonce of a SmartContract to 0, you can use
     *
     * ```ts
     * \@method onlyRunsWhenNonceIsZero() {
     *   AccountUpdate.assertEquals(this.self.body.preconditions.account.nonce, UInt32.zero);
     *   // ...
     * }
     * ```
     */
    static assertEquals(property, value) {
        property.isSome = (0, wrapped_js_1.Bool)(true);
        if ('lower' in property.value && 'upper' in property.value) {
            property.value.lower = value;
            property.value.upper = value;
        }
        else {
            property.value = value;
        }
    }
    get publicKey() {
        return this.body.publicKey;
    }
    /**
     * Use this command if this account update should be signed by the account
     * owner, instead of not having any authorization.
     *
     * If you use this and are not relying on a wallet to sign your transaction,
     * then you should use the following code before sending your transaction:
     *
     * ```ts
     * let tx = await Mina.transaction(...); // create transaction as usual, using `requireSignature()` somewhere
     * tx.sign([privateKey]); // pass the private key of this account to `sign()`!
     * ```
     *
     * Note that an account's {@link Permissions} determine which updates have to
     * be (can be) authorized by a signature.
     */
    requireSignature() {
        let { nonce, isSameAsFeePayer } = AccountUpdate.getSigningInfo(this);
        // if this account is the same as the fee payer, we use the "full commitment" for replay protection
        this.body.useFullCommitment = isSameAsFeePayer;
        this.body.implicitAccountCreationFee = (0, wrapped_js_1.Bool)(false);
        // otherwise, we increment the nonce
        let doIncrementNonce = isSameAsFeePayer.not();
        this.body.incrementNonce = doIncrementNonce;
        // in this case, we also have to set a nonce precondition
        let lower = provable_js_1.Provable.if(doIncrementNonce, int_js_1.UInt32, nonce, int_js_1.UInt32.zero);
        let upper = provable_js_1.Provable.if(doIncrementNonce, int_js_1.UInt32, nonce, int_js_1.UInt32.MAXINT());
        this.body.preconditions.account.nonce.isSome = doIncrementNonce;
        this.body.preconditions.account.nonce.value.lower = lower;
        this.body.preconditions.account.nonce.value.upper = upper;
        // set lazy signature
        Authorization.setLazySignature(this);
    }
    static signFeePayerInPlace(feePayer) {
        feePayer.body.nonce = this.getNonce(feePayer);
        feePayer.authorization = dummySignature();
        feePayer.lazyAuthorization = { kind: 'lazy-signature' };
    }
    static getNonce(accountUpdate) {
        return AccountUpdate.getSigningInfo(accountUpdate).nonce;
    }
    static getSigningInfo(accountUpdate) {
        return (0, provable_js_1.memoizeWitness)(AccountUpdate.signingInfo, () => AccountUpdate.getSigningInfoUnchecked(accountUpdate));
    }
    static getSigningInfoUnchecked(update) {
        let publicKey = update.body.publicKey;
        let tokenId = update instanceof AccountUpdate ? update.body.tokenId : TokenId.default;
        let nonce = Number((0, precondition_js_1.getAccountPreconditions)(update.body).nonce.toString());
        // if the fee payer is the same account update as this one, we have to start
        // the nonce predicate at one higher, bc the fee payer already increases its
        // nonce
        let isFeePayer = (0, transaction_context_js_1.currentTransaction)()?.sender?.equals(publicKey);
        let isSameAsFeePayer = !!isFeePayer?.and(tokenId.equals(TokenId.default)).toBoolean();
        if (isSameAsFeePayer)
            nonce++;
        // now, we check how often this account update already updated its nonce in
        // this tx, and increase nonce from `getAccount` by that amount
        let layout = (0, transaction_context_js_1.currentTransaction)()?.layout;
        layout?.forEachPredecessor(update, (otherUpdate) => {
            let shouldIncreaseNonce = otherUpdate.publicKey
                .equals(publicKey)
                .and(otherUpdate.tokenId.equals(tokenId))
                .and(otherUpdate.body.incrementNonce);
            if (shouldIncreaseNonce.toBoolean())
                nonce++;
        });
        return {
            nonce: int_js_1.UInt32.from(nonce),
            isSameAsFeePayer: (0, wrapped_js_1.Bool)(isSameAsFeePayer),
        };
    }
    toJSON() {
        return types_js_1.Types.AccountUpdate.toJSON(this);
    }
    static toJSON(a) {
        return types_js_1.Types.AccountUpdate.toJSON(a);
    }
    static fromJSON(json) {
        let accountUpdate = types_js_1.Types.AccountUpdate.fromJSON(json);
        return new AccountUpdate(accountUpdate.body, accountUpdate.authorization);
    }
    hash() {
        let input = types_js_1.Types.AccountUpdate.toInput(this);
        return (0, poseidon_js_1.hashWithPrefix)((0, signature_js_2.zkAppBodyPrefix)(mina_instance_js_1.activeInstance.getNetworkId()), (0, poseidon_js_1.packToFields)(input));
    }
    toPublicInput({ accountUpdates }) {
        let accountUpdate = this.hash();
        // collect this update's descendants
        let descendants = [];
        let callDepth = this.body.callDepth;
        let i = accountUpdates.findIndex((a) => a.id === this.id);
        (0, assert_js_1.assert)(i !== -1, 'Account update not found in transaction');
        for (i++; i < accountUpdates.length; i++) {
            let update = accountUpdates[i];
            if (update.body.callDepth <= callDepth)
                break;
            descendants.push(update);
        }
        // call forest hash
        let forest = (0, sign_zkapp_command_js_1.accountUpdatesToCallForest)(descendants, callDepth + 1);
        let calls = (0, sign_zkapp_command_js_1.callForestHashGeneric)(forest, (a) => a.hash(), poseidon_js_1.Poseidon.hashWithPrefix, merkle_list_js_1.emptyHash, mina_instance_js_1.activeInstance.getNetworkId());
        return { accountUpdate, calls };
    }
    toPrettyLayout() {
        let node = (0, smart_contract_context_js_1.accountUpdateLayout)()?.get(this);
        (0, assert_js_1.assert)(node !== undefined, 'AccountUpdate not found in layout');
        node.children.print();
    }
    extractTree() {
        let layout = (0, smart_contract_context_js_1.accountUpdateLayout)();
        let hash = layout?.get(this)?.final?.hash;
        let id = this.id;
        let children = layout?.finalizeAndRemove(this) ?? AccountUpdateForest.empty();
        let accountUpdate = HashedAccountUpdate.hash(this, hash);
        return new AccountUpdateTree({ accountUpdate, id, children });
    }
    /**
     * Create an account update from a public key and an optional token id.
     *
     * **Important**: This method is different from `AccountUpdate.create()`, in that it really just creates the account update object.
     * It does not attach the update to the current transaction or smart contract.
     * Use this method for lower-level operations with account updates.
     */
    static default(address, tokenId) {
        return new AccountUpdate(Body.keepAll(address, tokenId));
    }
    static dummy() {
        let dummy = new AccountUpdate(Body.dummy());
        dummy.label = 'Dummy';
        return dummy;
    }
    isDummy() {
        return this.body.publicKey.isEmpty();
    }
    static defaultFeePayer(address, nonce) {
        let body = FeePayerBody.keepAll(address, nonce);
        return {
            body,
            authorization: dummySignature(),
            lazyAuthorization: { kind: 'lazy-signature' },
        };
    }
    static dummyFeePayer() {
        let body = FeePayerBody.keepAll(signature_js_1.PublicKey.empty(), int_js_1.UInt32.zero);
        return { body, authorization: dummySignature() };
    }
    /**
     * Creates an account update. If this is inside a transaction, the account
     * update becomes part of the transaction. If this is inside a smart contract
     * method, the account update will not only become part of the transaction,
     * but also becomes available for the smart contract to modify, in a way that
     * becomes part of the proof.
     */
    static create(publicKey, tokenId) {
        let accountUpdate = AccountUpdate.default(publicKey, tokenId);
        let insideContract = smart_contract_context_js_1.smartContractContext.get();
        if (insideContract) {
            let self = insideContract.this.self;
            self.approve(accountUpdate);
            accountUpdate.label = `${self.label || 'Unlabeled'} > AccountUpdate.create()`;
        }
        else {
            (0, transaction_context_js_1.currentTransaction)()?.layout.pushTopLevel(accountUpdate);
            accountUpdate.label = `Mina.transaction() > AccountUpdate.create()`;
        }
        return accountUpdate;
    }
    /**
     * Create an account update that is added to the transaction only if a condition is met.
     *
     * See {@link AccountUpdate.create} for more information. In this method, you can pass in
     * a condition that determines whether the account update should be added to the transaction.
     */
    static createIf(condition, publicKey, tokenId) {
        return AccountUpdate.create(
        // if the condition is false, we use an empty public key, which causes the account update to be ignored
        // as a dummy when building the transaction
        provable_js_1.Provable.if(condition, publicKey, signature_js_1.PublicKey.empty()), tokenId);
    }
    /**
     * Attach account update to the current transaction
     * -- if in a smart contract, to its children
     */
    static attachToTransaction(accountUpdate) {
        let insideContract = smart_contract_context_js_1.smartContractContext.get();
        if (insideContract) {
            let selfUpdate = insideContract.this.self;
            // avoid redundant attaching & cycle in account update structure, happens
            // when calling attachToTransaction(this.self) inside a @method
            // TODO avoid account update cycles more generally
            if (selfUpdate === accountUpdate)
                return;
            insideContract.this.self.approve(accountUpdate);
        }
        else {
            if (!transaction_context_js_1.currentTransaction.has())
                return;
            transaction_context_js_1.currentTransaction.get().layout.pushTopLevel(accountUpdate);
        }
    }
    /**
     * Disattach an account update from where it's currently located in the transaction
     */
    static unlink(accountUpdate) {
        (0, smart_contract_context_js_1.accountUpdateLayout)()?.disattach(accountUpdate);
    }
    /**
     * Creates an account update, like {@link AccountUpdate.create}, but also
     * makes sure this account update will be authorized with a signature.
     *
     * If you use this and are not relying on a wallet to sign your transaction,
     * then you should use the following code before sending your transaction:
     *
     * ```ts
     * let tx = await Mina.transaction(...); // create transaction as usual, using `createSigned()` somewhere
     * tx.sign([privateKey]); // pass the private key of this account to `sign()`!
     * ```
     *
     * Note that an account's {@link Permissions} determine which updates have to
     * be (can be) authorized by a signature.
     */
    static createSigned(publicKey, tokenId) {
        let accountUpdate = AccountUpdate.create(publicKey, tokenId);
        accountUpdate.label = accountUpdate.label.replace('.create()', '.createSigned()');
        accountUpdate.requireSignature();
        return accountUpdate;
    }
    /**
     * Use this method to pay the account creation fee for another account (or, multiple accounts using the optional second argument).
     *
     * Beware that you _don't_ need to specify the account that is created!
     * Instead, the protocol will automatically identify that accounts need to be created,
     * and require that the net balance change of the transaction covers the account creation fee.
     *
     * @param feePayer the address of the account that pays the fee
     * @param numberOfAccounts the number of new accounts to fund (default: 1)
     * @returns they {@link AccountUpdate} for the account which pays the fee
     */
    static fundNewAccount(feePayer, numberOfAccounts = 1) {
        let accountUpdate = AccountUpdate.createSigned(feePayer);
        accountUpdate.label = 'AccountUpdate.fundNewAccount()';
        let fee = mina_instance_js_1.activeInstance.getNetworkConstants().accountCreationFee;
        fee = fee.mul(numberOfAccounts);
        accountUpdate.balance.subInPlace(fee);
        return accountUpdate;
    }
    static toAuxiliary(a) {
        let aux = types_js_1.Types.AccountUpdate.toAuxiliary(a);
        let lazyAuthorization = a && a.lazyAuthorization;
        let id = a?.id ?? Math.random();
        let label = a?.label ?? '';
        return [{ lazyAuthorization, id, label }, aux];
    }
    static empty() {
        return AccountUpdate.dummy();
    }
    static fromFields(fields, [other, aux]) {
        let accountUpdate = types_js_1.Types.AccountUpdate.fromFields(fields, aux);
        return Object.assign(new AccountUpdate(accountUpdate.body, accountUpdate.authorization), other);
    }
    static fromValue(value) {
        if (value instanceof AccountUpdate)
            return value;
        let accountUpdate = types_js_1.Types.AccountUpdate.fromValue(value);
        return new AccountUpdate(accountUpdate.body, accountUpdate.authorization);
    }
    /**
     * This function acts as the `check()` method on an `AccountUpdate` that is sent to the Mina node as part of a transaction.
     *
     * Background: the Mina node performs most necessary validity checks on account updates, both in- and outside of circuits.
     * To save constraints, we don't repeat these checks in zkApps in places where we can be sure the checked account updates
     * will be part of a transaction.
     *
     * However, there are a few checks skipped by the Mina node, that could cause vulnerabilities in zkApps if
     * not checked in the zkApp proof itself. Adding these extra checks is the purpose of this function.
     */
    static clientSideOnlyChecks(au) {
        // canonical int64 representation of the balance change
        int_js_1.Int64.check(au.body.balanceChange);
    }
    static witness(resultType, compute, { skipCheck = false } = {}) {
        // construct the circuit type for a accountUpdate + other result
        let accountUpdate = skipCheck
            ? {
                ...(0, provable_derivers_js_1.provable)(AccountUpdate),
                check: AccountUpdate.clientSideOnlyChecks,
            }
            : AccountUpdate;
        let combinedType = (0, provable_derivers_js_1.provable)({ accountUpdate, result: resultType });
        return provable_js_1.Provable.witnessAsync(combinedType, compute);
    }
    /**
     * Returns a JSON representation of only the fields that differ from the
     * default {@link AccountUpdate}.
     */
    toPretty() {
        function short(s) {
            return '..' + s.slice(-4);
        }
        let jsonUpdate = (0, types_js_1.toJSONEssential)(js_layout_js_1.jsLayout.AccountUpdate, this);
        let body = jsonUpdate.body;
        delete body.callData;
        body.publicKey = short(body.publicKey);
        if (body.balanceChange?.magnitude === '0')
            delete body.balanceChange;
        if (body.tokenId === TokenId.toBase58(TokenId.default)) {
            delete body.tokenId;
        }
        else {
            body.tokenId = short(body.tokenId);
        }
        if (body.callDepth === 0)
            delete body.callDepth;
        if (body.incrementNonce === false)
            delete body.incrementNonce;
        if (body.useFullCommitment === false)
            delete body.useFullCommitment;
        if (body.implicitAccountCreationFee === false)
            delete body.implicitAccountCreationFee;
        if (body.events?.length === 0)
            delete body.events;
        if (body.actions?.length === 0)
            delete body.actions;
        if (body.preconditions?.account) {
            body.preconditions.account = JSON.stringify(body.preconditions.account);
        }
        if (body.preconditions?.network) {
            body.preconditions.network = JSON.stringify(body.preconditions.network);
        }
        if (body.preconditions?.validWhile) {
            body.preconditions.validWhile = JSON.stringify(body.preconditions.validWhile);
        }
        if (jsonUpdate.authorization?.proof) {
            jsonUpdate.authorization.proof = short(jsonUpdate.authorization.proof);
        }
        if (jsonUpdate.authorization?.signature) {
            jsonUpdate.authorization.signature = short(jsonUpdate.authorization.signature);
        }
        if (body.update?.verificationKey) {
            body.update.verificationKey = JSON.stringify({
                data: short(body.update.verificationKey.data),
                hash: short(body.update.verificationKey.hash),
            });
        }
        for (let key of ['permissions', 'appState', 'timing']) {
            if (body.update?.[key]) {
                body.update[key] = JSON.stringify(body.update[key]);
            }
        }
        for (let key of ['events', 'actions']) {
            if (body[key]) {
                body[key] = JSON.stringify(body[key]);
            }
        }
        if (body.authorizationKind?.isProved === false) {
            delete body.authorizationKind?.verificationKeyHash;
        }
        if (body.authorizationKind?.isProved === false && body.authorizationKind?.isSigned === false) {
            delete body.authorizationKind;
        }
        if (jsonUpdate.authorization !== undefined ||
            body.authorizationKind?.isProved === true ||
            body.authorizationKind?.isSigned === true) {
            body.authorization = jsonUpdate.authorization;
        }
        body.mayUseToken = {
            parentsOwnToken: this.body.mayUseToken.parentsOwnToken.toBoolean(),
            inheritFromParent: this.body.mayUseToken.inheritFromParent.toBoolean(),
        };
        let pretty = { ...body };
        let withId = false;
        if (withId)
            pretty = { id: Math.floor(this.id * 1000), ...pretty };
        if (this.label)
            pretty = { label: this.label, ...pretty };
        return pretty;
    }
}
exports.AccountUpdate = AccountUpdate;
AccountUpdate.Actions = Actions;
AccountUpdate.Events = Events;
AccountUpdate.signingInfo = (0, provable_derivers_js_1.provable)({
    isSameAsFeePayer: wrapped_js_1.Bool,
    nonce: int_js_1.UInt32,
});
// static methods that implement Provable<AccountUpdate>
AccountUpdate.sizeInFields = types_js_1.Types.AccountUpdate.sizeInFields;
AccountUpdate.toFields = types_js_1.Types.AccountUpdate.toFields;
AccountUpdate.toInput = types_js_1.Types.AccountUpdate.toInput;
AccountUpdate.check = types_js_1.Types.AccountUpdate.check;
AccountUpdate.toValue = types_js_1.Types.AccountUpdate.toValue;
AccountUpdate.MayUseToken = MayUseToken;
// call forest stuff
function hashAccountUpdate(update) {
    return (0, merkle_list_js_1.genericHash)(AccountUpdate, (0, signature_js_2.zkAppBodyPrefix)(mina_instance_js_1.activeInstance.getNetworkId()), update);
}
exports.hashAccountUpdate = hashAccountUpdate;
class HashedAccountUpdate extends packed_js_1.Hashed.create(AccountUpdate, hashAccountUpdate) {
}
exports.HashedAccountUpdate = HashedAccountUpdate;
const AccountUpdateTreeBase = (0, struct_js_1.StructNoJson)({
    id: auxiliary_js_1.RandomId,
    accountUpdate: HashedAccountUpdate,
    children: (0, merkle_list_js_1.MerkleListBase)(),
});
exports.AccountUpdateTreeBase = AccountUpdateTreeBase;
/**
 * Class which represents a forest (list of trees) of account updates,
 * in a compressed way which allows iterating and selectively witnessing the account updates.
 *
 * The (recursive) type signature is:
 * ```
 * type AccountUpdateForest = MerkleList<AccountUpdateTree>;
 * type AccountUpdateTree = {
 *   accountUpdate: Hashed<AccountUpdate>;
 *   children: AccountUpdateForest;
 * };
 * ```
 */
class AccountUpdateForest extends (_b = merkle_list_js_1.MerkleList.create(AccountUpdateTreeBase, merkleListHash)) {
    push(update) {
        return super.push(update instanceof AccountUpdate ? AccountUpdateTree.from(update) : update);
    }
    pushIf(condition, update) {
        return super.pushIf(condition, update instanceof AccountUpdate ? AccountUpdateTree.from(update) : update);
    }
    static fromFlatArray(updates) {
        let simpleForest = (0, sign_zkapp_command_js_1.accountUpdatesToCallForest)(updates);
        return this.fromSimpleForest(simpleForest);
    }
    toFlatArray(mutate = true, depth = 0) {
        return _a.toFlatArray(this, mutate, depth);
    }
    static toFlatArray(forest, mutate = true, depth = 0) {
        let flat = [];
        for (let { element: tree } of forest.data.get()) {
            let update = tree.accountUpdate.value.get();
            if (mutate)
                update.body.callDepth = depth;
            flat.push(update);
            flat.push(...this.toFlatArray(tree.children, mutate, depth + 1));
        }
        return flat;
    }
    static fromSimpleForest(simpleForest) {
        let nodes = simpleForest.map((node) => {
            let accountUpdate = HashedAccountUpdate.hash(node.accountUpdate);
            let children = _a.fromSimpleForest(node.children);
            return { accountUpdate, children, id: node.accountUpdate.id };
        });
        return _a.fromReverse(nodes);
    }
    // TODO this comes from paranoia and might be removed later
    static assertConstant(forest) {
        provable_js_1.Provable.asProver(() => {
            forest.data.get().forEach(({ element: tree }) => {
                (0, assert_js_1.assert)(provable_js_1.Provable.isConstant(AccountUpdate, tree.accountUpdate.value.get()), 'account update not constant');
                _a.assertConstant(tree.children);
            });
        });
    }
    // fix static methods
    static empty() {
        return _a.provable.empty();
    }
    static from(array) {
        return new _a(super.from(array));
    }
    static fromReverse(array) {
        return new _a(super.fromReverse(array));
    }
}
exports.AccountUpdateForest = AccountUpdateForest;
_a = AccountUpdateForest;
AccountUpdateForest.provable = (0, provable_derivers_js_1.provableExtends)(_a, Reflect.get(_b, "provable", _a));
/**
 * Class which represents a tree of account updates,
 * in a compressed way which allows iterating and selectively witnessing the account updates.
 *
 * The (recursive) type signature is:
 * ```
 * type AccountUpdateTree = {
 *   accountUpdate: Hashed<AccountUpdate>;
 *   children: AccountUpdateForest;
 * };
 * type AccountUpdateForest = MerkleList<AccountUpdateTree>;
 * ```
 */
class AccountUpdateTree extends (0, struct_js_1.StructNoJson)({
    id: auxiliary_js_1.RandomId,
    accountUpdate: HashedAccountUpdate,
    children: AccountUpdateForest,
}) {
    /**
     * Create a tree of account updates which only consists of a root.
     */
    static from(update, hash) {
        if (update instanceof AccountUpdateTree)
            return update;
        return new AccountUpdateTree({
            accountUpdate: HashedAccountUpdate.hash(update, hash),
            id: update.id,
            children: AccountUpdateForest.empty(),
        });
    }
    /**
     * Add an {@link AccountUpdate} or {@link AccountUpdateTree} to the children of this tree's root.
     *
     * See {@link AccountUpdate.approve}.
     */
    approve(update, hash) {
        (0, smart_contract_context_js_1.accountUpdateLayout)()?.disattach(update);
        if (update instanceof AccountUpdate) {
            this.children.pushIf(update.isDummy().not(), AccountUpdateTree.from(update, hash));
        }
        else {
            this.children.push(update);
        }
    }
    // fix Struct type
    static fromFields(fields, aux) {
        return new AccountUpdateTree(super.fromFields(fields, aux));
    }
    static empty() {
        return new AccountUpdateTree(super.empty());
    }
}
exports.AccountUpdateTree = AccountUpdateTree;
// how to hash a forest
function merkleListHash(forestHash, tree) {
    return hashCons(forestHash, hashNode(tree));
}
function hashNode(tree) {
    return poseidon_js_1.Poseidon.hashWithPrefix(constants_js_1.prefixes.accountUpdateNode, [
        tree.accountUpdate.hash,
        tree.children.hash,
    ]);
}
function hashCons(forestHash, nodeHash) {
    return poseidon_js_1.Poseidon.hashWithPrefix(constants_js_1.prefixes.accountUpdateCons, [nodeHash, forestHash]);
}
class UnfinishedForest {
    isFinal() {
        return this.final !== undefined;
    }
    isMutable() {
        return this.mutable !== undefined;
    }
    constructor(mutable, final) {
        (0, assert_js_1.assert)((final === undefined) !== (mutable === undefined), 'final or mutable');
        this.final = final;
        this.mutable = mutable;
    }
    static empty() {
        return new UnfinishedForest([]);
    }
    setFinal(final) {
        return Object.assign(this, { final, mutable: undefined });
    }
    finalize() {
        if (this.isFinal())
            return this.final;
        (0, assert_js_1.assert)(this.isMutable(), 'final or mutable');
        let nodes = this.mutable.map(UnfinishedTree.finalize);
        let finalForest = AccountUpdateForest.empty();
        for (let { isDummy, ...tree } of [...nodes].reverse()) {
            finalForest.pushIf(isDummy.not(), tree);
        }
        this.setFinal(finalForest);
        return finalForest;
    }
    witnessHash() {
        let final = provable_js_1.Provable.witness(AccountUpdateForest, () => this.finalize());
        return this.setFinal(final);
    }
    push(node) {
        if (node.siblings === this)
            return;
        (0, assert_js_1.assert)(node.siblings === undefined, 'Cannot push node that already has a parent.');
        node.siblings = this;
        (0, assert_js_1.assert)(this.isMutable(), 'Cannot push to an immutable forest');
        this.mutable.push(node);
    }
    remove(node) {
        (0, assert_js_1.assert)(this.isMutable(), 'Cannot remove from an immutable forest');
        // find by .id
        let index = this.mutable.findIndex((n) => n.id === node.id);
        // nothing to do if it's not there
        if (index === -1)
            return;
        // remove it
        node.siblings = undefined;
        this.mutable.splice(index, 1);
    }
    setToForest(forest) {
        if (this.isMutable()) {
            (0, assert_js_1.assert)(this.mutable.length === 0, 'Replacing a mutable forest that has existing children might be a mistake.');
        }
        return this.setFinal(new AccountUpdateForest(forest));
    }
    static fromForest(forest) {
        return UnfinishedForest.empty().setToForest(forest);
    }
    toFlatArray(mutate = true, depth = 0) {
        if (this.isFinal())
            return this.final.toFlatArray(mutate, depth);
        (0, assert_js_1.assert)(this.isMutable(), 'final or mutable');
        let flatUpdates = [];
        for (let node of this.mutable) {
            if (node.isDummy.toBoolean())
                continue;
            let update = node.mutable ?? node.final.value.get();
            if (mutate)
                update.body.callDepth = depth;
            let children = node.children.toFlatArray(mutate, depth + 1);
            flatUpdates.push(update, ...children);
        }
        return flatUpdates;
    }
    toConstantInPlace() {
        if (this.isFinal()) {
            this.final.hash = this.final.hash.toConstant();
            return;
        }
        (0, assert_js_1.assert)(this.isMutable(), 'final or mutable');
        for (let node of this.mutable) {
            if (node.mutable !== undefined) {
                node.mutable = provable_js_1.Provable.toConstant(AccountUpdate, node.mutable);
            }
            else {
                node.final.hash = node.final.hash.toConstant();
            }
            node.isDummy = provable_js_1.Provable.toConstant(wrapped_js_1.Bool, node.isDummy);
            node.children.toConstantInPlace();
        }
    }
    print() {
        let indent = 0;
        let layout = '';
        let toPretty = (a) => {
            if (a.isFinal()) {
                layout += ' '.repeat(indent) + ' ( finalized forest )\n';
                return;
            }
            (0, assert_js_1.assert)(a.isMutable(), 'final or mutable');
            indent += 2;
            for (let tree of a.mutable) {
                let label = tree.mutable?.label || '<no label>';
                if (tree.final !== undefined) {
                    provable_js_1.Provable.asProver(() => (label = tree.final.value.get().label));
                }
                layout += ' '.repeat(indent) + `( ${label} )` + '\n';
                toPretty(tree.children);
            }
            indent -= 2;
        };
        toPretty(this);
        console.log(layout);
    }
}
const UnfinishedTree = {
    create(update) {
        if (update instanceof AccountUpdate) {
            return {
                mutable: update,
                id: update.id,
                isDummy: update.isDummy(),
                children: UnfinishedForest.empty(),
            };
        }
        return {
            final: update.accountUpdate,
            id: update.id,
            isDummy: (0, wrapped_js_1.Bool)(false),
            children: UnfinishedForest.fromForest(update.children),
        };
    },
    setTo(node, update) {
        if (update instanceof AccountUpdate) {
            if (node.final !== undefined) {
                Object.assign(node, {
                    mutable: update,
                    final: undefined,
                    children: UnfinishedForest.empty(),
                });
            }
        }
        else if (node.mutable !== undefined) {
            Object.assign(node, {
                mutable: undefined,
                final: update.accountUpdate,
                children: UnfinishedForest.fromForest(update.children),
            });
        }
    },
    finalize(node) {
        let accountUpdate = node.final ?? HashedAccountUpdate.hash(node.mutable);
        let children = node.children.finalize();
        return { accountUpdate, id: node.id, isDummy: node.isDummy, children };
    },
    isUnfinished(input) {
        return 'final' in input || 'mutable' in input;
    },
};
class AccountUpdateLayout {
    constructor(root) {
        this.map = new Map();
        root ?? (root = AccountUpdate.dummy());
        let rootTree = {
            mutable: root,
            id: root.id,
            isDummy: (0, wrapped_js_1.Bool)(false),
            children: UnfinishedForest.empty(),
        };
        this.map.set(root.id, rootTree);
        this.root = rootTree;
    }
    get(update) {
        return this.map.get(update.id);
    }
    getOrCreate(update) {
        if (UnfinishedTree.isUnfinished(update)) {
            if (!this.map.has(update.id)) {
                this.map.set(update.id, update);
            }
            return update;
        }
        let node = this.map.get(update.id);
        if (node !== undefined) {
            // might have to change node
            UnfinishedTree.setTo(node, update);
            return node;
        }
        node = UnfinishedTree.create(update);
        this.map.set(update.id, node);
        return node;
    }
    pushChild(parent, child) {
        let parentNode = this.getOrCreate(parent);
        let childNode = this.getOrCreate(child);
        parentNode.children.push(childNode);
    }
    pushTopLevel(child) {
        this.pushChild(this.root, child);
    }
    setChildren(parent, children) {
        let parentNode = this.getOrCreate(parent);
        parentNode.children.setToForest(children);
    }
    setTopLevel(children) {
        this.setChildren(this.root, children);
    }
    disattach(update) {
        let node = this.get(update);
        node?.siblings?.remove(node);
        return node;
    }
    finalizeAndRemove(update) {
        let node = this.get(update);
        if (node === undefined)
            return;
        this.disattach(update);
        return node.children.finalize();
    }
    finalizeChildren() {
        let final = this.root.children.finalize();
        this.final = final;
        AccountUpdateForest.assertConstant(final);
        return final;
    }
    toFlatList({ mutate }) {
        return this.root.children.toFlatArray(mutate);
    }
    forEachPredecessor(update, callback) {
        let updates = this.toFlatList({ mutate: false });
        for (let otherUpdate of updates) {
            if (otherUpdate.id === update.id)
                return;
            callback(otherUpdate);
        }
    }
    toConstantInPlace() {
        this.root.children.toConstantInPlace();
    }
}
exports.AccountUpdateLayout = AccountUpdateLayout;
const ZkappCommand = {
    toPretty(transaction) {
        let feePayer = ZkappCommand.toJSON(transaction).feePayer;
        feePayer.body.publicKey = '..' + feePayer.body.publicKey.slice(-4);
        feePayer.body.authorization = '..' + feePayer.authorization.slice(-4);
        if (feePayer.body.validUntil === null)
            delete feePayer.body.validUntil;
        return [
            { label: 'feePayer', ...feePayer.body },
            ...transaction.accountUpdates.map((a) => a.toPretty()),
        ];
    },
    fromJSON(json) {
        let { feePayer } = types_js_1.Types.ZkappCommand.fromJSON({
            feePayer: json.feePayer,
            accountUpdates: [],
            memo: json.memo,
        });
        let memo = memo_js_1.Memo.toString(memo_js_1.Memo.fromBase58(json.memo));
        let accountUpdates = json.accountUpdates.map(AccountUpdate.fromJSON);
        return { feePayer, accountUpdates, memo };
    },
    toJSON({ feePayer, accountUpdates, memo }) {
        memo = memo_js_1.Memo.toBase58(memo_js_1.Memo.fromString(memo));
        return types_js_1.Types.ZkappCommand.toJSON({ feePayer, accountUpdates, memo });
    },
};
exports.ZkappCommand = ZkappCommand;
const Authorization = {
    hasLazyProof(accountUpdate) {
        return accountUpdate.lazyAuthorization?.kind === 'lazy-proof';
    },
    hasAny(accountUpdate) {
        let { authorization: auth, lazyAuthorization: lazyAuth } = accountUpdate;
        return !!(lazyAuth || 'proof' in auth || 'signature' in auth);
    },
    setSignature(accountUpdate, signature) {
        accountUpdate.authorization = { signature };
        accountUpdate.lazyAuthorization = undefined;
    },
    setProof(accountUpdate, proof) {
        accountUpdate.authorization = { proof };
        accountUpdate.lazyAuthorization = undefined;
        return accountUpdate;
    },
    setLazySignature(accountUpdate) {
        accountUpdate.body.authorizationKind.isSigned = (0, wrapped_js_1.Bool)(true);
        accountUpdate.body.authorizationKind.isProved = (0, wrapped_js_1.Bool)(false);
        accountUpdate.body.authorizationKind.verificationKeyHash = (0, wrapped_js_1.Field)(constants_js_1.mocks.dummyVerificationKeyHash);
        accountUpdate.authorization = {};
        accountUpdate.lazyAuthorization = { kind: 'lazy-signature' };
    },
    setLazyNone(accountUpdate) {
        accountUpdate.body.authorizationKind.isSigned = (0, wrapped_js_1.Bool)(false);
        accountUpdate.body.authorizationKind.isProved = (0, wrapped_js_1.Bool)(false);
        accountUpdate.body.authorizationKind.verificationKeyHash = (0, wrapped_js_1.Field)(constants_js_1.mocks.dummyVerificationKeyHash);
        accountUpdate.authorization = {};
        accountUpdate.lazyAuthorization = { kind: 'lazy-none' };
    },
};
exports.Authorization = Authorization;
function addMissingSignatures(zkappCommand, privateKeys) {
    let additionalPublicKeys = privateKeys.map((sk) => sk.toPublicKey());
    let { commitment, fullCommitment } = (0, sign_zkapp_command_js_1.transactionCommitments)({
        ...types_js_1.Types.ZkappCommand.toValue(zkappCommand),
        // TODO: represent memo in encoded form already?
        memo: memo_js_1.Memo.toBase58(memo_js_1.Memo.fromString(zkappCommand.memo)),
    }, mina_instance_js_1.activeInstance.getNetworkId());
    function addFeePayerSignature(accountUpdate) {
        let { body, authorization, lazyAuthorization } = (0, struct_js_1.cloneCircuitValue)(accountUpdate);
        if (lazyAuthorization === undefined)
            return { body, authorization };
        let i = additionalPublicKeys.findIndex((pk) => pk.equals(accountUpdate.body.publicKey).toBoolean());
        if (i === -1) {
            // private key is missing, but we are not throwing an error here
            // there is a change signature will be added by the wallet
            // if not, error will be thrown by verifyAccountUpdate
            // while .send() execution
            return { body, authorization: dummySignature() };
        }
        let privateKey = privateKeys[i];
        let signature = (0, signature_js_2.signFieldElement)(fullCommitment, privateKey.toBigInt(), mina_instance_js_1.activeInstance.getNetworkId());
        return { body, authorization: signature_js_2.Signature.toBase58(signature) };
    }
    function addSignature(accountUpdate) {
        accountUpdate = AccountUpdate.clone(accountUpdate);
        if (accountUpdate.lazyAuthorization?.kind !== 'lazy-signature') {
            return accountUpdate;
        }
        let i = additionalPublicKeys.findIndex((pk) => pk.equals(accountUpdate.body.publicKey).toBoolean());
        if (i === -1) {
            // private key is missing, but we are not throwing an error here
            // there is a change signature will be added by the wallet
            // if not, error will be thrown by verifyAccountUpdate
            // while .send() execution
            Authorization.setSignature(accountUpdate, dummySignature());
            return accountUpdate;
        }
        let privateKey = privateKeys[i];
        let transactionCommitment = accountUpdate.body.useFullCommitment.toBoolean()
            ? fullCommitment
            : commitment;
        let signature = (0, signature_js_2.signFieldElement)(transactionCommitment, privateKey.toBigInt(), mina_instance_js_1.activeInstance.getNetworkId());
        Authorization.setSignature(accountUpdate, signature_js_2.Signature.toBase58(signature));
        return accountUpdate;
    }
    let { feePayer, accountUpdates, memo } = zkappCommand;
    return {
        feePayer: addFeePayerSignature(feePayer),
        accountUpdates: accountUpdates.map(addSignature),
        memo,
    };
}
exports.addMissingSignatures = addMissingSignatures;
function dummySignature() {
    return signature_js_2.Signature.toBase58(signature_js_2.Signature.dummy());
}
exports.dummySignature = dummySignature;
let ZkappPublicInput = (0, provable_derivers_js_1.provablePure)({ accountUpdate: wrapped_js_1.Field, calls: wrapped_js_1.Field });
exports.ZkappPublicInput = ZkappPublicInput;
async function addMissingProofs(zkappCommand, { proofsEnabled = true }) {
    let { feePayer, accountUpdates, memo } = zkappCommand;
    // compute proofs serially. in parallel would clash with our global variable
    // hacks
    let accountUpdatesProved = [];
    let proofs = [];
    for (let i = 0; i < accountUpdates.length; i++) {
        let { accountUpdateProved, proof } = await addProof(zkappCommand, i, proofsEnabled);
        accountUpdatesProved.push(accountUpdateProved);
        proofs.push(proof);
    }
    return {
        zkappCommand: { feePayer, accountUpdates: accountUpdatesProved, memo },
        proofs,
    };
}
exports.addMissingProofs = addMissingProofs;
async function addProof(transaction, index, proofsEnabled) {
    let accountUpdate = transaction.accountUpdates[index];
    accountUpdate = AccountUpdate.clone(accountUpdate);
    if (accountUpdate.lazyAuthorization?.kind !== 'lazy-proof') {
        return {
            accountUpdateProved: accountUpdate,
            proof: undefined,
        };
    }
    if (!proofsEnabled) {
        Authorization.setProof(accountUpdate, await (0, zkprogram_js_1.dummyBase64Proof)());
        return {
            accountUpdateProved: accountUpdate,
            proof: undefined,
        };
    }
    let lazyProof = accountUpdate.lazyAuthorization;
    let prover = getZkappProver(lazyProof);
    let proverData = { transaction, accountUpdate, index };
    let proof = await createZkappProof(prover, lazyProof, proverData);
    let accountUpdateProved = Authorization.setProof(accountUpdate, bindings_js_1.Pickles.proofToBase64Transaction(proof.proof));
    return { accountUpdateProved, proof };
}
async function createZkappProof(prover, { methodName, args, ZkappClass, memoized, blindingValue }, { transaction, accountUpdate, index }) {
    let publicInput = accountUpdate.toPublicInput(transaction);
    let publicInputFields = fields_js_1.MlFieldConstArray.to(ZkappPublicInput.toFields(publicInput));
    let [, , proof] = await zkAppProver.run([accountUpdate.publicKey, accountUpdate.tokenId, ...args], { transaction, accountUpdate, index }, async () => {
        let id = provable_js_1.memoizationContext.enter({
            memoized,
            currentIndex: 0,
            blindingValue,
        });
        try {
            return await prover(publicInputFields);
        }
        catch (err) {
            console.error(`Error when proving ${ZkappClass.name}.${methodName}()`);
            throw err;
        }
        finally {
            provable_js_1.memoizationContext.leave(id);
        }
    });
    let maxProofsVerified = await ZkappClass.getMaxProofsVerified();
    const Proof = ZkappClass.Proof();
    return new Proof({
        publicInput,
        publicOutput: undefined,
        proof,
        maxProofsVerified,
    });
}
function getZkappProver({ methodName, ZkappClass }) {
    if (ZkappClass._provers === undefined)
        throw Error(`Cannot prove execution of ${methodName}(), no prover found. ` +
            `Try calling \`await ${ZkappClass.name}.compile()\` first, this will cache provers in the background.`);
    let provers = ZkappClass._provers;
    let methodError = `Error when computing proofs: Method ${methodName} not found. ` +
        `Make sure your environment supports decorators, and annotate with \`@method ${methodName}\`.`;
    if (ZkappClass._methods === undefined)
        throw Error(methodError);
    let i = ZkappClass._methods.findIndex((m) => m.methodName === methodName);
    if (i === -1)
        throw Error(methodError);
    return provers[i];
}
