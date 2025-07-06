"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountIdMap = exports.Account = exports.AccountIdSet = exports.AccountTiming = exports.AccountId = void 0;
const permissions_js_1 = require("./permissions.js");
const state_js_1 = require("./state.js");
const verification_key_js_1 = require("../../proof-system/verification-key.js");
const bool_js_1 = require("../../provable/bool.js");
const field_js_1 = require("../../provable/field.js");
const int_js_1 = require("../../provable/int.js");
const provable_js_1 = require("../../provable/provable.js");
const signature_js_1 = require("../../provable/crypto/signature.js");
const unconstrained_js_1 = require("../../provable/types/unconstrained.js");
const poseidon_js_1 = require("../../../lib/provable/crypto/poseidon.js");
const core_js_1 = require("./core.js");
function accountIdKeys(accountId) {
    return {
        publicKey: accountId.publicKey.toBase58(),
        tokenId: accountId.tokenId.toString(),
    };
}
class AccountId {
    constructor(publicKey, tokenId) {
        this.publicKey = publicKey;
        this.tokenId = tokenId;
    }
    equals(x) {
        return bool_js_1.Bool.allTrue([this.publicKey.equals(x.publicKey), this.tokenId.equals(x.tokenId)]);
    }
    static empty() {
        return new AccountId(signature_js_1.PublicKey.empty(), core_js_1.TokenId.MINA);
    }
    static sizeInFields() {
        return signature_js_1.PublicKey.sizeInFields() + field_js_1.Field.sizeInFields();
    }
    static toFields(x) {
        return [...signature_js_1.PublicKey.toFields(x.publicKey), x.tokenId.value];
    }
    static toAuxiliary(_x) {
        return [];
    }
    static fromFields(fields, _aux) {
        return new AccountId(signature_js_1.PublicKey.fromFields(fields.slice(0, signature_js_1.PublicKey.sizeInFields())), new core_js_1.TokenId(fields[signature_js_1.PublicKey.sizeInFields()]));
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static check(_x) {
        // TODO NOW
    }
}
exports.AccountId = AccountId;
class AccountIdMap {
    constructor() {
        this.data = {};
    }
    has(accountId) {
        const { publicKey, tokenId } = accountIdKeys(accountId);
        const tokenAccounts = this.data[publicKey] ?? {};
        return tokenId in tokenAccounts;
    }
    get(accountId) {
        const { publicKey, tokenId } = accountIdKeys(accountId);
        const tokenAccounts = this.data[publicKey] ?? {};
        return tokenAccounts[tokenId] ?? null;
    }
    set(accountId, value) {
        const { publicKey, tokenId } = accountIdKeys(accountId);
        if (!(publicKey in this.data))
            this.data[publicKey] = {};
        this.data[publicKey][tokenId] = value;
    }
    update(accountId, f) {
        const value = this.get(accountId);
        const updatedValue = f(value);
        this.set(accountId, updatedValue);
    }
}
exports.AccountIdMap = AccountIdMap;
class AccountIdSet {
    constructor() {
        this.idMap = new AccountIdMap();
    }
    has(accountId) {
        return this.idMap.has(accountId);
    }
    add(accountId) {
        this.idMap.set(accountId, null);
    }
}
exports.AccountIdSet = AccountIdSet;
class AccountTiming {
    constructor({ initialMinimumBalance, cliffTime, cliffAmount, vestingPeriod, vestingIncrement, }) {
        this.initialMinimumBalance = initialMinimumBalance;
        this.cliffTime = cliffTime;
        this.cliffAmount = cliffAmount;
        this.vestingPeriod = vestingPeriod;
        this.vestingIncrement = vestingIncrement;
    }
    minimumBalanceAtSlot(globalSlot) {
        // TODO: implement the provable friendly version of this function
        // const beforeVestingCliff = globalSlot.lessThan(this.cliffTime);
        // Provable.if(
        //   beforeVestingCliff,
        //   UInt64,
        //   this.initialMinimumBalance,
        //   ...
        // )
        if (provable_js_1.Provable.inCheckedComputation())
            throw new Error('cannot call minimumBalanceAtSlot from a checked computation');
        if (globalSlot.lessThan(this.cliffTime).toBoolean()) {
            return this.initialMinimumBalance;
        }
        else if (this.vestingPeriod.equals(int_js_1.UInt32.zero).toBoolean()) {
            return int_js_1.UInt64.zero;
        }
        else if (this.initialMinimumBalance.lessThan(this.cliffAmount).toBoolean()) {
            return int_js_1.UInt64.zero;
        }
        else {
            const minBalanceAfterCliff = this.initialMinimumBalance.sub(this.cliffAmount);
            const numPeriodsVested = globalSlot.sub(this.cliffTime).div(this.vestingPeriod).toUInt64();
            const vestingDecrementWillOverflow = !numPeriodsVested.equals(int_js_1.UInt64.zero).toBoolean() &&
                int_js_1.UInt64.MAXINT().div(numPeriodsVested).lessThan(this.vestingIncrement).toBoolean();
            const vestingDecrement = vestingDecrementWillOverflow
                ? int_js_1.UInt64.MAXINT()
                : numPeriodsVested.mul(this.vestingIncrement);
            if (minBalanceAfterCliff.lessThan(vestingDecrement).toBoolean()) {
                return int_js_1.UInt64.zero;
            }
            else {
                return minBalanceAfterCliff.sub(vestingDecrement);
            }
        }
    }
    static empty() {
        return new AccountTiming({
            initialMinimumBalance: int_js_1.UInt64.empty(),
            cliffTime: int_js_1.UInt32.empty(),
            cliffAmount: int_js_1.UInt64.empty(),
            vestingPeriod: int_js_1.UInt32.empty(),
            vestingIncrement: int_js_1.UInt64.empty(),
        });
    }
}
exports.AccountTiming = AccountTiming;
class Account {
    constructor(State, isNew, data) {
        this.State = State;
        this.isNew = isNew instanceof unconstrained_js_1.Unconstrained ? isNew : unconstrained_js_1.Unconstrained.from(isNew);
        this.accountId = data.accountId;
        this.tokenSymbol = data.tokenSymbol;
        this.balance = data.balance;
        this.nonce = data.nonce;
        this.receiptChainHash = data.receiptChainHash;
        this.delegate = data.delegate;
        this.votingFor = data.votingFor;
        this.timing = data.timing;
        this.permissions = data.permissions;
        this.zkapp = {
            state: data.zkapp?.state ?? state_js_1.StateValues.empty(this.State),
            verificationKey: data.zkapp?.verificationKey ?? verification_key_js_1.VerificationKey.dummySync(),
            actionState: [new field_js_1.Field(0), new field_js_1.Field(0), new field_js_1.Field(0), new field_js_1.Field(0), new field_js_1.Field(0)], // TODO NOW
            isProven: data.zkapp?.isProven ?? new bool_js_1.Bool(false),
            zkappUri: data.zkapp?.zkappUri ?? core_js_1.ZkappUri.empty(),
        };
    }
    /*
      checkAndApplyFeePayment(
        feePayment: ZkappFeePayment
      ):
        | { status: 'Applied'; updatedAccount: Account<State> }
        | { status: 'Failed'; errors: Error[] } {
        const errors: Error[] = [];
    
        if (this.accountId.tokenId.equals(TokenId.MINA).not().toBoolean())
          errors.push(new Error('cannot pay zkapp fee with a non-mina account'));
    
        if (this.accountId.publicKey.equals(feePayment.publicKey).not().toBoolean())
          errors.push(
            new Error('fee payment public key does not match account public key')
          );
    
        if (this.nonce.equals(feePayment.nonce).not().toBoolean())
          errors.push(new Error('invalid account nonce'));
    
        if (this.balance.lessThan(feePayment.fee).toBoolean())
          errors.push(
            new Error(
              'account does not have enough balance to pay the required fee'
            )
          );
    
        // TODO: validWhile (probably checked elsewhere)
    
        if (errors.length === 0) {
          const updatedAccount = new Account(this.State, false, {
            ...this,
            balance: this.balance.sub(feePayment.fee),
            nonce: this.nonce.add(UInt32.one),
          });
          return { status: 'Applied', updatedAccount };
        } else {
          return { status: 'Failed', errors };
        }
      }
    
      // TODO: replay checks (probably live on the AccountUpdate itself, but needs to be called near this)
      checkAndApplyUpdate<Event, Action>(
        update: AccountUpdate<State, Event, Action>
      ):
        | { status: 'Applied'; updatedAccount: Account<State> }
        | { status: 'Failed'; errors: Error[] } {
        const errors: Error[] = [];
    
        if (this.accountId.equals(update.accountId).not().toBoolean())
          errors.push(
            new Error(
              'account id in account update does not match actual account id'
            )
          );
    
        // TODO: check verificationKeyHash
        // TODO: check mayUseToken (somewhere, maybe not here)
    
        // CHECK PRECONDITIONS
    
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
        function checkPrecondition<T>(
          preconditionName: string,
          constraint: { isSatisfied(x: T): Bool; toStringHuman(): string },
          value: T
        ): void {
          if (constraint.isSatisfied(value).not().toBoolean())
            errors.push(preconditionError(preconditionName, constraint, value));
        }
    
        checkPrecondition<UInt64>(
          'balance',
          update.preconditions.account.balance,
          this.balance
        );
        checkPrecondition<UInt32>(
          'nonce',
          update.preconditions.account.nonce,
          this.nonce
        );
        checkPrecondition<Field>(
          'receiptChainHash',
          update.preconditions.account.receiptChainHash,
          this.receiptChainHash
        );
        if (this.delegate !== null)
          checkPrecondition<PublicKey>(
            'delegate',
            update.preconditions.account.delegate,
            this.delegate
          );
        checkPrecondition<Bool>(
          'isProven',
          update.preconditions.account.isProven,
          this.zkapp.isProven
        );
    
        StateValues.checkPreconditions(
          this.State,
          this.zkapp.state,
          update.preconditions.account.state
        );
    
        const actionState = this.zkapp?.actionState ?? [];
        const actionStateSatisfied = Bool.anyTrue(
          actionState.map((s) =>
            update.preconditions.account.actionState.isSatisfied(s)
          )
        );
        if (actionStateSatisfied.not().toBoolean())
          errors.push(
            preconditionError(
              'actionState',
              update.preconditions.account.actionState,
              actionState
            )
          );
    
        // TODO: updates.preconditions.account.isNew
    
        // TODO: network (probably checked elsewhere)
        // TODO: validWhile (probably checked elsewhere)
    
        // CHECK PERMISSIONS
    
        function checkPermission(
          permissionName: string,
          requiredAuthLevel: AuthorizationLevel,
          actionIsPerformed: boolean
        ): void {
          if(actionIsPerformed && !requiredAuthLevel.isSatisfied(update.authorizationKind))
            errors.push(new Error(
              `${permissionName} permission was violated: account update has authorization kind ${update.authorizationKind.identifier()}, but required auth level is ${requiredAuthLevel.identifier()}`
            ));
        }
    
        checkPermission('access', this.permissions.access, true);
        checkPermission('send', this.permissions.send, update.balanceChange.isNegative().toBoolean());
        checkPermission('receive', this.permissions.receive, update.balanceChange.isPositive().toBoolean());
        checkPermission('incrementNonce', this.permissions.incrementNonce, update.incrementNonce.toBoolean());
        checkPermission('setDelegate', this.permissions.setDelegate, update.delegateUpdate.set.toBoolean());
        checkPermission('setPermissions', this.permissions.setPermissions, update.permissionsUpdate.set.toBoolean());
        checkPermission('setVerificationKey', this.permissions.setVerificationKey.auth, update.verificationKeyUpdate.set.toBoolean());
        checkPermission('setZkappUri', this.permissions.setZkappUri, update.zkappUriUpdate.set.toBoolean());
        checkPermission('setTokenSymbol', this.permissions.setTokenSymbol, update.tokenSymbolUpdate.set.toBoolean());
        checkPermission('setVotingFor', this.permissions.setVotingFor, update.votingForUpdate.set.toBoolean());
        checkPermission('setTiming', this.permissions.setTiming, update.timingUpdate.set.toBoolean());
        checkPermission('editActionState', this.permissions.editActionState, update.pushActions.data.length > 0);
        checkPermission('editState', this.permissions.editState, StateUpdates.anyValuesAreSet(update.stateUpdates).toBoolean());
    
        // APPLY UPDATES
    
        // TODO: account for implicitAccountCreationFee here
        let updatedBalance: UInt64 = this.balance;
        // TODO: why is Int64 not comparable?
        // if(update.balanceChange.lessThan(Int64.create(this.balance, Sign.minusOne)).toBoolean())
        if (
          update.balanceChange.isNegative().toBoolean() &&
          update.balanceChange.magnitude.greaterThan(this.balance).toBoolean()
        ) {
          errors.push(
            new Error(
              `insufficient balance for balanceChange (balance = ${this.balance}, balanceChange = -${update.balanceChange.magnitude})`
            )
          );
        } else {
          // TODO: check for overflows?
          const isPos = update.balanceChange.isPositive().toBoolean();
          const amount = update.balanceChange.magnitude;
          updatedBalance = isPos
            ? this.balance.add(amount)
            : this.balance.sub(amount);
        }
    
        // TODO: pushEvents
        // TODO: pushActions
    
        if (errors.length === 0) {
          function applyUpdate<T>(update: Update<T>, value: T): T {
            return update.set.toBoolean() ? update.value : value;
          }
    
          const allStateUpdated = Bool.allTrue(
            StateUpdates.toFieldUpdates(this.State, update.stateUpdates).map(
              (update) => update.set
            )
          );
    
          const updatedAccount = new Account(this.State, false, {
            ...this,
            balance: updatedBalance,
            tokenSymbol: applyUpdate(update.tokenSymbolUpdate, this.tokenSymbol),
            nonce: update.incrementNonce.toBoolean()
              ? this.nonce.add(UInt32.one)
              : this.nonce,
            delegate: applyUpdate(update.delegateUpdate, this.delegate),
            votingFor: applyUpdate(update.votingForUpdate, this.votingFor),
            timing: applyUpdate(update.timingUpdate, this.timing),
            permissions: applyUpdate(update.permissionsUpdate, this.permissions),
            zkapp: {
              state: StateValues.applyUpdates(
                this.State,
                this.zkapp.state,
                update.stateUpdates
              ),
              verificationKey: applyUpdate(
                update.verificationKeyUpdate,
                this.zkapp.verificationKey
              ),
              // actionState: TODO,
              isProven: this.zkapp.isProven.or(allStateUpdated),
              zkappUri: applyUpdate(update.zkappUriUpdate, this.zkapp.zkappUri),
            },
          });
    
          return { status: 'Applied', updatedAccount };
        } else {
          return { status: 'Failed', errors };
        }
      }
      */
    toGeneric() {
        return new Account('GenericState', this.isNew, {
            ...this,
            zkapp: {
                ...this.zkapp,
                state: state_js_1.StateValues.toGeneric(this.State, this.zkapp.state),
            },
        });
    }
    static fromGeneric(account, State) {
        return new Account(State, account.isNew, {
            ...account,
            zkapp: {
                ...account.zkapp,
                state: state_js_1.StateValues.fromGeneric(account.zkapp.state, State),
            },
        });
    }
    static empty(accountId) {
        return new Account('GenericState', true, {
            accountId,
            tokenSymbol: poseidon_js_1.TokenSymbol.empty(),
            balance: int_js_1.UInt64.zero,
            nonce: int_js_1.UInt32.zero,
            receiptChainHash: new field_js_1.Field(0), // ReceiptChainHash.empty()
            delegate: null,
            votingFor: new field_js_1.Field(0),
            timing: AccountTiming.empty(),
            permissions: permissions_js_1.Permissions.defaults(),
        });
    }
}
exports.Account = Account;
