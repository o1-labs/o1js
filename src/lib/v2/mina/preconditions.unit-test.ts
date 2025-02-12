import {
  testV1V2ClassEquivalence,
  testV1V2ValueEquivalence,
  testV2Encoding,
  v1FetchLayout,
} from './bindings-test-utils.js';
import {
  AccountPreconditions,
  EpochDataPreconditions,
  EpochLedgerPreconditions,
  NetworkPreconditions,
  Precondition,
  Preconditions,
} from './preconditions.js';
import { MAX_ZKAPP_STATE_FIELDS } from './core.js';
import { GenericStatePreconditions } from './state.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import * as TypesV1 from '../../../bindings/mina-transaction/gen/transaction.js';
import * as ValuesV1 from '../../../bindings/mina-transaction/gen/transaction-bigint.js';
import * as JsonV1 from '../../../bindings/mina-transaction/gen/transaction-json.js';
import { jsLayout as layoutV1 } from '../../../bindings/mina-transaction/gen/js-layout.js';

//--- Preconditions.EpochLedger ---//

const V1EpochLedgerPreconditions = TypesV1.provableFromLayout<
  TypesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData']['ledger'],
  ValuesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData']['ledger'],
  JsonV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData']['ledger']
>(
  v1FetchLayout(layoutV1.AccountUpdate, [
    'body',
    'preconditions',
    'network',
    'stakingEpochData',
    'ledger',
  ])
);

const v1EpochLedgerPreconditions: TypesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData']['ledger'] =
  {
    hash: {
      isSome: new Bool(true),
      value: new Field(100),
    },
    totalCurrency: {
      isSome: new Bool(true),
      value: {
        lower: new UInt64(0),
        upper: new UInt64(10 ** 6 * 10 ** 9),
      },
    },
  };

const v2EpochLedgerPreconditions = new EpochLedgerPreconditions({
  hash: new Field(100),
  totalCurrency: Precondition.InRange.betweenInclusive(
    new UInt64(0),
    new UInt64(10 ** 6 * 10 ** 9)
  ),
});

{
  testV2Encoding(EpochLedgerPreconditions, v2EpochLedgerPreconditions);
  testV1V2ClassEquivalence(
    V1EpochLedgerPreconditions,
    EpochLedgerPreconditions,
    undefined
  );
  testV1V2ValueEquivalence(
    V1EpochLedgerPreconditions,
    EpochLedgerPreconditions,
    v1EpochLedgerPreconditions,
    v2EpochLedgerPreconditions,
    undefined
  );
}

//--- Preconditions.EpochData ---//

const V1EpochDataPreconditions = TypesV1.provableFromLayout<
  TypesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData'],
  ValuesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData'],
  JsonV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData']
>(
  v1FetchLayout(layoutV1.AccountUpdate, [
    'body',
    'preconditions',
    'network',
    'stakingEpochData',
  ])
);

const v1EpochDataPreconditions: TypesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData'] =
  {
    ledger: v1EpochLedgerPreconditions,
    seed: {
      isSome: new Bool(false),
      value: new Field(24),
    },
    startCheckpoint: {
      isSome: new Bool(true),
      value: new Field(2048),
    },
    lockCheckpoint: {
      isSome: new Bool(true),
      value: new Field(4073),
    },
    epochLength: {
      isSome: new Bool(false),
      value: {
        lower: new UInt32(7),
        upper: new UInt32(9),
      },
    },
  };

const v2EpochDataPreconditions = new EpochDataPreconditions({
  ledger: v2EpochLedgerPreconditions,
  seed: Precondition.Equals.disabled(new Field(24)),
  startCheckpoint: new Field(2048),
  lockCheckpoint: new Field(4073),
  epochLength: Precondition.InRange.disabled({
    lower: new UInt32(7),
    upper: new UInt32(9),
  }),
});

{
  testV2Encoding(EpochDataPreconditions, v2EpochDataPreconditions);
  testV1V2ClassEquivalence(
    V1EpochDataPreconditions,
    EpochDataPreconditions,
    undefined
  );
  testV1V2ValueEquivalence(
    V1EpochDataPreconditions,
    EpochDataPreconditions,
    v1EpochDataPreconditions,
    v2EpochDataPreconditions,
    undefined
  );
}

//--- Preconditions.Network ---//

const V1NetworkPreconditions = TypesV1.provableFromLayout<
  TypesV1.AccountUpdate['body']['preconditions']['network'],
  ValuesV1.AccountUpdate['body']['preconditions']['network'],
  JsonV1.AccountUpdate['body']['preconditions']['network']
>(v1FetchLayout(layoutV1.AccountUpdate, ['body', 'preconditions', 'network']));

const v1NetworkPreconditions: TypesV1.AccountUpdate['body']['preconditions']['network'] =
  {
    snarkedLedgerHash: {
      isSome: new Bool(true),
      value: new Field(17),
    },
    blockchainLength: {
      isSome: new Bool(true),
      value: {
        lower: UInt32.one,
        upper: UInt32.one,
      },
    },
    minWindowDensity: {
      isSome: new Bool(true),
      value: {
        lower: new UInt32(32),
        upper: new UInt32(48),
      },
    },
    totalCurrency: {
      isSome: new Bool(false),
      value: {
        lower: UInt64.zero,
        upper: new UInt64(10 ** 8 * 10 ** 9),
      },
    },
    globalSlotSinceGenesis: {
      isSome: new Bool(true),
      value: {
        lower: new UInt32(400),
        upper: new UInt32(900),
      },
    },
    // TODO: these should be different in order to for tests to be accurate
    stakingEpochData: v1EpochDataPreconditions,
    nextEpochData: v1EpochDataPreconditions,
  };

