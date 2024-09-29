import { testV1V2ClassEquivalence, testV1V2ValueEquivalence, testV2Encoding, v1FetchLayout } from './bindings-test-utils.js';
import { Preconditions } from './preconditions.js';
import { Constraint, MAX_ZKAPP_STATE_FIELDS } from './core.js';
import { GenericStateConstraints } from './state.js';
import { Bool } from '../../provable/bool.js'
import { Field } from '../../provable/field.js'
import { UInt32, UInt64 } from '../../provable/int.js'
import { PublicKey } from '../../provable/crypto/signature.js'
import * as TypesV1 from '../../../bindings/mina-transaction/gen/transaction.js';
import * as ValuesV1 from '../../../bindings/mina-transaction/gen/transaction-bigint.js';
import * as JsonV1 from '../../../bindings/mina-transaction/gen/transaction-json.js';
import { jsLayout as layoutV1 } from '../../../bindings/mina-transaction/gen/js-layout.js';

//--- Preconditions.EpochLedger ---//

const V1EpochLedgerPreconditions = TypesV1.provableFromLayout<
  TypesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData']['ledger'],
  ValuesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData']['ledger'],
  JsonV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData']['ledger']
>(v1FetchLayout(layoutV1.AccountUpdate, ['body', 'preconditions', 'network', 'stakingEpochData', 'ledger']));

const v1EpochLedgerPreconditions: TypesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData']['ledger'] = {
  hash: {
    isSome: new Bool(true),
    value: new Field(100),
  },
  totalCurrency: {
    isSome: new Bool(true),
    value: {
      lower: new UInt64(0),
      upper: new UInt64(10**6 * 10**9)
    }
  }
};

const v2EpochLedgerPreconditions = new Preconditions.EpochLedger({
  hash: new Field(100),
  totalCurrency: Constraint.InRange.betweenInclusive(new UInt64(0), new UInt64(10**6 * 10**9)),
});

