import { Permissions } from './permissions.js';
import { StateDefinition, StateLayout, StateValues } from './state.js';
import { VerificationKey } from '../../proof-system/verification-key.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt64, UInt32 } from '../../provable/int.js';
import { Provable } from '../../provable/provable.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { TokenSymbol } from '../../../lib/provable/crypto/poseidon.js';
import { TokenId, ZkappUri } from './core.js';

export { AccountId, AccountTiming, AccountIdSet, Account, AccountIdMap };

function accountIdKeys(accountId: AccountId): {
  publicKey: string;
  tokenId: string;
} {
  return {
    publicKey: accountId.publicKey.toBase58(),
    tokenId: accountId.tokenId.toString(),
  };
}

class AccountId {
  constructor(public publicKey: PublicKey, public tokenId: TokenId) {}

  equals(x: AccountId): Bool {
    return Bool.allTrue([this.publicKey.equals(x.publicKey), this.tokenId.equals(x.tokenId)]);
  }

  static empty(): AccountId {
    return new AccountId(PublicKey.empty(), TokenId.MINA);
  }

  static sizeInFields(): number {
    return PublicKey.sizeInFields() + Field.sizeInFields();
  }

  static toFields(x: AccountId): Field[] {
    return [...PublicKey.toFields(x.publicKey), x.tokenId.value];
  }

  static toAuxiliary(_x?: AccountId): any[] {
    return [];
  }

  static fromFields(fields: Field[], _aux: any[]): AccountId {
    return new AccountId(
      PublicKey.fromFields(fields.slice(0, PublicKey.sizeInFields())),
      new TokenId(fields[PublicKey.sizeInFields()])
    );
  }

  static toValue(x: AccountId): AccountId {
    return x;
  }

  static fromValue(x: AccountId): AccountId {
    return x;
  }

  static check(_x: AccountId) {
    // TODO NOW
  }
}

class AccountIdMap<T> {
  private data: { [publicKey: string]: { [tokenId: string]: T } };

  constructor() {
    this.data = {};
  }

  has(accountId: AccountId): boolean {
    const { publicKey, tokenId } = accountIdKeys(accountId);
    const tokenAccounts = this.data[publicKey] ?? {};
    return tokenId in tokenAccounts;
  }

  get(accountId: AccountId): T | null {
    const { publicKey, tokenId } = accountIdKeys(accountId);
    const tokenAccounts = this.data[publicKey] ?? {};
    return tokenAccounts[tokenId] ?? null;
  }

  set(accountId: AccountId, value: T): void {
    const { publicKey, tokenId } = accountIdKeys(accountId);
    if (!(publicKey in this.data)) this.data[publicKey] = {};
    this.data[publicKey][tokenId] = value;
  }

  update(accountId: AccountId, f: (x: T | null) => T): void {
    const value = this.get(accountId);
    const updatedValue = f(value);
    this.set(accountId, updatedValue);
  }
}

class AccountIdSet {
  private idMap: AccountIdMap<null>;

  constructor() {
    this.idMap = new AccountIdMap();
  }

  has(accountId: AccountId): boolean {
    return this.idMap.has(accountId);
  }

  add(accountId: AccountId): void {
    this.idMap.set(accountId, null);
  }
}

class AccountTiming {
  initialMinimumBalance: UInt64;
  cliffTime: UInt32;
  cliffAmount: UInt64;
  vestingPeriod: UInt32;
  vestingIncrement: UInt64;

  constructor({
    initialMinimumBalance,
    cliffTime,
    cliffAmount,
    vestingPeriod,
    vestingIncrement,
  }: {
    initialMinimumBalance: UInt64;
    cliffTime: UInt32;
    cliffAmount: UInt64;
    vestingPeriod: UInt32;
    vestingIncrement: UInt64;
  }) {
    this.initialMinimumBalance = initialMinimumBalance;
    this.cliffTime = cliffTime;
    this.cliffAmount = cliffAmount;
    this.vestingPeriod = vestingPeriod;
    this.vestingIncrement = vestingIncrement;
  }

