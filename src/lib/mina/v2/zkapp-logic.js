import { Account } from './account.js';
import { StateUpdates, StateValues } from './state.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Int64, Sign, UInt64, UInt32 } from '../../provable/int.js';
import { ZkappConstants } from '../v1/constants.js';
export { checkAndApplyAccountUpdate, checkAndApplyFeePayment };
function updateApplyState(applyState, errors, f) {
    switch (applyState.status) {
        case 'Alive':
            const result = f(applyState.value);
            if (result instanceof Error) {
                errors.push(result);
                return { status: 'Dead' };
            }
            else {
                return { status: 'Alive', value: result };
            }
        case 'Dead':
            return applyState;
    }
}
// TODO: make this function checked-friednly, and move this function into the Int64 type directly
function tryAddInt64(a, b) {
    if (a.sgn.equals(b.sgn).toBoolean() && a.magnitude.lessThan(b.magnitude).toBoolean())
        return null;
    return a.add(b);
}
function checkPreconditions(chain, account, preconditions, errors) {
    function preconditionError(preconditionName, constraint, value) {
        return new Error(`${preconditionName} precondition failed: ${value} does not satisfy "${constraint.toStringHuman()}"`);
    }
    // WARNING: failing to specify the type parameter on this function exhibits unsound behavior
    //          (thanks typescript)
    // I think you can do something to fix this with NoInfer, but a first attempt at that seemed
    // to break it even more.
    function checkPrecondition(preconditionName, constraint, value) {
        if (constraint.isSatisfied(value).not().toBoolean())
            errors.push(preconditionError(preconditionName, constraint, value));
    }
    // ACCOUNT PRECONDITIONS
    checkPrecondition('balance', preconditions.account.balance, account.balance);
    checkPrecondition('nonce', preconditions.account.nonce, account.nonce);
    checkPrecondition('receiptChainHash', preconditions.account.receiptChainHash, account.receiptChainHash);
    if (account.delegate !== null)
        checkPrecondition('delegate', preconditions.account.delegate, account.delegate);
    checkPrecondition('isProven', preconditions.account.isProven, account.zkapp.isProven);
    checkPrecondition('isNew', preconditions.account.isNew, new Bool(account.isNew.get()));
    StateValues.checkPreconditions(account.State, account.zkapp.state, preconditions.account.state);
    const actionState = account.zkapp?.actionState ?? [];
    const actionStateSatisfied = Bool.anyTrue(actionState.map((s) => preconditions.account.actionState.isSatisfied(s)));
    if (actionStateSatisfied.not().toBoolean())
        errors.push(preconditionError('actionState', preconditions.account.actionState, actionState));
    // NETWORK PRECONDITIONS
    checkPrecondition('validWhile', preconditions.validWhile, chain.globalSlotSinceGenesis);
    checkPrecondition('snarkedLedgerHash', preconditions.network.snarkedLedgerHash, chain.snarkedLedgerHash);
    checkPrecondition('blockchainLength', preconditions.network.blockchainLength, chain.blockchainLength);
    checkPrecondition('minWindowDensity', preconditions.network.minWindowDensity, chain.minWindowDensity);
    checkPrecondition('totalCurrency', preconditions.network.totalCurrency, chain.totalCurrency);
    checkPrecondition('globalSlotSinceGenesis', preconditions.network.globalSlotSinceGenesis, chain.globalSlotSinceGenesis);
    function checkEpochLedgerPreconditions(name, epochLedgerPreconditions, epochLedgerData) {
        checkPrecondition(`${name}.hash`, epochLedgerPreconditions.hash, epochLedgerData.hash);
        checkPrecondition(`${name}.totalCurrency`, epochLedgerPreconditions.totalCurrency, epochLedgerData.totalCurrency);
    }
    function checkEpochDataPreconditions(name, epochDataPreconditions, epochData) {
        checkPrecondition(`${name}.seed`, epochDataPreconditions.seed, epochData.seed);
        checkPrecondition(`${name}.startCheckpoint`, epochDataPreconditions.startCheckpoint, epochData.startCheckpoint);
        checkPrecondition(`${name}.lockCheckpoint`, epochDataPreconditions.lockCheckpoint, epochData.lockCheckpoint);
        checkPrecondition(`${name}.epochLength`, epochDataPreconditions.epochLength, epochData.epochLength);
        checkEpochLedgerPreconditions(`${name}.ledger`, epochDataPreconditions.ledger, epochData.ledger);
    }
    checkEpochDataPreconditions('stakingEpochData', preconditions.network.stakingEpochData, chain.stakingEpochData);
    checkEpochDataPreconditions('nextEpochData', preconditions.network.nextEpochData, chain.nextEpochData);
}
function checkPermissions(permissions, update, errors) {
    function checkPermission(permissionName, requiredAuthLevel, actionIsPerformed) {
        if (actionIsPerformed && !requiredAuthLevel.isSatisfied(update.authorizationKind))
            errors.push(new Error(`${permissionName} permission was violated: account update has authorization kind ${update.authorizationKind.identifier()}, but required auth level is ${requiredAuthLevel.identifier()}`));
    }
    checkPermission('access', permissions.access, true);
    checkPermission('send', permissions.send, update.balanceChange.isNegative().toBoolean());
    checkPermission('receive', permissions.receive, update.balanceChange.isPositive().toBoolean());
    checkPermission('incrementNonce', permissions.incrementNonce, update.incrementNonce.toBoolean());
    checkPermission('setDelegate', permissions.setDelegate, update.delegateUpdate.set.toBoolean());
    checkPermission('setPermissions', permissions.setPermissions, update.permissionsUpdate.set.toBoolean());
    checkPermission('setVerificationKey', permissions.setVerificationKey.auth, update.verificationKeyUpdate.set.toBoolean());
    checkPermission('setZkappUri', permissions.setZkappUri, update.zkappUriUpdate.set.toBoolean());
    checkPermission('setTokenSymbol', permissions.setTokenSymbol, update.tokenSymbolUpdate.set.toBoolean());
    checkPermission('setVotingFor', permissions.setVotingFor, update.votingForUpdate.set.toBoolean());
    checkPermission('setTiming', permissions.setTiming, update.timingUpdate.set.toBoolean());
    checkPermission('editActionState', permissions.editActionState, update.pushActions.data.length > 0);
    checkPermission('editState', permissions.editState, StateUpdates.anyValuesAreSet(update.stateUpdates).toBoolean());
}
function applyUpdates(account, update, feeExcessState, errors) {
    function applyUpdate(update, value) {
        return update.set.toBoolean() ? update.value : value;
    }
    let actualBalanceChange = update.balanceChange;
    if (account.isNew.get()) {
        const accountCreationFee = Int64.create(UInt64.from(ZkappConstants.ACCOUNT_CREATION_FEE), Sign.minusOne);
        feeExcessState = updateApplyState(feeExcessState, errors, (feeExcess) => tryAddInt64(feeExcess, accountCreationFee) ??
            new Error('fee excess underflowed due when subtracting the account creation fee'));
        if (update.implicitAccountCreationFee.toBoolean()) {
            const balanceChangeWithoutCreationFee = tryAddInt64(actualBalanceChange, accountCreationFee);
            if (balanceChangeWithoutCreationFee === null) {
                errors.push(new Error('balance change underflowed when subtracting the account creation fee'));
            }
            else {
                actualBalanceChange = balanceChangeWithoutCreationFee;
            }
        }
    }
    const balanceSigned = Int64.create(account.balance, Sign.one);
    const updatedBalanceSigned = tryAddInt64(balanceSigned, actualBalanceChange);
    let updatedBalance = account.balance;
    if (updatedBalanceSigned === null) {
        errors.push(new Error('account balance overflowed or underflowed when applying balance change'));
    }
    else if (updatedBalanceSigned.isNegative().toBoolean()) {
        errors.push(new Error('account balance was negative after applying balance change'));
    }
    else {
        updatedBalance = updatedBalanceSigned.magnitude;
    }
    const allStateUpdated = Bool.allTrue(StateUpdates.toFieldUpdates(account.State, update.stateUpdates).map((update) => update.set));
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
function checkAccountTiming(account, globalSlot, errors) {
    const minimumBalance = account.timing.minimumBalanceAtSlot(globalSlot);
    if (!account.balance.greaterThanOrEqual(minimumBalance).toBoolean())
        errors.push(new Error('account has an insufficient minimum balance after applying update'));
}
// TODO: It's a good idea to have a check somewhere which asserts an account is valid before trying
//       applying account updates (eg: the account balance already meets the minimum requirement of
//       the account timing). This will help prevent other mistakes that occur before applying an
//       account update.
function checkAndApplyAccountUpdate(chain, account, update, feeExcessState) {
    const errors = [];
    if (!account.accountId.equals(update.accountId).toBoolean())
        errors.push(new Error('account id in account update does not match actual account id'));
    if (!account.zkapp.verificationKey.hash.equals(update.verificationKeyHash).toBoolean())
        errors.push(new Error(`account verification key does not match account update's verification key (account has ${account.zkapp.verificationKey.hash}, account update referenced ${update.verificationKeyHash})`));
    // TODO: check mayUseToken (somewhere, maybe not here)
    checkPreconditions(chain, account, update.preconditions, errors);
    checkPermissions(account.permissions, update, errors);
    const { updatedFeeExcessState, updatedAccount } = applyUpdates(account, update, feeExcessState, errors);
    checkAccountTiming(updatedAccount, chain.globalSlotSinceGenesis, errors);
    if (errors.length === 0) {
        return { status: 'Applied', updatedFeeExcessState, updatedAccount };
    }
    else {
        return { status: 'Failed', errors };
    }
}
function checkAndApplyFeePayment(chain, account, feePayment) {
    const result = checkAndApplyAccountUpdate(chain, account, feePayment.toAccountUpdate(), {
        status: 'Alive',
        value: Int64.zero,
    });
    if (result.status === 'Applied') {
        return { status: 'Applied', updatedAccount: result.updatedAccount };
    }
    else {
        return result;
    }
}
