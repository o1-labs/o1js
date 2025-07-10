import { Bool } from '../../provable/bool.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { Field } from '../../provable/field.js';
import { Int64, Sign, UInt32, UInt64 } from '../../provable/int.js';
import { ZkappConstants } from '../v1/constants.js';

import { AccountUpdate } from './account-update.js';
import { Account } from './account.js';
import { AuthorizationLevel } from './authorization.js';
import { Update } from './core.js';
import { Permissions } from './permissions.js';
import {
  EpochDataPreconditions,
  EpochLedgerPreconditions,
  Preconditions,
} from './preconditions.js';
import { StateLayout, StateUpdates, StateValues } from './state.js';
import { ZkappFeePayment } from './transaction.js';
import { ChainView, EpochData, EpochLedgerData } from './views.js';

export { checkAndApplyAccountUpdate, checkAndApplyFeePayment, ApplyState };

type ApplyResult<T> = ({ status: 'Applied' } & T) | { status: 'Failed'; errors: Error[] };

type ApplyState<T> = { status: 'Alive'; value: T } | { status: 'Dead' };

function updateApplyState<T>(
  applyState: ApplyState<T>,
  errors: Error[],
  f: (x: T) => T | Error
): ApplyState<T> {
  switch (applyState.status) {
    case 'Alive':
      const result = f(applyState.value);
      if (result instanceof Error) {
        errors.push(result);
        return { status: 'Dead' };
      } else {
        return { status: 'Alive', value: result };
      }
    case 'Dead':
      return applyState;
  }
}

// TODO: make this function checked-friednly, and move this function into the Int64 type directly
function tryAddInt64(a: Int64, b: Int64): Int64 | null {
  if (a.sgn.equals(b.sgn).toBoolean() && a.magnitude.lessThan(b.magnitude).toBoolean()) return null;

  return a.add(b);
}

function checkPreconditions<State extends StateLayout>(
  chain: ChainView,
  account: Account<State>,
  preconditions: Preconditions<State>,
  errors: Error[]
): void {
  function preconditionError(
    preconditionName: string,
    constraint: { toStringHuman(): string },
    value: unknown
  ): Error {
    return new Error(
      `${preconditionName} precondition failed: ${value} does not satisfy "${constraint.toStringHuman()}"`
    );
  }

  // WARNING: failing to specify the type parameter on this function exhibits unsound behavior
  //          (thanks typescript)
  // I think you can do something to fix this with NoInfer, but a first attempt at that seemed
  // to break it even more.
  function checkPrecondition<T>(
    preconditionName: string,
    constraint: { isSatisfied(x: T): Bool; toStringHuman(): string },
    value: T
  ): void {
    if (constraint.isSatisfied(value).not().toBoolean())
      errors.push(preconditionError(preconditionName, constraint, value));
  }

  // ACCOUNT PRECONDITIONS

  checkPrecondition<UInt64>('balance', preconditions.account.balance, account.balance);
  checkPrecondition<UInt32>('nonce', preconditions.account.nonce, account.nonce);
  checkPrecondition<Field>(
    'receiptChainHash',
    preconditions.account.receiptChainHash,
    account.receiptChainHash
  );
  if (account.delegate !== null)
    checkPrecondition<PublicKey>('delegate', preconditions.account.delegate, account.delegate);
  checkPrecondition<Bool>('isProven', preconditions.account.isProven, account.zkapp.isProven);
  checkPrecondition<Bool>('isNew', preconditions.account.isNew, new Bool(account.isNew.get()));

  StateValues.checkPreconditions(account.State, account.zkapp.state, preconditions.account.state);

  const actionState = account.zkapp?.actionState ?? [];
  const actionStateSatisfied = Bool.anyTrue(
    actionState.map((s) => preconditions.account.actionState.isSatisfied(s))
  );
  if (actionStateSatisfied.not().toBoolean())
    errors.push(preconditionError('actionState', preconditions.account.actionState, actionState));

  // NETWORK PRECONDITIONS

  checkPrecondition('validWhile', preconditions.validWhile, chain.globalSlotSinceGenesis);
  checkPrecondition(
    'snarkedLedgerHash',
    preconditions.network.snarkedLedgerHash,
    chain.snarkedLedgerHash
  );
  checkPrecondition(
    'blockchainLength',
    preconditions.network.blockchainLength,
    chain.blockchainLength
  );
  checkPrecondition(
    'minWindowDensity',
    preconditions.network.minWindowDensity,
    chain.minWindowDensity
  );
  checkPrecondition('totalCurrency', preconditions.network.totalCurrency, chain.totalCurrency);
  checkPrecondition(
    'globalSlotSinceGenesis',
    preconditions.network.globalSlotSinceGenesis,
    chain.globalSlotSinceGenesis
  );

  function checkEpochLedgerPreconditions(
    name: string,
    epochLedgerPreconditions: EpochLedgerPreconditions,
    epochLedgerData: EpochLedgerData
  ) {
    checkPrecondition(`${name}.hash`, epochLedgerPreconditions.hash, epochLedgerData.hash);
    checkPrecondition(
      `${name}.totalCurrency`,
      epochLedgerPreconditions.totalCurrency,
      epochLedgerData.totalCurrency
    );
  }

  function checkEpochDataPreconditions(
    name: string,
    epochDataPreconditions: EpochDataPreconditions,
    epochData: EpochData
  ): void {
    checkPrecondition(`${name}.seed`, epochDataPreconditions.seed, epochData.seed);
    checkPrecondition(
      `${name}.startCheckpoint`,
      epochDataPreconditions.startCheckpoint,
      epochData.startCheckpoint
    );
    checkPrecondition(
      `${name}.lockCheckpoint`,
      epochDataPreconditions.lockCheckpoint,
      epochData.lockCheckpoint
    );
    checkPrecondition(
      `${name}.epochLength`,
      epochDataPreconditions.epochLength,
      epochData.epochLength
    );

    checkEpochLedgerPreconditions(
      `${name}.ledger`,
      epochDataPreconditions.ledger,
      epochData.ledger
    );
  }

  checkEpochDataPreconditions(
    'stakingEpochData',
    preconditions.network.stakingEpochData,
    chain.stakingEpochData
  );
  checkEpochDataPreconditions(
    'nextEpochData',
    preconditions.network.nextEpochData,
    chain.nextEpochData
  );
}