{
  testV2Encoding(Preconditions.EpochLedger, v2EpochLedgerPreconditions);
  testV1V2ClassEquivalence(V1EpochLedgerPreconditions, Preconditions.EpochLedger, undefined)
  testV1V2ValueEquivalence(
    V1EpochLedgerPreconditions,
    Preconditions.EpochLedger,
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
>(v1FetchLayout(layoutV1.AccountUpdate, ['body', 'preconditions', 'network', 'stakingEpochData']));

const v1EpochDataPreconditions: TypesV1.AccountUpdate['body']['preconditions']['network']['stakingEpochData'] = {
  ledger: v1EpochLedgerPreconditions,
  seed: {
    isSome: new Bool(false),
    value: new Field(24)
  },
  startCheckpoint: {
    isSome: new Bool(true),
    value: new Field(2048)
  },
  lockCheckpoint: {
    isSome: new Bool(true),
    value: new Field(4073)
  },
  epochLength: {
    isSome: new Bool(false),
    value: {
      lower: new UInt32(7),
      upper: new UInt32(9),
    }
  }
};

const v2EpochDataPreconditions = new Preconditions.EpochData({
  ledger: v2EpochLedgerPreconditions,
  seed: Constraint.Equals.disabled(new Field(24)),
  startCheckpoint: new Field(2048),
  lockCheckpoint: new Field(4073),
  epochLength: Constraint.InRange.disabled({lower: new UInt32(7), upper: new UInt32(9)}),
})

{
  testV2Encoding(Preconditions.EpochData, v2EpochDataPreconditions);
  testV1V2ClassEquivalence(V1EpochDataPreconditions, Preconditions.EpochData, undefined)
  testV1V2ValueEquivalence(
    V1EpochDataPreconditions,
    Preconditions.EpochData,
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

const v1NetworkPreconditions: TypesV1.AccountUpdate['body']['preconditions']['network'] = {
  snarkedLedgerHash: {
    isSome: new Bool(true),
    value: new Field(17),
  },
  blockchainLength: {
    isSome: new Bool(true),
    value: {
      lower: UInt32.one,
      upper: UInt32.one,
    }
  },
  minWindowDensity: {
    isSome: new Bool(true),
    value: {
      lower: new UInt32(32),
      upper: new UInt32(48),
    }
  },
  totalCurrency: {
    isSome: new Bool(false),
    value: {
      lower: UInt64.zero,
      upper: new UInt64(10**8 * 10**9),
    }
  },
  globalSlotSinceGenesis: {
    isSome: new Bool(true),
    value: {
      lower: new UInt32(400),
      upper: new UInt32(900),
    }
  },
  // TODO: these should be different in order to for tests to be accurate
  stakingEpochData: v1EpochDataPreconditions,
  nextEpochData: v1EpochDataPreconditions,
};

const v2NetworkPreconditions = new Preconditions.Network({
  snarkedLedgerHash: new Field(17),
  blockchainLength: Constraint.InRange.equals(UInt32.one),
  minWindowDensity: Constraint.InRange.betweenInclusive(new UInt32(32), new UInt32(48)),
  totalCurrency: Constraint.InRange.disabled({ lower: UInt64.zero, upper: new UInt64(10**8 * 10**9) }),
  globalSlotSinceGenesis: Constraint.InRange.betweenInclusive(new UInt32(400), new UInt32(900)),
  stakingEpochData: v2EpochDataPreconditions,
  nextEpochData: v2EpochDataPreconditions,
});

{
  testV2Encoding(Preconditions.Network, v2NetworkPreconditions);
  testV1V2ClassEquivalence(V1NetworkPreconditions, Preconditions.Network, undefined)
  testV1V2ValueEquivalence(
    V1NetworkPreconditions,
    Preconditions.Network,
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

const v1AccountPreconditions: TypesV1.AccountUpdate['body']['preconditions']['account'] = {
  balance: {
    isSome: new Bool(true),
    value: {
      lower: new UInt64(10 * 10**9),
      upper: new UInt64(100 * 10**9),
    }
  },
  nonce: {
    isSome: new Bool(true),
    value: {
      lower: new UInt32(42),
      upper: new UInt32(42),
    }
  },
  receiptChainHash: {
    isSome: new Bool(false),
    value: new Field(999),
  },
  delegate: {
    isSome: new Bool(false),
    value: PublicKey.empty()
  },
  state: new Array(MAX_ZKAPP_STATE_FIELDS).fill({
    isSome: new Bool(true),
    value: new Field(50)
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
  }
};

const v2AccountPreconditions = new Preconditions.Account('GenericState', {
  balance: Constraint.InRange.betweenInclusive(new UInt64(10 * 10**9), new UInt64(100 * 10**9)),
  nonce: new UInt32(42),
  receiptChainHash: Constraint.Equals.disabled(new Field(999)),
  delegate: undefined,
  state: new GenericStateConstraints(new Array(MAX_ZKAPP_STATE_FIELDS).fill(Constraint.Equals.equals(new Field(50)))),
  actionState: Constraint.Equals.disabled(new Field(30)),
  isProven: new Bool(false),
  isNew: Constraint.Equals.disabled(new Bool(true)),
});

{
  testV2Encoding(Preconditions.Account, v2AccountPreconditions);
  testV1V2ClassEquivalence(V1AccountPreconditions, Preconditions.Account, undefined)
  testV1V2ValueEquivalence(
    V1AccountPreconditions,
    Preconditions.Account,
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
      upper: new UInt32(15)
    }
  }
};

const v2Preconditions = new Preconditions('GenericState', {
  network: v2NetworkPreconditions,
  account: v2AccountPreconditions,
  validWhile: Constraint.InRange.betweenInclusive(new UInt32(5), new UInt32(15))
});

{
  testV2Encoding(Preconditions, v2Preconditions);
  testV1V2ClassEquivalence(V1Preconditions, Preconditions, undefined)
  testV1V2ValueEquivalence(
    V1Preconditions,
    Preconditions,
    v1Preconditions,
    v2Preconditions,
    undefined
  );
}

console.log("\n:)");