const v2NetworkPreconditions = new NetworkPreconditions({
  snarkedLedgerHash: new Field(17),
  blockchainLength: Precondition.InRange.equals(UInt32.one),
  minWindowDensity: Precondition.InRange.betweenInclusive(
    new UInt32(32),
    new UInt32(48)
  ),
  totalCurrency: Precondition.InRange.disabled({
    lower: UInt64.zero,
    upper: new UInt64(10 ** 8 * 10 ** 9),
  }),
  globalSlotSinceGenesis: Precondition.InRange.betweenInclusive(
    new UInt32(400),
    new UInt32(900)
  ),
  stakingEpochData: v2EpochDataPreconditions,
  nextEpochData: v2EpochDataPreconditions,
});

{
  testV2Encoding(NetworkPreconditions, v2NetworkPreconditions);
  testV1V2ClassEquivalence(
    V1NetworkPreconditions,
    NetworkPreconditions,
    undefined
  );
  testV1V2ValueEquivalence(
    V1NetworkPreconditions,
    NetworkPreconditions,
    v1NetworkPreconditions,
    v2NetworkPreconditions,
    undefined
  );
}

//--- Preconditions.Account ---//

const V1AccountPreconditions = TypesV1.provableFromLayout<
  TypesV1.AccountUpdate['body']['preconditions']['account'],
  ValuesV1.AccountUpdate['body']['preconditions']['account'],
  JsonV1.AccountUpdate['body']['preconditions']['account']
>(v1FetchLayout(layoutV1.AccountUpdate, ['body', 'preconditions', 'account']));

const v1AccountPreconditions: TypesV1.AccountUpdate['body']['preconditions']['account'] =
  {
    balance: {
      isSome: new Bool(true),
      value: {
        lower: new UInt64(10 * 10 ** 9),
        upper: new UInt64(100 * 10 ** 9),
      },
    },
    nonce: {
      isSome: new Bool(true),
      value: {
        lower: new UInt32(42),
        upper: new UInt32(42),
      },
    },
    receiptChainHash: {
      isSome: new Bool(false),
      value: new Field(999),
    },
    delegate: {
      isSome: new Bool(false),
      value: PublicKey.empty(),
    },
    state: new Array(MAX_ZKAPP_STATE_FIELDS).fill({
      isSome: new Bool(true),
      value: new Field(50),
    }),
    actionState: {
      isSome: new Bool(false),
      value: new Field(30),
    },
    provedState: {
      isSome: new Bool(true),
      value: new Bool(false),
    },
    isNew: {
      isSome: new Bool(false),
      value: new Bool(true),
    },
  };

const v2AccountPreconditions = new AccountPreconditions('GenericState', {
  balance: Precondition.InRange.betweenInclusive(
    new UInt64(10 * 10 ** 9),
    new UInt64(100 * 10 ** 9)
  ),
  nonce: new UInt32(42),
  receiptChainHash: Precondition.Equals.disabled(new Field(999)),
  delegate: undefined,
  state: new GenericStatePreconditions(
    new Array(MAX_ZKAPP_STATE_FIELDS).fill(
      Precondition.Equals.equals(new Field(50))
    )
  ),
  actionState: Precondition.Equals.disabled(new Field(30)),
  isProven: new Bool(false),
  isNew: Precondition.Equals.disabled(new Bool(true)),
});

{
  testV2Encoding(AccountPreconditions, v2AccountPreconditions);
  testV1V2ClassEquivalence(
    V1AccountPreconditions,
    AccountPreconditions,
    undefined
  );
  testV1V2ValueEquivalence(
    V1AccountPreconditions,
    AccountPreconditions,
    v1AccountPreconditions,
    v2AccountPreconditions,
    undefined
  );
}

//--- Preconditions.Account ---//

const V1Preconditions = TypesV1.provableFromLayout<
  TypesV1.AccountUpdate['body']['preconditions'],
  ValuesV1.AccountUpdate['body']['preconditions'],
  JsonV1.AccountUpdate['body']['preconditions']
>(v1FetchLayout(layoutV1.AccountUpdate, ['body', 'preconditions']));

const v1Preconditions: TypesV1.AccountUpdate['body']['preconditions'] = {
  network: v1NetworkPreconditions,
  account: v1AccountPreconditions,
  validWhile: {
    isSome: new Bool(true),
    value: {
      lower: new UInt32(5),
      upper: new UInt32(15),
    },
  },
};

const v2Preconditions = new Preconditions('GenericState', {
  network: v2NetworkPreconditions,
  account: v2AccountPreconditions,
  validWhile: Precondition.InRange.betweenInclusive(
    new UInt32(5),
    new UInt32(15)
  ),
});

{
  testV2Encoding(Preconditions, v2Preconditions);
  testV1V2ClassEquivalence(V1Preconditions, Preconditions, undefined);
  testV1V2ValueEquivalence(
    V1Preconditions,
    Preconditions,
    v1Preconditions,
    v2Preconditions,
    undefined
  );
}

console.log('\n:)');