function checkPermissions<State extends StateLayout, Event, Action>(
  permissions: Permissions,
  update: AccountUpdate<State, Event, Action>,
  errors: Error[]
): void {
  function checkPermission(
    permissionName: string,
    requiredAuthLevel: AuthorizationLevel,
    actionIsPerformed: boolean
  ): void {
    if (actionIsPerformed && !requiredAuthLevel.isSatisfied(update.authorizationKind))
      errors.push(
        new Error(
          `${permissionName} permission was violated: account update has authorization kind ${update.authorizationKind.identifier()}, but required auth level is ${requiredAuthLevel.identifier()}`
        )
      );
  }

  checkPermission('access', permissions.access, true);
  checkPermission('send', permissions.send, update.balanceChange.isNegative().toBoolean());
  checkPermission('receive', permissions.receive, update.balanceChange.isPositive().toBoolean());
  checkPermission('incrementNonce', permissions.incrementNonce, update.incrementNonce.toBoolean());
  checkPermission('setDelegate', permissions.setDelegate, update.delegateUpdate.set.toBoolean());
  checkPermission(
    'setPermissions',
    permissions.setPermissions,
    update.permissionsUpdate.set.toBoolean()
  );
  checkPermission(
    'setVerificationKey',
    permissions.setVerificationKey.auth,
    update.verificationKeyUpdate.set.toBoolean()
  );
  checkPermission('setZkappUri', permissions.setZkappUri, update.zkappUriUpdate.set.toBoolean());
  checkPermission(
    'setTokenSymbol',
    permissions.setTokenSymbol,
    update.tokenSymbolUpdate.set.toBoolean()
  );
  checkPermission('setVotingFor', permissions.setVotingFor, update.votingForUpdate.set.toBoolean());
  checkPermission('setTiming', permissions.setTiming, update.timingUpdate.set.toBoolean());
  checkPermission(
    'editActionState',
    permissions.editActionState,
    update.pushActions.data.length > 0
  );
  checkPermission(
    'editState',
    permissions.editState,
    StateUpdates.anyValuesAreSet(update.stateUpdates).toBoolean()
  );
}

