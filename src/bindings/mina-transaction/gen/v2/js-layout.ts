// @generated this file is auto-generated - don't edit it directly
import { BindingsType } from '../../v2/schema.js';
import {
  Actions,
  AuthRequired,
  Bool,
  Events,
  Field,
  Int64,
  Option,
  PublicKey,
  Range,
  Sign,
  StateHash,
  TokenId,
  TokenSymbol,
  UInt32,
  UInt64,
  ZkappUri,
} from '../../v2/leaves.js';
export {
  Types,
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
type FeePayerBody = {
  publicKey: PublicKey;
  fee: UInt64;
  validUntil: UInt32 | undefined;
  nonce: UInt32;
};
const FeePayerBody: BindingsType.Object<FeePayerBody> = new BindingsType.Object({
  name: 'FeePayerBody',
  keys: ['publicKey', 'fee', 'validUntil', 'nonce'],
  entries: {
    publicKey: new BindingsType.Leaf.PublicKey(),
    fee: new BindingsType.Leaf.UInt64(),
    validUntil: new BindingsType.Option.OrUndefined<UInt32>(new BindingsType.Leaf.UInt32()),
    nonce: new BindingsType.Leaf.UInt32(),
  },
});
type VerificationKeyWithHash = { data: string; hash: Field };
const VerificationKeyWithHash: BindingsType.Object<VerificationKeyWithHash> =
  new BindingsType.Object({
    name: 'VerificationKeyWithHash',
    keys: ['data', 'hash'],
    entries: { data: new BindingsType.Leaf.String(), hash: new BindingsType.Leaf.Field() },
  });
type VerificationKeyPermission = { auth: AuthRequired; txnVersion: UInt32 };
const VerificationKeyPermission: BindingsType.Object<VerificationKeyPermission> =
  new BindingsType.Object({
    name: 'VerificationKeyPermission',
    keys: ['auth', 'txnVersion'],
    entries: {
      auth: new BindingsType.Leaf.AuthRequired(),
      txnVersion: new BindingsType.Leaf.UInt32(),
    },
  });
type Timing = {
  initialMinimumBalance: UInt64;
  cliffTime: UInt32;
  cliffAmount: UInt64;
  vestingPeriod: UInt32;
  vestingIncrement: UInt64;
};
const Timing: BindingsType.Object<Timing> = new BindingsType.Object({
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
type EpochLedgerPrecondition = { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
const EpochLedgerPrecondition: BindingsType.Object<EpochLedgerPrecondition> =
  new BindingsType.Object({
    name: 'EpochLedgerPrecondition',
    keys: ['hash', 'totalCurrency'],
    entries: {
      hash: new BindingsType.Option.Flagged(new BindingsType.Leaf.Field()),
      totalCurrency: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt64()),
    },
  });
type AccountPrecondition = {
  balance: Option<Range<UInt64>>;
  nonce: Option<Range<UInt32>>;
  receiptChainHash: Option<Field>;
  delegate: Option<PublicKey>;
  state: Option<Field>[];
  actionState: Option<Field>;
  provedState: Option<Bool>;
  isNew: Option<Bool>;
};
const AccountPrecondition: BindingsType.Object<AccountPrecondition> = new BindingsType.Object({
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
type MayUseToken = { parentsOwnToken: Bool; inheritFromParent: Bool };
const MayUseToken: BindingsType.Object<MayUseToken> = new BindingsType.Object({
  name: 'MayUseToken',
  keys: ['parentsOwnToken', 'inheritFromParent'],
  entries: {
    parentsOwnToken: new BindingsType.Leaf.Bool(),
    inheritFromParent: new BindingsType.Leaf.Bool(),
  },
});
type AuthorizationKindStructured = { isSigned: Bool; isProved: Bool; verificationKeyHash: Field };
const AuthorizationKindStructured: BindingsType.Object<AuthorizationKindStructured> =
  new BindingsType.Object({
    name: 'AuthorizationKindStructured',
    keys: ['isSigned', 'isProved', 'verificationKeyHash'],
    entries: {
      isSigned: new BindingsType.Leaf.Bool(),
      isProved: new BindingsType.Leaf.Bool(),
      verificationKeyHash: new BindingsType.Leaf.Field(),
    },
  });
type Control = { proof: string | undefined; signature: string | undefined };
const Control: BindingsType.Object<Control> = new BindingsType.Object({
  name: 'Control',
  keys: ['proof', 'signature'],
  entries: {
    proof: new BindingsType.Option.OrUndefined<string>(new BindingsType.Leaf.String()),
    signature: new BindingsType.Option.OrUndefined<string>(new BindingsType.Leaf.String()),
  },
});
type AccountTiming = {
  isTimed: Bool;
  initialMinimumBalance: UInt64;
  cliffTime: UInt32;
  cliffAmount: UInt64;
  vestingPeriod: UInt32;
  vestingIncrement: UInt64;
};
const AccountTiming: BindingsType.Object<AccountTiming> = new BindingsType.Object({
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
type ZkappFeePayer = {
  body: { publicKey: PublicKey; fee: UInt64; validUntil: UInt32 | undefined; nonce: UInt32 };
  authorization: string;
};
const ZkappFeePayer: BindingsType.Object<ZkappFeePayer> = new BindingsType.Object({
  name: 'ZkappFeePayer',
  keys: ['body', 'authorization'],
  entries: { body: FeePayerBody, authorization: new BindingsType.Leaf.String() },
});
type Permissions = {
  editState: AuthRequired;
  access: AuthRequired;
  send: AuthRequired;
  receive: AuthRequired;
  setDelegate: AuthRequired;
  setPermissions: AuthRequired;
  setVerificationKey: { auth: AuthRequired; txnVersion: UInt32 };
  setZkappUri: AuthRequired;
  editActionState: AuthRequired;
  setTokenSymbol: AuthRequired;
  incrementNonce: AuthRequired;
  setVotingFor: AuthRequired;
  setTiming: AuthRequired;
};
const Permissions: BindingsType.Object<Permissions> = new BindingsType.Object({
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
type EpochDataPrecondition = {
  ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
  seed: Option<Field>;
  startCheckpoint: Option<Field>;
  lockCheckpoint: Option<Field>;
  epochLength: Option<Range<UInt32>>;
};
const EpochDataPrecondition: BindingsType.Object<EpochDataPrecondition> = new BindingsType.Object({
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
type ZkappAccount = {
  appState: Field[];
  verificationKey: { data: string; hash: Field } | undefined;
  zkappVersion: UInt32;
  actionState: Field[];
  lastActionSlot: UInt32;
  provedState: Bool;
  zkappUri: string;
};
const ZkappAccount: BindingsType.Object<ZkappAccount> = new BindingsType.Object({
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
    verificationKey: new BindingsType.Option.OrUndefined<{ data: string; hash: Field }>(
      VerificationKeyWithHash
    ),
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
type AccountUpdateModification = {
  appState: Option<Field>[];
  delegate: Option<PublicKey>;
  verificationKey: Option<{ data: string; hash: Field }>;
  permissions: Option<{
    editState: AuthRequired;
    access: AuthRequired;
    send: AuthRequired;
    receive: AuthRequired;
    setDelegate: AuthRequired;
    setPermissions: AuthRequired;
    setVerificationKey: { auth: AuthRequired; txnVersion: UInt32 };
    setZkappUri: AuthRequired;
    editActionState: AuthRequired;
    setTokenSymbol: AuthRequired;
    incrementNonce: AuthRequired;
    setVotingFor: AuthRequired;
    setTiming: AuthRequired;
  }>;
  zkappUri: Option<ZkappUri>;
  tokenSymbol: Option<TokenSymbol>;
  timing: Option<{
    initialMinimumBalance: UInt64;
    cliffTime: UInt32;
    cliffAmount: UInt64;
    vestingPeriod: UInt32;
    vestingIncrement: UInt64;
  }>;
  votingFor: Option<StateHash>;
};
const AccountUpdateModification: BindingsType.Object<AccountUpdateModification> =
  new BindingsType.Object({
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
type NetworkPrecondition = {
  snarkedLedgerHash: Option<Field>;
  blockchainLength: Option<Range<UInt32>>;
  minWindowDensity: Option<Range<UInt32>>;
  totalCurrency: Option<Range<UInt64>>;
  globalSlotSinceGenesis: Option<Range<UInt32>>;
  stakingEpochData: {
    ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
    seed: Option<Field>;
    startCheckpoint: Option<Field>;
    lockCheckpoint: Option<Field>;
    epochLength: Option<Range<UInt32>>;
  };
  nextEpochData: {
    ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
    seed: Option<Field>;
    startCheckpoint: Option<Field>;
    lockCheckpoint: Option<Field>;
    epochLength: Option<Range<UInt32>>;
  };
};
const NetworkPrecondition: BindingsType.Object<NetworkPrecondition> = new BindingsType.Object({
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
type Account = {
  publicKey: PublicKey;
  tokenId: TokenId;
  tokenSymbol: string;
  balance: UInt64;
  nonce: UInt32;
  receiptChainHash: Field;
  delegate: PublicKey | undefined;
  votingFor: Field;
  timing: {
    isTimed: Bool;
    initialMinimumBalance: UInt64;
    cliffTime: UInt32;
    cliffAmount: UInt64;
    vestingPeriod: UInt32;
    vestingIncrement: UInt64;
  };
  permissions: {
    editState: AuthRequired;
    access: AuthRequired;
    send: AuthRequired;
    receive: AuthRequired;
    setDelegate: AuthRequired;
    setPermissions: AuthRequired;
    setVerificationKey: { auth: AuthRequired; txnVersion: UInt32 };
    setZkappUri: AuthRequired;
    editActionState: AuthRequired;
    setTokenSymbol: AuthRequired;
    incrementNonce: AuthRequired;
    setVotingFor: AuthRequired;
    setTiming: AuthRequired;
  };
  zkapp:
    | {
        appState: Field[];
        verificationKey: { data: string; hash: Field } | undefined;
        zkappVersion: UInt32;
        actionState: Field[];
        lastActionSlot: UInt32;
        provedState: Bool;
        zkappUri: string;
      }
    | undefined;
};
const Account: BindingsType.Object<Account> = new BindingsType.Object({
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
    delegate: new BindingsType.Option.OrUndefined<PublicKey>(new BindingsType.Leaf.PublicKey()),
    votingFor: new BindingsType.Leaf.Field(),
    timing: AccountTiming,
    permissions: Permissions,
    zkapp: new BindingsType.Option.OrUndefined<{
      appState: Field[];
      verificationKey: { data: string; hash: Field } | undefined;
      zkappVersion: UInt32;
      actionState: Field[];
      lastActionSlot: UInt32;
      provedState: Bool;
      zkappUri: string;
    }>(ZkappAccount),
  },
});
type Preconditions = {
  network: {
    snarkedLedgerHash: Option<Field>;
    blockchainLength: Option<Range<UInt32>>;
    minWindowDensity: Option<Range<UInt32>>;
    totalCurrency: Option<Range<UInt64>>;
    globalSlotSinceGenesis: Option<Range<UInt32>>;
    stakingEpochData: {
      ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
      seed: Option<Field>;
      startCheckpoint: Option<Field>;
      lockCheckpoint: Option<Field>;
      epochLength: Option<Range<UInt32>>;
    };
    nextEpochData: {
      ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
      seed: Option<Field>;
      startCheckpoint: Option<Field>;
      lockCheckpoint: Option<Field>;
      epochLength: Option<Range<UInt32>>;
    };
  };
  account: {
    balance: Option<Range<UInt64>>;
    nonce: Option<Range<UInt32>>;
    receiptChainHash: Option<Field>;
    delegate: Option<PublicKey>;
    state: Option<Field>[];
    actionState: Option<Field>;
    provedState: Option<Bool>;
    isNew: Option<Bool>;
  };
  validWhile: Option<Range<UInt32>>;
};
const Preconditions: BindingsType.Object<Preconditions> = new BindingsType.Object({
  name: 'Preconditions',
  keys: ['network', 'account', 'validWhile'],
  entries: {
    network: NetworkPrecondition,
    account: AccountPrecondition,
    validWhile: new BindingsType.Option.ClosedInterval(new BindingsType.Leaf.UInt32()),
  },
});
type AccountUpdateBody = {
  publicKey: PublicKey;
  tokenId: TokenId;
  update: {
    appState: Option<Field>[];
    delegate: Option<PublicKey>;
    verificationKey: Option<{ data: string; hash: Field }>;
    permissions: Option<{
      editState: AuthRequired;
      access: AuthRequired;
      send: AuthRequired;
      receive: AuthRequired;
      setDelegate: AuthRequired;
      setPermissions: AuthRequired;
      setVerificationKey: { auth: AuthRequired; txnVersion: UInt32 };
      setZkappUri: AuthRequired;
      editActionState: AuthRequired;
      setTokenSymbol: AuthRequired;
      incrementNonce: AuthRequired;
      setVotingFor: AuthRequired;
      setTiming: AuthRequired;
    }>;
    zkappUri: Option<ZkappUri>;
    tokenSymbol: Option<TokenSymbol>;
    timing: Option<{
      initialMinimumBalance: UInt64;
      cliffTime: UInt32;
      cliffAmount: UInt64;
      vestingPeriod: UInt32;
      vestingIncrement: UInt64;
    }>;
    votingFor: Option<StateHash>;
  };
  balanceChange: Int64;
  incrementNonce: Bool;
  events: Events;
  actions: Actions;
  callData: Field;
  callDepth: number;
  preconditions: {
    network: {
      snarkedLedgerHash: Option<Field>;
      blockchainLength: Option<Range<UInt32>>;
      minWindowDensity: Option<Range<UInt32>>;
      totalCurrency: Option<Range<UInt64>>;
      globalSlotSinceGenesis: Option<Range<UInt32>>;
      stakingEpochData: {
        ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
        seed: Option<Field>;
        startCheckpoint: Option<Field>;
        lockCheckpoint: Option<Field>;
        epochLength: Option<Range<UInt32>>;
      };
      nextEpochData: {
        ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
        seed: Option<Field>;
        startCheckpoint: Option<Field>;
        lockCheckpoint: Option<Field>;
        epochLength: Option<Range<UInt32>>;
      };
    };
    account: {
      balance: Option<Range<UInt64>>;
      nonce: Option<Range<UInt32>>;
      receiptChainHash: Option<Field>;
      delegate: Option<PublicKey>;
      state: Option<Field>[];
      actionState: Option<Field>;
      provedState: Option<Bool>;
      isNew: Option<Bool>;
    };
    validWhile: Option<Range<UInt32>>;
  };
  useFullCommitment: Bool;
  implicitAccountCreationFee: Bool;
  mayUseToken: { parentsOwnToken: Bool; inheritFromParent: Bool };
  authorizationKind: { isSigned: Bool; isProved: Bool; verificationKeyHash: Field };
};
const AccountUpdateBody: BindingsType.Object<AccountUpdateBody> = new BindingsType.Object({
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
type ZkappAccountUpdate = {
  body: {
    publicKey: PublicKey;
    tokenId: TokenId;
    update: {
      appState: Option<Field>[];
      delegate: Option<PublicKey>;
      verificationKey: Option<{ data: string; hash: Field }>;
      permissions: Option<{
        editState: AuthRequired;
        access: AuthRequired;
        send: AuthRequired;
        receive: AuthRequired;
        setDelegate: AuthRequired;
        setPermissions: AuthRequired;
        setVerificationKey: { auth: AuthRequired; txnVersion: UInt32 };
        setZkappUri: AuthRequired;
        editActionState: AuthRequired;
        setTokenSymbol: AuthRequired;
        incrementNonce: AuthRequired;
        setVotingFor: AuthRequired;
        setTiming: AuthRequired;
      }>;
      zkappUri: Option<ZkappUri>;
      tokenSymbol: Option<TokenSymbol>;
      timing: Option<{
        initialMinimumBalance: UInt64;
        cliffTime: UInt32;
        cliffAmount: UInt64;
        vestingPeriod: UInt32;
        vestingIncrement: UInt64;
      }>;
      votingFor: Option<StateHash>;
    };
    balanceChange: Int64;
    incrementNonce: Bool;
    events: Events;
    actions: Actions;
    callData: Field;
    callDepth: number;
    preconditions: {
      network: {
        snarkedLedgerHash: Option<Field>;
        blockchainLength: Option<Range<UInt32>>;
        minWindowDensity: Option<Range<UInt32>>;
        totalCurrency: Option<Range<UInt64>>;
        globalSlotSinceGenesis: Option<Range<UInt32>>;
        stakingEpochData: {
          ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
          seed: Option<Field>;
          startCheckpoint: Option<Field>;
          lockCheckpoint: Option<Field>;
          epochLength: Option<Range<UInt32>>;
        };
        nextEpochData: {
          ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
          seed: Option<Field>;
          startCheckpoint: Option<Field>;
          lockCheckpoint: Option<Field>;
          epochLength: Option<Range<UInt32>>;
        };
      };
      account: {
        balance: Option<Range<UInt64>>;
        nonce: Option<Range<UInt32>>;
        receiptChainHash: Option<Field>;
        delegate: Option<PublicKey>;
        state: Option<Field>[];
        actionState: Option<Field>;
        provedState: Option<Bool>;
        isNew: Option<Bool>;
      };
      validWhile: Option<Range<UInt32>>;
    };
    useFullCommitment: Bool;
    implicitAccountCreationFee: Bool;
    mayUseToken: { parentsOwnToken: Bool; inheritFromParent: Bool };
    authorizationKind: { isSigned: Bool; isProved: Bool; verificationKeyHash: Field };
  };
  authorization: { proof: string | undefined; signature: string | undefined };
};
const ZkappAccountUpdate: BindingsType.Object<ZkappAccountUpdate> = new BindingsType.Object({
  name: 'ZkappAccountUpdate',
  keys: ['body', 'authorization'],
  entries: { body: AccountUpdateBody, authorization: Control },
});
type ZkappCommand = {
  feePayer: {
    body: { publicKey: PublicKey; fee: UInt64; validUntil: UInt32 | undefined; nonce: UInt32 };
    authorization: string;
  };
  accountUpdates: {
    body: {
      publicKey: PublicKey;
      tokenId: TokenId;
      update: {
        appState: Option<Field>[];
        delegate: Option<PublicKey>;
        verificationKey: Option<{ data: string; hash: Field }>;
        permissions: Option<{
          editState: AuthRequired;
          access: AuthRequired;
          send: AuthRequired;
          receive: AuthRequired;
          setDelegate: AuthRequired;
          setPermissions: AuthRequired;
          setVerificationKey: { auth: AuthRequired; txnVersion: UInt32 };
          setZkappUri: AuthRequired;
          editActionState: AuthRequired;
          setTokenSymbol: AuthRequired;
          incrementNonce: AuthRequired;
          setVotingFor: AuthRequired;
          setTiming: AuthRequired;
        }>;
        zkappUri: Option<ZkappUri>;
        tokenSymbol: Option<TokenSymbol>;
        timing: Option<{
          initialMinimumBalance: UInt64;
          cliffTime: UInt32;
          cliffAmount: UInt64;
          vestingPeriod: UInt32;
          vestingIncrement: UInt64;
        }>;
        votingFor: Option<StateHash>;
      };
      balanceChange: Int64;
      incrementNonce: Bool;
      events: Events;
      actions: Actions;
      callData: Field;
      callDepth: number;
      preconditions: {
        network: {
          snarkedLedgerHash: Option<Field>;
          blockchainLength: Option<Range<UInt32>>;
          minWindowDensity: Option<Range<UInt32>>;
          totalCurrency: Option<Range<UInt64>>;
          globalSlotSinceGenesis: Option<Range<UInt32>>;
          stakingEpochData: {
            ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
            seed: Option<Field>;
            startCheckpoint: Option<Field>;
            lockCheckpoint: Option<Field>;
            epochLength: Option<Range<UInt32>>;
          };
          nextEpochData: {
            ledger: { hash: Option<Field>; totalCurrency: Option<Range<UInt64>> };
            seed: Option<Field>;
            startCheckpoint: Option<Field>;
            lockCheckpoint: Option<Field>;
            epochLength: Option<Range<UInt32>>;
          };
        };
        account: {
          balance: Option<Range<UInt64>>;
          nonce: Option<Range<UInt32>>;
          receiptChainHash: Option<Field>;
          delegate: Option<PublicKey>;
          state: Option<Field>[];
          actionState: Option<Field>;
          provedState: Option<Bool>;
          isNew: Option<Bool>;
        };
        validWhile: Option<Range<UInt32>>;
      };
      useFullCommitment: Bool;
      implicitAccountCreationFee: Bool;
      mayUseToken: { parentsOwnToken: Bool; inheritFromParent: Bool };
      authorizationKind: { isSigned: Bool; isProved: Bool; verificationKeyHash: Field };
    };
    authorization: { proof: string | undefined; signature: string | undefined };
  }[];
  memo: string;
};
const ZkappCommand: BindingsType.Object<ZkappCommand> = new BindingsType.Object({
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
const Types: { [key: string]: BindingsType<any> } = {
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
