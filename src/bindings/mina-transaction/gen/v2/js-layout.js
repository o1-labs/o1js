// @generated this file is auto-generated - don't edit it directly
import { BindingsType } from '../../v2/schema.js';
export { Types, ZkappCommand, ZkappFeePayer, FeePayerBody, ZkappAccountUpdate, AccountUpdateBody, AccountUpdateModification, VerificationKeyWithHash, Permissions, VerificationKeyPermission, Timing, Preconditions, NetworkPrecondition, EpochDataPrecondition, EpochLedgerPrecondition, AccountPrecondition, MayUseToken, AuthorizationKindStructured, Control, Account, AccountTiming, ZkappAccount, };
const FeePayerBody = new BindingsType.Object({
    name: 'FeePayerBody',
    keys: ['publicKey', 'fee', 'validUntil', 'nonce'],
    entries: {
        publicKey: new BindingsType.Leaf.PublicKey(),
        fee: new BindingsType.Leaf.UInt64(),
        validUntil: new BindingsType.Option.OrUndefined(new BindingsType.Leaf.UInt32()),
        nonce: new BindingsType.Leaf.UInt32(),
    },
});
const VerificationKeyWithHash = new BindingsType.Object({
    name: 'VerificationKeyWithHash',
    keys: ['data', 'hash'],
    entries: { data: new BindingsType.Leaf.String(), hash: new BindingsType.Leaf.Field() },
});
const VerificationKeyPermission = new BindingsType.Object({
    name: 'VerificationKeyPermission',
    keys: ['auth', 'txnVersion'],
    entries: {
        auth: new BindingsType.Leaf.AuthRequired(),
        txnVersion: new BindingsType.Leaf.UInt32(),
    },
});
const Timing = new BindingsType.Object({
    name: 'Timing',
    keys: ['initialMinimumBalance', 'cliffTime', 'cliffAmount', 'vestingPeriod', 'vestingIncrement'],
    entries: {
        initialMinimumBalance: new BindingsType.Leaf.UInt64(),
        cliffTime: new BindingsType.Leaf.UInt32(),
        cliffAmount: new BindingsType.Leaf.UInt64(),
        vestingPeriod: new BindingsType.Leaf.UInt32(),
        vestingIncrement: new BindingsType.Leaf.UInt64(),
    },
});
const EpochLedgerPrecondition = new BindingsType.Object({
    name: 'EpochLedgerPrecondition',
    keys: ['hash', 'totalCurrency'],
    entries: {
        hash: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
        totalCurrency: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt64()),
    },
});
const AccountPrecondition = new BindingsType.Object({
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
        balance: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt64()),
        nonce: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt32()),
        receiptChainHash: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
        delegate: new BindingsType.Option.Flagged(new BindingsType.Leaf.PublicKey()),
        state: new BindingsType.Array({
            staticLength: 8,
            inner: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
        }),
        actionState: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
        provedState: new BindingsType.Option.Flagged(new BindingsType.Leaf.Bool()),
        isNew: new BindingsType.Option.Flagged(new BindingsType.Leaf.Bool()),
    },
});
const MayUseToken = new BindingsType.Object({
    name: 'MayUseToken',
    keys: ['parentsOwnToken', 'inheritFromParent'],
    entries: {
        parentsOwnToken: new BindingsType.Leaf.Bool(),
        inheritFromParent: new BindingsType.Leaf.Bool(),
    },
});
const AuthorizationKindStructured = new BindingsType.Object({
    name: 'AuthorizationKindStructured',
    keys: ['isSigned', 'isProved', 'verificationKeyHash'],
    entries: {
        isSigned: new BindingsType.Leaf.Bool(),
        isProved: new BindingsType.Leaf.Bool(),
        verificationKeyHash: new BindingsType.Leaf.Field(),
    },
});
const Control = new BindingsType.Object({
    name: 'Control',
    keys: ['proof', 'signature'],
    entries: {
        proof: new BindingsType.Option.OrUndefined(new BindingsType.Leaf.String()),
        signature: new BindingsType.Option.OrUndefined(new BindingsType.Leaf.String()),
    },
});
const AccountTiming = new BindingsType.Object({
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
        isTimed: new BindingsType.Leaf.Bool(),
        initialMinimumBalance: new BindingsType.Leaf.UInt64(),
        cliffTime: new BindingsType.Leaf.UInt32(),
        cliffAmount: new BindingsType.Leaf.UInt64(),
        vestingPeriod: new BindingsType.Leaf.UInt32(),
        vestingIncrement: new BindingsType.Leaf.UInt64(),
    },
});
const ZkappFeePayer = new BindingsType.Object({
    name: 'ZkappFeePayer',
    keys: ['body', 'authorization'],
    entries: { body: FeePayerBody, authorization: new BindingsType.Leaf.String() },
});
const Permissions = new BindingsType.Object({
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
        editState: new BindingsType.Leaf.AuthRequired(),
        access: new BindingsType.Leaf.AuthRequired(),
        send: new BindingsType.Leaf.AuthRequired(),
        receive: new BindingsType.Leaf.AuthRequired(),
        setDelegate: new BindingsType.Leaf.AuthRequired(),
        setPermissions: new BindingsType.Leaf.AuthRequired(),
        setVerificationKey: VerificationKeyPermission,
        setZkappUri: new BindingsType.Leaf.AuthRequired(),
        editActionState: new BindingsType.Leaf.AuthRequired(),
        setTokenSymbol: new BindingsType.Leaf.AuthRequired(),
        incrementNonce: new BindingsType.Leaf.AuthRequired(),
        setVotingFor: new BindingsType.Leaf.AuthRequired(),
        setTiming: new BindingsType.Leaf.AuthRequired(),
    },
});
const EpochDataPrecondition = new BindingsType.Object({
    name: 'EpochDataPrecondition',
    keys: ['ledger', 'seed', 'startCheckpoint', 'lockCheckpoint', 'epochLength'],
    entries: {
        ledger: EpochLedgerPrecondition,
        seed: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
        startCheckpoint: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
        lockCheckpoint: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
        epochLength: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt32()),
    },
});
const ZkappAccount = new BindingsType.Object({
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
        appState: new BindingsType.Array({
            staticLength: 8,
            inner: new BindingsType.Leaf.Field(),
        }),
        verificationKey: new BindingsType.Option.OrUndefined(VerificationKeyWithHash),
        zkappVersion: new BindingsType.Leaf.UInt32(),
        actionState: new BindingsType.Array({
            staticLength: 5,
            inner: new BindingsType.Leaf.Field(),
        }),
        lastActionSlot: new BindingsType.Leaf.UInt32(),
        provedState: new BindingsType.Leaf.Bool(),
        zkappUri: new BindingsType.Leaf.String(),
    },
});
const AccountUpdateModification = new BindingsType.Object({
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
        appState: new BindingsType.Array({
            staticLength: 8,
            inner: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
        }),
        delegate: new BindingsType.Option.Flagged(new BindingsType.Leaf.PublicKey()),
        verificationKey: new BindingsType.Option.Flagged(VerificationKeyWithHash),
        permissions: new BindingsType.Option.Flagged(Permissions),
        zkappUri: new BindingsType.Option.Flagged(new BindingsType.Leaf.ZkappUri()),
        tokenSymbol: new BindingsType.Option.Flagged(new BindingsType.Leaf.TokenSymbol()),
        timing: new BindingsType.Option.Flagged(Timing),
        votingFor: new BindingsType.Option.Flagged(new BindingsType.Leaf.StateHash()),
    },
});
const NetworkPrecondition = new BindingsType.Object({
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
        snarkedLedgerHash: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
        blockchainLength: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt32()),
        minWindowDensity: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt32()),
        totalCurrency: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt64()),
        globalSlotSinceGenesis: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt32()),
        stakingEpochData: EpochDataPrecondition,
        nextEpochData: EpochDataPrecondition,
    },
});
const Account = new BindingsType.Object({
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
        publicKey: new BindingsType.Leaf.PublicKey(),
        tokenId: new BindingsType.Leaf.TokenId(),
        tokenSymbol: new BindingsType.Leaf.String(),
        balance: new BindingsType.Leaf.UInt64(),
        nonce: new BindingsType.Leaf.UInt32(),
        receiptChainHash: new BindingsType.Leaf.Field(),
        delegate: new BindingsType.Option.OrUndefined(new BindingsType.Leaf.PublicKey()),
        votingFor: new BindingsType.Leaf.Field(),
        timing: AccountTiming,
        permissions: Permissions,
        zkapp: new BindingsType.Option.OrUndefined(ZkappAccount),
    },
});
const Preconditions = new BindingsType.Object({
    name: 'Preconditions',
    keys: ['network', 'account', 'validWhile'],
    entries: {
        network: NetworkPrecondition,
        account: AccountPrecondition,
        validWhile: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt32()),
    },
});
const AccountUpdateBody = new BindingsType.Object({
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
        publicKey: new BindingsType.Leaf.PublicKey(),
        tokenId: new BindingsType.Leaf.TokenId(),
        update: AccountUpdateModification,
        balanceChange: new BindingsType.Leaf.Int64(),
        incrementNonce: new BindingsType.Leaf.Bool(),
        events: new BindingsType.Leaf.Events(),
        actions: new BindingsType.Leaf.Actions(),
        callData: new BindingsType.Leaf.Field(),
        callDepth: new BindingsType.Leaf.Number(),
        preconditions: Preconditions,
        useFullCommitment: new BindingsType.Leaf.Bool(),
        implicitAccountCreationFee: new BindingsType.Leaf.Bool(),
        mayUseToken: MayUseToken,
        authorizationKind: AuthorizationKindStructured,
    },
});
const ZkappAccountUpdate = new BindingsType.Object({
    name: 'ZkappAccountUpdate',
    keys: ['body', 'authorization'],
    entries: { body: AccountUpdateBody, authorization: Control },
});
const ZkappCommand = new BindingsType.Object({
    name: 'ZkappCommand',
    keys: ['feePayer', 'accountUpdates', 'memo'],
    entries: {
        feePayer: ZkappFeePayer,
        accountUpdates: new BindingsType.Array({
            staticLength: null,
            inner: ZkappAccountUpdate,
        }),
        memo: new BindingsType.Leaf.String(),
    },
});
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
