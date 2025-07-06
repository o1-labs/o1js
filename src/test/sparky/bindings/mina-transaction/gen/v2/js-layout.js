"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZkappAccount = exports.AccountTiming = exports.Account = exports.Control = exports.AuthorizationKindStructured = exports.MayUseToken = exports.AccountPrecondition = exports.EpochLedgerPrecondition = exports.EpochDataPrecondition = exports.NetworkPrecondition = exports.Preconditions = exports.Timing = exports.VerificationKeyPermission = exports.Permissions = exports.VerificationKeyWithHash = exports.AccountUpdateModification = exports.AccountUpdateBody = exports.ZkappAccountUpdate = exports.FeePayerBody = exports.ZkappFeePayer = exports.ZkappCommand = exports.Types = void 0;
// @generated this file is auto-generated - don't edit it directly
const schema_js_1 = require("../../v2/schema.js");
const FeePayerBody = new schema_js_1.BindingsType.Object({
    name: 'FeePayerBody',
    keys: ['publicKey', 'fee', 'validUntil', 'nonce'],
    entries: {
        publicKey: new schema_js_1.BindingsType.Leaf.PublicKey(),
        fee: new schema_js_1.BindingsType.Leaf.UInt64(),
        validUntil: new schema_js_1.BindingsType.Option.OrUndefined(new schema_js_1.BindingsType.Leaf.UInt32()),
        nonce: new schema_js_1.BindingsType.Leaf.UInt32(),
    },
});
exports.FeePayerBody = FeePayerBody;
const VerificationKeyWithHash = new schema_js_1.BindingsType.Object({
    name: 'VerificationKeyWithHash',
    keys: ['data', 'hash'],
    entries: { data: new schema_js_1.BindingsType.Leaf.String(), hash: new schema_js_1.BindingsType.Leaf.Field() },
});
exports.VerificationKeyWithHash = VerificationKeyWithHash;
const VerificationKeyPermission = new schema_js_1.BindingsType.Object({
    name: 'VerificationKeyPermission',
    keys: ['auth', 'txnVersion'],
    entries: {
        auth: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        txnVersion: new schema_js_1.BindingsType.Leaf.UInt32(),
    },
});
exports.VerificationKeyPermission = VerificationKeyPermission;
const Timing = new schema_js_1.BindingsType.Object({
    name: 'Timing',
    keys: ['initialMinimumBalance', 'cliffTime', 'cliffAmount', 'vestingPeriod', 'vestingIncrement'],
    entries: {
        initialMinimumBalance: new schema_js_1.BindingsType.Leaf.UInt64(),
        cliffTime: new schema_js_1.BindingsType.Leaf.UInt32(),
        cliffAmount: new schema_js_1.BindingsType.Leaf.UInt64(),
        vestingPeriod: new schema_js_1.BindingsType.Leaf.UInt32(),
        vestingIncrement: new schema_js_1.BindingsType.Leaf.UInt64(),
    },
});
exports.Timing = Timing;
const EpochLedgerPrecondition = new schema_js_1.BindingsType.Object({
    name: 'EpochLedgerPrecondition',
    keys: ['hash', 'totalCurrency'],
    entries: {
        hash: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Field()),
        totalCurrency: new schema_js_1.BindingsType.Option.ClosedInterval(new schema_js_1.BindingsType.Leaf.UInt64()),
    },
});
exports.EpochLedgerPrecondition = EpochLedgerPrecondition;
const AccountPrecondition = new schema_js_1.BindingsType.Object({
    name: 'AccountPrecondition',
    keys: [
        'balance',
        'nonce',
        'receiptChainHash',
        'delegate',
        'state',
        'actionState',
        'provedState',
        'isNew',
    ],
    entries: {
        balance: new schema_js_1.BindingsType.Option.ClosedInterval(new schema_js_1.BindingsType.Leaf.UInt64()),
        nonce: new schema_js_1.BindingsType.Option.ClosedInterval(new schema_js_1.BindingsType.Leaf.UInt32()),
        receiptChainHash: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Field()),
        delegate: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.PublicKey()),
        state: new schema_js_1.BindingsType.Array({
            staticLength: 8,
            inner: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Field()),
        }),
        actionState: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Field()),
        provedState: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Bool()),
        isNew: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Bool()),
    },
});
exports.AccountPrecondition = AccountPrecondition;
const MayUseToken = new schema_js_1.BindingsType.Object({
    name: 'MayUseToken',
    keys: ['parentsOwnToken', 'inheritFromParent'],
    entries: {
        parentsOwnToken: new schema_js_1.BindingsType.Leaf.Bool(),
        inheritFromParent: new schema_js_1.BindingsType.Leaf.Bool(),
    },
});
exports.MayUseToken = MayUseToken;
const AuthorizationKindStructured = new schema_js_1.BindingsType.Object({
    name: 'AuthorizationKindStructured',
    keys: ['isSigned', 'isProved', 'verificationKeyHash'],
    entries: {
        isSigned: new schema_js_1.BindingsType.Leaf.Bool(),
        isProved: new schema_js_1.BindingsType.Leaf.Bool(),
        verificationKeyHash: new schema_js_1.BindingsType.Leaf.Field(),
    },
});
exports.AuthorizationKindStructured = AuthorizationKindStructured;
const Control = new schema_js_1.BindingsType.Object({
    name: 'Control',
    keys: ['proof', 'signature'],
    entries: {
        proof: new schema_js_1.BindingsType.Option.OrUndefined(new schema_js_1.BindingsType.Leaf.String()),
        signature: new schema_js_1.BindingsType.Option.OrUndefined(new schema_js_1.BindingsType.Leaf.String()),
    },
});
exports.Control = Control;
const AccountTiming = new schema_js_1.BindingsType.Object({
    name: 'AccountTiming',
    keys: [
        'isTimed',
        'initialMinimumBalance',
        'cliffTime',
        'cliffAmount',
        'vestingPeriod',
        'vestingIncrement',
    ],
    entries: {
        isTimed: new schema_js_1.BindingsType.Leaf.Bool(),
        initialMinimumBalance: new schema_js_1.BindingsType.Leaf.UInt64(),
        cliffTime: new schema_js_1.BindingsType.Leaf.UInt32(),
        cliffAmount: new schema_js_1.BindingsType.Leaf.UInt64(),
        vestingPeriod: new schema_js_1.BindingsType.Leaf.UInt32(),
        vestingIncrement: new schema_js_1.BindingsType.Leaf.UInt64(),
    },
});
exports.AccountTiming = AccountTiming;
const ZkappFeePayer = new schema_js_1.BindingsType.Object({
    name: 'ZkappFeePayer',
    keys: ['body', 'authorization'],
    entries: { body: FeePayerBody, authorization: new schema_js_1.BindingsType.Leaf.String() },
});
exports.ZkappFeePayer = ZkappFeePayer;
const Permissions = new schema_js_1.BindingsType.Object({
    name: 'Permissions',
    keys: [
        'editState',
        'access',
        'send',
        'receive',
        'setDelegate',
        'setPermissions',
        'setVerificationKey',
        'setZkappUri',
        'editActionState',
        'setTokenSymbol',
        'incrementNonce',
        'setVotingFor',
        'setTiming',
    ],
    entries: {
        editState: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        access: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        send: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        receive: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        setDelegate: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        setPermissions: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        setVerificationKey: VerificationKeyPermission,
        setZkappUri: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        editActionState: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        setTokenSymbol: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        incrementNonce: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        setVotingFor: new schema_js_1.BindingsType.Leaf.AuthRequired(),
        setTiming: new schema_js_1.BindingsType.Leaf.AuthRequired(),
    },
});
exports.Permissions = Permissions;
const EpochDataPrecondition = new schema_js_1.BindingsType.Object({
    name: 'EpochDataPrecondition',
    keys: ['ledger', 'seed', 'startCheckpoint', 'lockCheckpoint', 'epochLength'],
    entries: {
        ledger: EpochLedgerPrecondition,
        seed: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Field()),
        startCheckpoint: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Field()),
        lockCheckpoint: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Field()),
        epochLength: new schema_js_1.BindingsType.Option.ClosedInterval(new schema_js_1.BindingsType.Leaf.UInt32()),
    },
});
exports.EpochDataPrecondition = EpochDataPrecondition;
const ZkappAccount = new schema_js_1.BindingsType.Object({
    name: 'ZkappAccount',
    keys: [
        'appState',
        'verificationKey',
        'zkappVersion',
        'actionState',
        'lastActionSlot',
        'provedState',
        'zkappUri',
    ],
    entries: {
        appState: new schema_js_1.BindingsType.Array({
            staticLength: 8,
            inner: new schema_js_1.BindingsType.Leaf.Field(),
        }),
        verificationKey: new schema_js_1.BindingsType.Option.OrUndefined(VerificationKeyWithHash),
        zkappVersion: new schema_js_1.BindingsType.Leaf.UInt32(),
        actionState: new schema_js_1.BindingsType.Array({
            staticLength: 5,
            inner: new schema_js_1.BindingsType.Leaf.Field(),
        }),
        lastActionSlot: new schema_js_1.BindingsType.Leaf.UInt32(),
        provedState: new schema_js_1.BindingsType.Leaf.Bool(),
        zkappUri: new schema_js_1.BindingsType.Leaf.String(),
    },
});
exports.ZkappAccount = ZkappAccount;
const AccountUpdateModification = new schema_js_1.BindingsType.Object({
    name: 'AccountUpdateModification',
    keys: [
        'appState',
        'delegate',
        'verificationKey',
        'permissions',
        'zkappUri',
        'tokenSymbol',
        'timing',
        'votingFor',
    ],
    entries: {
        appState: new schema_js_1.BindingsType.Array({
            staticLength: 8,
            inner: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Field()),
        }),
        delegate: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.PublicKey()),
        verificationKey: new schema_js_1.BindingsType.Option.Flagged(VerificationKeyWithHash),
        permissions: new schema_js_1.BindingsType.Option.Flagged(Permissions),
        zkappUri: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.ZkappUri()),
        tokenSymbol: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.TokenSymbol()),
        timing: new schema_js_1.BindingsType.Option.Flagged(Timing),
        votingFor: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.StateHash()),
    },
});
exports.AccountUpdateModification = AccountUpdateModification;
const NetworkPrecondition = new schema_js_1.BindingsType.Object({
    name: 'NetworkPrecondition',
    keys: [
        'snarkedLedgerHash',
        'blockchainLength',
        'minWindowDensity',
        'totalCurrency',
        'globalSlotSinceGenesis',
        'stakingEpochData',
        'nextEpochData',
    ],
    entries: {
        snarkedLedgerHash: new schema_js_1.BindingsType.Option.Flagged(new schema_js_1.BindingsType.Leaf.Field()),
        blockchainLength: new schema_js_1.BindingsType.Option.ClosedInterval(new schema_js_1.BindingsType.Leaf.UInt32()),
        minWindowDensity: new schema_js_1.BindingsType.Option.ClosedInterval(new schema_js_1.BindingsType.Leaf.UInt32()),
        totalCurrency: new schema_js_1.BindingsType.Option.ClosedInterval(new schema_js_1.BindingsType.Leaf.UInt64()),
        globalSlotSinceGenesis: new schema_js_1.BindingsType.Option.ClosedInterval(new schema_js_1.BindingsType.Leaf.UInt32()),
        stakingEpochData: EpochDataPrecondition,
        nextEpochData: EpochDataPrecondition,
    },
});
exports.NetworkPrecondition = NetworkPrecondition;
const Account = new schema_js_1.BindingsType.Object({
    name: 'Account',
    keys: [
        'publicKey',
        'tokenId',
        'tokenSymbol',
        'balance',
        'nonce',
        'receiptChainHash',
        'delegate',
        'votingFor',
        'timing',
        'permissions',
        'zkapp',
    ],
    entries: {
        publicKey: new schema_js_1.BindingsType.Leaf.PublicKey(),
        tokenId: new schema_js_1.BindingsType.Leaf.TokenId(),
        tokenSymbol: new schema_js_1.BindingsType.Leaf.String(),
        balance: new schema_js_1.BindingsType.Leaf.UInt64(),
        nonce: new schema_js_1.BindingsType.Leaf.UInt32(),
        receiptChainHash: new schema_js_1.BindingsType.Leaf.Field(),
        delegate: new schema_js_1.BindingsType.Option.OrUndefined(new schema_js_1.BindingsType.Leaf.PublicKey()),
        votingFor: new schema_js_1.BindingsType.Leaf.Field(),
        timing: AccountTiming,
        permissions: Permissions,
        zkapp: new schema_js_1.BindingsType.Option.OrUndefined(ZkappAccount),
    },
});
exports.Account = Account;
const Preconditions = new schema_js_1.BindingsType.Object({
    name: 'Preconditions',
    keys: ['network', 'account', 'validWhile'],
    entries: {
        network: NetworkPrecondition,
        account: AccountPrecondition,
        validWhile: new schema_js_1.BindingsType.Option.ClosedInterval(new schema_js_1.BindingsType.Leaf.UInt32()),
    },
});
exports.Preconditions = Preconditions;
const AccountUpdateBody = new schema_js_1.BindingsType.Object({
    name: 'AccountUpdateBody',
    keys: [
        'publicKey',
        'tokenId',
        'update',
        'balanceChange',
        'incrementNonce',
        'events',
        'actions',
        'callData',
        'callDepth',
        'preconditions',
        'useFullCommitment',
        'implicitAccountCreationFee',
        'mayUseToken',
        'authorizationKind',
    ],
    entries: {
        publicKey: new schema_js_1.BindingsType.Leaf.PublicKey(),
        tokenId: new schema_js_1.BindingsType.Leaf.TokenId(),
        update: AccountUpdateModification,
        balanceChange: new schema_js_1.BindingsType.Leaf.Int64(),
        incrementNonce: new schema_js_1.BindingsType.Leaf.Bool(),
        events: new schema_js_1.BindingsType.Leaf.Events(),
        actions: new schema_js_1.BindingsType.Leaf.Actions(),
        callData: new schema_js_1.BindingsType.Leaf.Field(),
        callDepth: new schema_js_1.BindingsType.Leaf.Number(),
        preconditions: Preconditions,
        useFullCommitment: new schema_js_1.BindingsType.Leaf.Bool(),
        implicitAccountCreationFee: new schema_js_1.BindingsType.Leaf.Bool(),
        mayUseToken: MayUseToken,
        authorizationKind: AuthorizationKindStructured,
    },
});
exports.AccountUpdateBody = AccountUpdateBody;
const ZkappAccountUpdate = new schema_js_1.BindingsType.Object({
    name: 'ZkappAccountUpdate',
    keys: ['body', 'authorization'],
    entries: { body: AccountUpdateBody, authorization: Control },
});
exports.ZkappAccountUpdate = ZkappAccountUpdate;
const ZkappCommand = new schema_js_1.BindingsType.Object({
    name: 'ZkappCommand',
    keys: ['feePayer', 'accountUpdates', 'memo'],
    entries: {
        feePayer: ZkappFeePayer,
        accountUpdates: new schema_js_1.BindingsType.Array({
            staticLength: null,
            inner: ZkappAccountUpdate,
        }),
        memo: new schema_js_1.BindingsType.Leaf.String(),
    },
});
exports.ZkappCommand = ZkappCommand;
const Types = {
    ZkappCommand,
    ZkappFeePayer,
    FeePayerBody,
    ZkappAccountUpdate,
    AccountUpdateBody,
    AccountUpdateModification,
    VerificationKeyWithHash,
    Permissions,
    VerificationKeyPermission,
    Timing,
    Preconditions,
    NetworkPrecondition,
    EpochDataPrecondition,
    EpochLedgerPrecondition,
    AccountPrecondition,
    MayUseToken,
    AuthorizationKindStructured,
    Control,
    Account,
    AccountTiming,
    ZkappAccount,
};
exports.Types = Types;