  minimumBalanceAtSlot(globalSlot: UInt32): UInt64 {
    // TODO: implement the provable friendly version of this function
    // const beforeVestingCliff = globalSlot.lessThan(this.cliffTime);
    // Provable.if(
    //   beforeVestingCliff,
    //   UInt64,
    //   this.initialMinimumBalance,
    //   ...
    // )

    if (Provable.inCheckedComputation())
      throw new Error('cannot call minimumBalanceAtSlot from a checked computation');

    if (globalSlot.lessThan(this.cliffTime).toBoolean()) {
      return this.initialMinimumBalance;
    } else if (this.vestingPeriod.equals(UInt32.zero).toBoolean()) {
      return UInt64.zero;
    } else if (this.initialMinimumBalance.lessThan(this.cliffAmount).toBoolean()) {
      return UInt64.zero;
    } else {
      const minBalanceAfterCliff = this.initialMinimumBalance.sub(this.cliffAmount);
      const numPeriodsVested = globalSlot.sub(this.cliffTime).div(this.vestingPeriod).toUInt64();

      const vestingDecrementWillOverflow =
        !numPeriodsVested.equals(UInt64.zero).toBoolean() &&
        UInt64.MAXINT().div(numPeriodsVested).lessThan(this.vestingIncrement).toBoolean();
      const vestingDecrement = vestingDecrementWillOverflow
        ? UInt64.MAXINT()
        : numPeriodsVested.mul(this.vestingIncrement);

      if (minBalanceAfterCliff.lessThan(vestingDecrement).toBoolean()) {
        return UInt64.zero;
      } else {
        return minBalanceAfterCliff.sub(vestingDecrement);
      }
    }
  }

  static empty(): AccountTiming {
    return new AccountTiming({
      initialMinimumBalance: UInt64.empty(),
      cliffTime: UInt32.empty(),
      cliffAmount: UInt64.empty(),
      vestingPeriod: UInt32.empty(),
      vestingIncrement: UInt64.empty(),
    });
  }
}

class Account<State extends StateLayout = 'GenericState'> {
  State: StateDefinition<State>;
  isNew: Unconstrained<boolean>;

  accountId: AccountId;
  tokenSymbol: TokenSymbol;
  balance: UInt64;
  nonce: UInt32;
  receiptChainHash: Field; // TODO: ReceiptChainHash
  delegate: PublicKey | null;
  votingFor: Field; // TODO: StateHash;
  timing: AccountTiming;
  permissions: Permissions;

  // TODO: it's important that we have the notion of "default" zkapp state, to and convert accordingly to/from JSON
  zkapp: {
    state: StateValues<State>;
    verificationKey: VerificationKey;
    // TODO:
    // zkappVersion: ...;
    actionState: Field[];
    // lastActionSlot: ...;
    // TODO: s/isProven/isProved/ (it's either "was proven" or "is proved", not "is proven")
    isProven: Bool;
    zkappUri: ZkappUri;
  };

  constructor(
    State: StateDefinition<State>,
    isNew: boolean | Unconstrained<boolean>,
    data: {
      accountId: AccountId;
      tokenSymbol: TokenSymbol;
      balance: UInt64;
      nonce: UInt32;
      receiptChainHash: Field;
      delegate: PublicKey | null;
      votingFor: Field;
      timing: AccountTiming;
      permissions: Permissions;
      zkapp?: {
        state: StateValues<State>;
        verificationKey: VerificationKey;
        // TODO:
        // zkappVersion: ...;
        actionState: Field[];
        // lastActionSlot: ...;
        // TODO: s/isProven/isProved/ (it's either "was proven" or "is proved", not "is proven")
        isProven: Bool;
        zkappUri: ZkappUri;
      };
    }
  ) {
    this.State = State;

    this.isNew = isNew instanceof Unconstrained ? isNew : Unconstrained.from(isNew);

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
      state: data.zkapp?.state ?? StateValues.empty(this.State),
      verificationKey: data.zkapp?.verificationKey ?? VerificationKey.dummySync(),
      actionState: [new Field(0), new Field(0), new Field(0), new Field(0), new Field(0)], // TODO NOW
      isProven: data.zkapp?.isProven ?? new Bool(false),
      zkappUri: data.zkapp?.zkappUri ?? ZkappUri.empty(),
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

  toGeneric(): Account {
    return new Account<'GenericState'>('GenericState', this.isNew, {
      ...this,
      zkapp: {
        ...this.zkapp,
        state: StateValues.toGeneric(this.State, this.zkapp.state),
      },
    });
  }

  static fromGeneric<State extends StateLayout>(
    account: Account,
    State: StateDefinition<State>
  ): Account<State> {
    return new Account(State, account.isNew, {
      ...account,
      zkapp: {
        ...account.zkapp,
        state: StateValues.fromGeneric(account.zkapp.state, State),
      },
    });
  }

  static empty(accountId: AccountId): Account {
    return new Account('GenericState', true, {
      accountId,
      tokenSymbol: TokenSymbol.empty(),
      balance: UInt64.zero,
      nonce: UInt32.zero,
      receiptChainHash: new Field(0), // ReceiptChainHash.empty()
      delegate: null,
      votingFor: new Field(0),
      timing: AccountTiming.empty(),
      permissions: Permissions.defaults(),
    });
  }
}
