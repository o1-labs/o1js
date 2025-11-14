import { TokenSymbol } from '../../../lib/provable/crypto/poseidon.js';
import { VerificationKey } from '../../proof-system/verification-key.js';
import { Bool } from '../../provable/bool.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { Field } from '../../provable/field.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { Provable } from '../../provable/provable.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { Account as AccountV1 } from '../v1/account.js';
import { TokenId, ZkappUri } from './core.js';
import { Permissions } from './permissions.js';
import { GenericStateValues, StateDefinition, StateLayout, StateValues } from './state.js';

export { Account, AccountId, AccountIdMap, AccountIdSet, AccountTiming };

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
  constructor(
    public publicKey: PublicKey,
    public tokenId: TokenId
  ) {}

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
        state: StateValues.fromGeneric(account.zkapp?.state ?? {}, State),
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

  static fromV1(account: AccountV1): Account<'GenericState'> {
    const {
      publicKey,
      tokenId: tokenIdValue,
      tokenSymbol: tokenSymbolValue,
      delegate: delegateValue,
      timing: timingValue,
      permissions: permissionsValue,
      zkapp: zkappValue,
      ...rest
    } = account;

    const tokenId = new TokenId(tokenIdValue);
    const accountId = new AccountId(publicKey, tokenId);
    const tokenSymbol = new TokenSymbol(tokenSymbolValue);
    const delegate = delegateValue ?? null;
    const timing = new AccountTiming(timingValue);
    const permissions = Permissions.fromInternalRepr(permissionsValue);

    const zkapp = (() => {
      if (!zkappValue) {
        return undefined;
      }

      const {
        appState,
        verificationKey: verificationKeyValue,
        provedState,
        zkappUri: zkAppUriValue,
        ...rest
      } = zkappValue;
      if (!verificationKeyValue) {
        return undefined;
      }

      const verificationKey = new VerificationKey(verificationKeyValue);
      const state = new GenericStateValues(appState);
      const zkappUri = new ZkappUri(zkAppUriValue);

      return {
        state,
        verificationKey,
        zkappUri,
        isProven: provedState,
        ...rest,
      };
    })();

    return new Account<'GenericState'>('GenericState', false, {
      accountId,
      tokenSymbol,
      delegate,
      timing,
      permissions,
      zkapp,
      ...rest,
    });
  }

  toV1(): AccountV1 {
    const { accountId, tokenSymbol, delegate, zkapp: zkappValue, timing, ...rest } = this;

    const zkapp = (() => {
      if (!zkappValue) {
        return undefined;
      }

      const { state, verificationKey, zkappUri, isProven, ...rest } = zkappValue;
      try {
        return {
          appState: state.values,
          verificationKey: {
            data: verificationKey.data,
            hash: verificationKey.hash,
          },
          zkappUri: zkappUri.data,
          provedState: isProven,
          zkappVersion: UInt32.empty(),
          lastActionSlot: UInt32.empty(),
          ...rest,
        };
      } catch(e) {
        console.error(e);
        console.log(state);
        throw e
      }
    })();

    return {
      publicKey: accountId.publicKey,
      tokenId: accountId.tokenId.value,
      tokenSymbol: tokenSymbol.symbol,
      timing: { isTimed: Bool.empty(), ...timing },
      delegate: delegate ?? undefined,
      zkapp: zkapp,
      ...rest,
    };
  }
}