function applyUpdates<State extends StateLayout, Event, Action>(
  account: Account<State>,
  update: AccountUpdate<State, Event, Action>,
  feeExcessState: ApplyState<Int64>,
  errors: Error[]
): {
  updatedFeeExcessState: ApplyState<Int64>;
  updatedAccount: Account<State>;
} {
  function applyUpdate<T>(update: Update<T>, value: T): T {
    return update.set.toBoolean() ? update.value : value;
  }

  let actualBalanceChange: Int64 = update.balanceChange;

  if (account.isNew.get()) {
    const accountCreationFee = Int64.create(
      UInt64.from(ZkappConstants.ACCOUNT_CREATION_FEE),
      Sign.minusOne
    );

    feeExcessState = updateApplyState(
      feeExcessState,
      errors,
      (feeExcess) =>
        tryAddInt64(feeExcess, accountCreationFee) ??
        new Error('fee excess underflowed due when subtracting the account creation fee')
    );

    if (update.implicitAccountCreationFee.toBoolean()) {
      const balanceChangeWithoutCreationFee = tryAddInt64(actualBalanceChange, accountCreationFee);
      if (balanceChangeWithoutCreationFee === null) {
        errors.push(
          new Error('balance change underflowed when subtracting the account creation fee')
        );
      } else {
        actualBalanceChange = balanceChangeWithoutCreationFee;
      }
    }
  }

  const balanceSigned = Int64.create(account.balance, Sign.one);
  const updatedBalanceSigned = tryAddInt64(balanceSigned, actualBalanceChange);

  let updatedBalance = account.balance;
  if (updatedBalanceSigned === null) {
    errors.push(
      new Error('account balance overflowed or underflowed when applying balance change')
    );
  } else if (updatedBalanceSigned.isNegative().toBoolean()) {
    errors.push(new Error('account balance was negative after applying balance change'));
  } else {
    updatedBalance = updatedBalanceSigned.magnitude;
  }

  const allStateUpdated = Bool.allTrue(
    StateUpdates.toFieldUpdates(account.State, update.stateUpdates).map((update) => update.set)
  );

  const updatedAccount = new Account(account.State, false, {
    ...account,
    balance: updatedBalance,
    tokenSymbol: applyUpdate(update.tokenSymbolUpdate, account.tokenSymbol),
    nonce: update.incrementNonce.toBoolean() ? account.nonce.add(UInt32.one) : account.nonce,
    delegate: applyUpdate(update.delegateUpdate, account.delegate),
    votingFor: applyUpdate(update.votingForUpdate, account.votingFor),
    timing: applyUpdate(update.timingUpdate, account.timing),
    permissions: applyUpdate(update.permissionsUpdate, account.permissions),
    zkapp: {
      state: StateValues.applyUpdates(account.State, account.zkapp.state, update.stateUpdates),
      verificationKey: applyUpdate(update.verificationKeyUpdate, account.zkapp.verificationKey),
      actionState: /* TODO */ [
        new Field(0),
        new Field(0),
        new Field(0),
        new Field(0),
        new Field(0),
      ],
      isProven: account.zkapp.isProven.or(allStateUpdated),
      zkappUri: applyUpdate(update.zkappUriUpdate, account.zkapp.zkappUri),
    },
  });

  return { updatedFeeExcessState: feeExcessState, updatedAccount };
}

function checkAccountTiming<State extends StateLayout>(
  account: Account<State>,
  globalSlot: UInt32,
  errors: Error[]
): void {
  const minimumBalance = account.timing.minimumBalanceAtSlot(globalSlot);
  if (!account.balance.greaterThanOrEqual(minimumBalance).toBoolean())
    errors.push(new Error('account has an insufficient minimum balance after applying update'));
}

// TODO: It's a good idea to have a check somewhere which asserts an account is valid before trying
//       applying account updates (eg: the account balance already meets the minimum requirement of
//       the account timing). This will help prevent other mistakes that occur before applying an
//       account update.
function checkAndApplyAccountUpdate<State extends StateLayout, Event, Action>(
  chain: ChainView,
  account: Account<State>,
  update: AccountUpdate<State, Event, Action>,
  feeExcessState: ApplyState<Int64>
): ApplyResult<{
  updatedFeeExcessState: ApplyState<Int64>;
  updatedAccount: Account<State>;
}> {
  const errors: Error[] = [];

  if (!account.accountId.equals(update.accountId).toBoolean())
    errors.push(new Error('account id in account update does not match actual account id'));

  if (!account.zkapp.verificationKey.hash.equals(update.verificationKeyHash).toBoolean())
    errors.push(
      new Error(
        `account verification key does not match account update's verification key (account has ${account.zkapp.verificationKey.hash}, account update referenced ${update.verificationKeyHash})`
      )
    );

  // TODO: check mayUseToken (somewhere, maybe not here)

  checkPreconditions(chain, account, update.preconditions, errors);
  checkPermissions(account.permissions, update, errors);
  const { updatedFeeExcessState, updatedAccount } = applyUpdates(
    account,
    update,
    feeExcessState,
    errors
  );
  checkAccountTiming(updatedAccount, chain.globalSlotSinceGenesis, errors);

  if (errors.length === 0) {
    return { status: 'Applied', updatedFeeExcessState, updatedAccount };
  } else {
    return { status: 'Failed', errors };
  }
}

function checkAndApplyFeePayment(
  chain: ChainView,
  account: Account,
  feePayment: ZkappFeePayment
): ApplyResult<{ updatedAccount: Account }> {
  const result = checkAndApplyAccountUpdate(chain, account, feePayment.toAccountUpdate(), {
    status: 'Alive',
    value: Int64.zero,
  });

  if (result.status === 'Applied') {
    return { status: 'Applied', updatedAccount: result.updatedAccount };
  } else {
    return result;
  }
}
