import * as BindingsLayout from '../../../bindings/mina-transaction/gen/v2/js-layout.js';
// TODO: pull last remanants of old transaction leavs into v2 bindings
import { Actions } from '../../../bindings/mina-transaction/v1/transaction-leaves.js';
import { Bool } from '../../provable/bool.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { Field } from '../../provable/field.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { HashInput } from '../../provable/types/provable-derivers.js';
import { ZkappConstants } from '../v1/constants.js';

import { Compare, Eq, Option, Range } from './core.js';
import { MinaAmount } from './currency.js';
import {
  GenericStatePreconditions,
  StateDefinition,
  StateLayout,
  StatePreconditions,
} from './state.js';

export {
  Preconditions,
  Precondition,
  PreconditionsDescription,
  EpochDataPreconditions,
  EpochLedgerPreconditions,
};

namespace Precondition {
  export class Equals<T extends Eq<T>> {
    constructor(
      public isEnabled: Bool,
      public value: T
    ) {}

    toStringHuman(): string {
      if (!this.isEnabled.toBoolean()) {
        return 'disabled';
      } else {
        return `== ${this.value}`;
      }
    }

    toValue<D>(defaultValue: D): T | D {
      if (this.isEnabled.toBoolean()) {
        return this.value;
      } else {
        return defaultValue;
      }
    }

    mapToValue<D, R>(defaultValue: D, f: (t: T) => R): R | D {
      if (this.isEnabled.toBoolean()) {
        return f(this.value);
      } else {
        return defaultValue;
      }
    }

    toOption(): Option<T> {
      return { isSome: this.isEnabled, value: this.value };
    }

    isSatisfied(x: T): Bool {
      return Bool.or(this.isEnabled.not(), this.value.equals(x));
    }

    static disabled<T extends Eq<T>>(defaultValue: T): Equals<T> {
      return new Equals(new Bool(false), defaultValue);
    }

    static equals<T extends Eq<T>>(value: T): Equals<T> {
      return new Equals(new Bool(true), value);
    }

    static fromOption<T extends Eq<T>>(option: Option<T>): Equals<T> {
      return new Equals(option.isSome, option.value);
    }

    static from<T extends Eq<T>>(value: Equals<T> | T | undefined, defaultValue: T): Equals<T> {
      if (value instanceof Equals) {
        return value;
      } else if (value !== undefined) {
        return Equals.equals(value);
      } else {
        return Equals.disabled(defaultValue);
      }
    }
  }

  export class InRange<T extends Compare<T>> {
    constructor(
      public isEnabled: Bool,
      public lower: T,
      public upper: T
    ) {}

    toStringHuman(): string {
      if (!this.isEnabled.toBoolean()) {
        return 'disabled';
      } else if (this.lower.equals(this.upper).toBoolean()) {
        return `== ${this.lower}`;
      } else {
        return `between (${this.lower}, ${this.upper})`;
      }
    }

    toValue<D>(defaultValue: D): { lower: T; upper: T } | D {
      if (this.isEnabled.toBoolean()) {
        return { lower: this.lower, upper: this.upper };
      } else {
        return defaultValue;
      }
    }

    mapToValue<D, R>(defaultValue: D, f: (t: T) => R): { lower: R; upper: R } | D {
      if (this.isEnabled.toBoolean()) {
        return { lower: f(this.lower), upper: f(this.upper) };
      } else {
        return defaultValue;
      }
    }

    toOption(): Option<Range<T>> {
      return {
        isSome: this.isEnabled,
        value: {
          lower: this.lower,
          upper: this.upper,
        },
      };
    }

    isSatisfied(x: T): Bool {
      return Bool.or(
        this.isEnabled.not(),
        Bool.and(this.lower.lessThanOrEqual(x), this.upper.greaterThanOrEqual(x))
      );
    }

    static disabled<T extends Compare<T>>(defaultValue: T | { lower: T; upper: T }): InRange<T> {
      const isDefaultRange =
        typeof defaultValue === 'object' &&
        defaultValue !== null &&
        'lower' in defaultValue &&
        'upper' in defaultValue;
      const lower = isDefaultRange ? defaultValue.lower : defaultValue;
      const upper = isDefaultRange ? defaultValue.upper : defaultValue;
      return new InRange(new Bool(false), lower, upper);
    }

    static equals<T extends Compare<T>>(value: T): InRange<T> {
      return new InRange(new Bool(true), value, value);
    }

    static betweenInclusive<T extends Compare<T>>(lower: T, upper: T): InRange<T> {
      return new InRange(new Bool(true), lower, upper);
    }

    static fromOption<T extends Compare<T>>(option: Option<Range<T>>): InRange<T> {
      return new InRange(option.isSome, option.value.lower, option.value.upper);
    }

    // TODO: lessThan, greaterThan

    static from<T extends Compare<T>>(
      value: InRange<T> | T | undefined,
      defaultValue: T | { lower: T; upper: T }
    ): InRange<T> {
      if (value instanceof InRange) {
        return value;
      } else if (value !== undefined) {
        return InRange.equals(value);
      } else {
        return InRange.disabled(defaultValue);
      }
    }
  }
}

type PreconditionsDescription<State extends StateLayout> = {
  network?: NetworkPreconditionsDescription | NetworkPreconditions;
  account?: AccountPreconditionsDescription<State> | AccountPreconditions<State>;
  validWhile?: UInt32 | Precondition.InRange<UInt32>;
};

class Preconditions<State extends StateLayout = 'GenericState'> {
  readonly network: NetworkPreconditions;
  readonly account: AccountPreconditions<State>;
  readonly validWhile: Precondition.InRange<UInt32>;

  constructor(State: StateDefinition<State>, descr?: PreconditionsDescription<State>) {
    this.network = NetworkPreconditions.from(descr?.network);
    this.account = AccountPreconditions.from(State, descr?.account);
    this.validWhile = Precondition.InRange.from(descr?.validWhile, {
      lower: UInt32.empty(),
      upper: UInt32.MAXINT(),
    });
  }

  toGeneric(): Preconditions {
    return new Preconditions<'GenericState'>('GenericState', {
      ...this,
      account: this.account.toGeneric(),
    });
  }

  static fromGeneric<State extends StateLayout>(
    x: Preconditions,
    State: StateDefinition<State>
  ): Preconditions<State> {
    return new Preconditions(State, {
      ...this,
      account: AccountPreconditions.fromGeneric(x.account, State),
    });
  }

  toInternalRepr(): BindingsLayout.Preconditions {
    return {
      network: this.network.toInternalRepr(),
      account: this.account.toInternalRepr(),
      validWhile: this.validWhile.toOption(),
    };
  }

  static fromInternalRepr(x: BindingsLayout.Preconditions): Preconditions {
    return new Preconditions('GenericState', {
      network: NetworkPreconditions.fromInternalRepr(x.network),
      account: AccountPreconditions.fromInternalRepr(x.account),
      validWhile: Precondition.InRange.fromOption(x.validWhile),
    });
  }

  toJSON(): any {
    return Preconditions.toJSON(this);
  }

  toInput(): HashInput {
    return Preconditions.toInput(this);
  }

  toFields(): Field[] {
    return Preconditions.toFields(this);
  }

  static sizeInFields(): number {
    return BindingsLayout.Preconditions.sizeInFields();
  }

  static emptyPoly<State extends StateLayout>(State: StateDefinition<State>): Preconditions<State> {
    return new Preconditions(State);
  }

  static empty(): Preconditions {
    return new Preconditions('GenericState');
  }

  static check<State extends StateLayout>(_x: Preconditions<State>) {
    throw new Error('TODO');
  }

  static toJSON<State extends StateLayout>(x: Preconditions<State>): any {
    return BindingsLayout.Preconditions.toJSON(x.toInternalRepr());
  }

  static toInput<State extends StateLayout>(x: Preconditions<State>): HashInput {
    return BindingsLayout.Preconditions.toInput(x.toInternalRepr());
  }

  static toFields<State extends StateLayout>(x: Preconditions<State>): Field[] {
    return BindingsLayout.Preconditions.toFields(x.toInternalRepr());
  }

  static fromFields(fields: Field[], aux: any[]): Preconditions {
    return Preconditions.fromInternalRepr(BindingsLayout.Preconditions.fromFields(fields, aux));
  }

  static toAuxiliary<State extends StateLayout>(x?: Preconditions<State>): any[] {
    return BindingsLayout.Preconditions.toAuxiliary(x?.toInternalRepr());
  }

  static toValue<State extends StateLayout>(x: Preconditions<State>): Preconditions<State> {
    return x;
  }

  static fromValue<State extends StateLayout>(x: Preconditions<State>): Preconditions<State> {
    return x;
  }

  static from<State extends StateLayout>(
    State: StateDefinition<State>,
    value: Preconditions<State> | PreconditionsDescription<State> | undefined
  ): Preconditions<State> {
    if (value instanceof Preconditions) {
      return value;
    } else if (value === undefined) {
      return Preconditions.emptyPoly(State);
    } else {
      return new Preconditions(State, value);
    }
  }
}

type EpochLedgerPreconditionsDescription = {
  hash?: Field | Precondition.Equals<Field>;
  totalCurrency?: MinaAmount | Precondition.InRange<MinaAmount>;
};

class EpochLedgerPreconditions {
  readonly hash: Precondition.Equals<Field>;
  readonly totalCurrency: Precondition.InRange<MinaAmount>;

  constructor(descr?: EpochLedgerPreconditionsDescription) {
    this.hash = Precondition.Equals.from(descr?.hash, new Field(0));
    this.totalCurrency = Precondition.InRange.from(descr?.totalCurrency, {
      lower: UInt64.empty(),
      upper: UInt64.MAXINT(),
    });
  }

  toInternalRepr(): BindingsLayout.EpochLedgerPrecondition {
    return {
      hash: this.hash.toOption(),
      totalCurrency: this.totalCurrency.toOption(),
    };
  }

  static fromInternalRepr(x: BindingsLayout.EpochLedgerPrecondition): EpochLedgerPreconditions {
    return new EpochLedgerPreconditions({
      hash: Precondition.Equals.fromOption(x.hash),
      totalCurrency: Precondition.InRange.fromOption(x.totalCurrency),
    });
  }

  toJSON(): any {
    return EpochLedgerPreconditions.toJSON(this);
  }

  toInput(): HashInput {
    return EpochLedgerPreconditions.toInput(this);
  }

  toFields(): Field[] {
    return EpochLedgerPreconditions.toFields(this);
  }

  static sizeInFields(): number {
    return BindingsLayout.EpochLedgerPrecondition.sizeInFields();
  }

  static empty(): EpochLedgerPreconditions {
    return new EpochLedgerPreconditions();
  }

  static check(_x: EpochLedgerPreconditions) {
    throw new Error('TODO');
  }

  static toJSON(x: EpochLedgerPreconditions): any {
    return BindingsLayout.EpochLedgerPrecondition.toJSON(x.toInternalRepr());
  }

  static toInput(x: EpochLedgerPreconditions): HashInput {
    return BindingsLayout.EpochLedgerPrecondition.toInput(x.toInternalRepr());
  }

  static toFields(x: EpochLedgerPreconditions): Field[] {
    return BindingsLayout.EpochLedgerPrecondition.toFields(x.toInternalRepr());
  }

  static fromFields(fields: Field[], aux: any[]): EpochLedgerPreconditions {
    return EpochLedgerPreconditions.fromInternalRepr(
      BindingsLayout.EpochLedgerPrecondition.fromFields(fields, aux)
    );
  }

  static toAuxiliary(x?: EpochLedgerPreconditions): any[] {
    return BindingsLayout.EpochLedgerPrecondition.toAuxiliary(x?.toInternalRepr());
  }

  static toValue(x: EpochLedgerPreconditions): EpochLedgerPreconditions {
    return x;
  }

  static fromValue(x: EpochLedgerPreconditions): EpochLedgerPreconditions {
    return x;
  }

  static from(
    value: EpochLedgerPreconditions | EpochLedgerPreconditionsDescription | undefined
  ): EpochLedgerPreconditions {
    if (value instanceof EpochLedgerPreconditions) {
      return value;
    } else if (value === undefined) {
      return EpochLedgerPreconditions.empty();
    } else {
      return new EpochLedgerPreconditions(value);
    }
  }
}

type EpochDataPreconditionsDescription = {
  ledger?: EpochLedgerPreconditions | EpochLedgerPreconditionsDescription;
  seed?: Field | Precondition.Equals<Field>;
  startCheckpoint?: Field | Precondition.Equals<Field>;
  lockCheckpoint?: Field | Precondition.Equals<Field>;
  epochLength?: UInt32 | Precondition.InRange<UInt32>;
};

class EpochDataPreconditions {
  readonly ledger: EpochLedgerPreconditions;
  readonly seed: Precondition.Equals<Field>;
  readonly startCheckpoint: Precondition.Equals<Field>;
  readonly lockCheckpoint: Precondition.Equals<Field>;
  readonly epochLength: Precondition.InRange<UInt32>;

  constructor(descr?: EpochDataPreconditionsDescription) {
    this.ledger = EpochLedgerPreconditions.from(descr?.ledger);
    this.seed = Precondition.Equals.from(descr?.seed, new Field(0));
    this.startCheckpoint = Precondition.Equals.from(descr?.startCheckpoint, new Field(0));
    this.lockCheckpoint = Precondition.Equals.from(descr?.lockCheckpoint, new Field(0));
    this.epochLength = Precondition.InRange.from(descr?.epochLength, {
      lower: UInt32.empty(),
      upper: UInt32.MAXINT(),
    });
  }

  toInternalRepr(): BindingsLayout.EpochDataPrecondition {
    return {
      ledger: this.ledger.toInternalRepr(),
      seed: this.seed.toOption(),
      startCheckpoint: this.startCheckpoint.toOption(),
      lockCheckpoint: this.lockCheckpoint.toOption(),
      epochLength: this.epochLength.toOption(),
    };
  }

  static fromInternalRepr(x: BindingsLayout.EpochDataPrecondition): EpochDataPreconditions {
    return new EpochDataPreconditions({
      ledger: EpochLedgerPreconditions.fromInternalRepr(x.ledger),
      seed: Precondition.Equals.fromOption(x.seed),
      startCheckpoint: Precondition.Equals.fromOption(x.startCheckpoint),
      lockCheckpoint: Precondition.Equals.fromOption(x.lockCheckpoint),
      epochLength: Precondition.InRange.fromOption(x.epochLength),
    });
  }

  toJSON(): any {
    return EpochDataPreconditions.toJSON(this);
  }

  toInput(): HashInput {
    return EpochDataPreconditions.toInput(this);
  }

  toFields(): Field[] {
    return EpochDataPreconditions.toFields(this);
  }

  static sizeInFields(): number {
    return BindingsLayout.EpochDataPrecondition.sizeInFields();
  }

  static empty(): EpochDataPreconditions {
    return new EpochDataPreconditions();
  }

  static check(_x: EpochDataPreconditions) {
    throw new Error('TODO');
  }

  static toJSON(x: EpochDataPreconditions): any {
    return BindingsLayout.EpochDataPrecondition.toJSON(x.toInternalRepr());
  }

  static toInput(x: EpochDataPreconditions): HashInput {
    return BindingsLayout.EpochDataPrecondition.toInput(x.toInternalRepr());
  }

  static toFields(x: EpochDataPreconditions): Field[] {
    return BindingsLayout.EpochDataPrecondition.toFields(x.toInternalRepr());
  }

  static fromFields(fields: Field[], aux: any[]): EpochDataPreconditions {
    return EpochDataPreconditions.fromInternalRepr(
      BindingsLayout.EpochDataPrecondition.fromFields(fields, aux)
    );
  }

  static toAuxiliary(x?: EpochDataPreconditions): any[] {
    return BindingsLayout.EpochDataPrecondition.toAuxiliary(x?.toInternalRepr());
  }

  static toValue(x: EpochDataPreconditions): EpochDataPreconditions {
    return x;
  }

  static fromValue(x: EpochDataPreconditions): EpochDataPreconditions {
    return x;
  }

  static from(
    value: EpochDataPreconditions | EpochDataPreconditionsDescription | undefined
  ): EpochDataPreconditions {
    if (value instanceof EpochDataPreconditions) {
      return value;
    } else if (value === undefined) {
      return EpochDataPreconditions.empty();
    } else {
      return new EpochDataPreconditions(value);
    }
  }
}

type NetworkPreconditionsDescription = {
  snarkedLedgerHash?: Field | Precondition.Equals<Field>;
  blockchainLength?: UInt32 | Precondition.InRange<UInt32>;
  minWindowDensity?: UInt32 | Precondition.InRange<UInt32>;
  totalCurrency?: MinaAmount | Precondition.InRange<MinaAmount>;
  globalSlotSinceGenesis?: UInt32 | Precondition.InRange<UInt32>;
  stakingEpochData?: EpochDataPreconditions | EpochDataPreconditionsDescription;
  nextEpochData?: EpochDataPreconditions | EpochDataPreconditionsDescription;
};

class NetworkPreconditions {
  readonly snarkedLedgerHash: Precondition.Equals<Field>;
  readonly blockchainLength: Precondition.InRange<UInt32>;
  readonly minWindowDensity: Precondition.InRange<UInt32>;
  readonly totalCurrency: Precondition.InRange<MinaAmount>;
  readonly globalSlotSinceGenesis: Precondition.InRange<UInt32>;
  readonly stakingEpochData: EpochDataPreconditions;
  readonly nextEpochData: EpochDataPreconditions;

  constructor(descr?: NetworkPreconditionsDescription) {
    this.snarkedLedgerHash = Precondition.Equals.from(descr?.snarkedLedgerHash, Field.empty());
    this.blockchainLength = Precondition.InRange.from(descr?.blockchainLength, {
      lower: UInt32.empty(),
      upper: UInt32.MAXINT(),
    });
    this.minWindowDensity = Precondition.InRange.from(descr?.minWindowDensity, {
      lower: UInt32.empty(),
      upper: UInt32.MAXINT(),
    });
    this.totalCurrency = Precondition.InRange.from(descr?.totalCurrency, {
      lower: UInt64.empty(),
      upper: UInt64.MAXINT(),
    });
    this.globalSlotSinceGenesis = Precondition.InRange.from(descr?.globalSlotSinceGenesis, {
      lower: UInt32.empty(),
      upper: UInt32.MAXINT(),
    });
    this.stakingEpochData = EpochDataPreconditions.from(descr?.stakingEpochData);
    this.nextEpochData = EpochDataPreconditions.from(descr?.nextEpochData);
  }

  toInternalRepr(): BindingsLayout.NetworkPrecondition {
    return {
      snarkedLedgerHash: this.snarkedLedgerHash.toOption(),
      blockchainLength: this.blockchainLength.toOption(),
      minWindowDensity: this.minWindowDensity.toOption(),
      totalCurrency: this.totalCurrency.toOption(),
      globalSlotSinceGenesis: this.globalSlotSinceGenesis.toOption(),
      stakingEpochData: this.stakingEpochData.toInternalRepr(),
      nextEpochData: this.nextEpochData.toInternalRepr(),
    };
  }

  static fromInternalRepr(x: BindingsLayout.NetworkPrecondition): NetworkPreconditions {
    return new NetworkPreconditions({
      snarkedLedgerHash: Precondition.Equals.fromOption(x.snarkedLedgerHash),
      blockchainLength: Precondition.InRange.fromOption(x.blockchainLength),
      minWindowDensity: Precondition.InRange.fromOption(x.minWindowDensity),
      totalCurrency: Precondition.InRange.fromOption(x.totalCurrency),
      globalSlotSinceGenesis: Precondition.InRange.fromOption(x.globalSlotSinceGenesis),
      stakingEpochData: EpochDataPreconditions.fromInternalRepr(x.stakingEpochData),
      nextEpochData: EpochDataPreconditions.fromInternalRepr(x.nextEpochData),
    });
  }

  static empty(): NetworkPreconditions {
    return new NetworkPreconditions();
  }

  toJSON(): any {
    return NetworkPreconditions.toJSON(this);
  }

  toInput(): HashInput {
    return NetworkPreconditions.toInput(this);
  }

  toFields(): Field[] {
    return NetworkPreconditions.toFields(this);
  }

  static sizeInFields(): number {
    return BindingsLayout.NetworkPrecondition.sizeInFields();
  }

  static check(_x: NetworkPreconditions) {
    throw new Error('TODO');
  }

  static toJSON(x: NetworkPreconditions): any {
    return BindingsLayout.NetworkPrecondition.toJSON(x.toInternalRepr());
  }

  static toInput(x: NetworkPreconditions): HashInput {
    return BindingsLayout.NetworkPrecondition.toInput(x.toInternalRepr());
  }

  static toFields(x: NetworkPreconditions): Field[] {
    return BindingsLayout.NetworkPrecondition.toFields(x.toInternalRepr());
  }

  static fromFields(fields: Field[], aux: any[]): NetworkPreconditions {
    return NetworkPreconditions.fromInternalRepr(
      BindingsLayout.NetworkPrecondition.fromFields(fields, aux)
    );
  }

  static toAuxiliary(x?: NetworkPreconditions): any[] {
    return BindingsLayout.NetworkPrecondition.toAuxiliary(x?.toInternalRepr());
  }

  static toValue(x: NetworkPreconditions): NetworkPreconditions {
    return x;
  }

  static fromValue(x: NetworkPreconditions): NetworkPreconditions {
    return x;
  }

  static from(
    value: NetworkPreconditions | NetworkPreconditionsDescription | undefined
  ): NetworkPreconditions {
    if (value instanceof NetworkPreconditions) {
      return value;
    } else if (value === undefined) {
      return NetworkPreconditions.empty();
    } else {
      return new NetworkPreconditions(value);
    }
  }
}

type AccountPreconditionsDescription<State extends StateLayout> = {
  balance?: MinaAmount | Precondition.InRange<MinaAmount>;
  nonce?: UInt32 | Precondition.InRange<UInt32>;
  receiptChainHash?: Field | Precondition.Equals<Field>;
  delegate?: PublicKey | Precondition.Equals<PublicKey>;
  state?: StatePreconditions<State>;
  actionState?: Field | Precondition.Equals<Field>;
  // NB: renamed from the protocol's type name of `provenState`
  isProven?: Bool | Precondition.Equals<Bool>;
  isNew?: Bool | Precondition.Equals<Bool>;
};

class AccountPreconditions<State extends StateLayout = 'GenericState'> {
  // TODO: should these really be read-only?
  readonly State: StateDefinition<State>;
  readonly balance: Precondition.InRange<MinaAmount>;
  readonly nonce: Precondition.InRange<UInt32>;
  readonly receiptChainHash: Precondition.Equals<Field>;
  readonly delegate: Precondition.Equals<PublicKey>;
  readonly state: StatePreconditions<State>;
  readonly actionState: Precondition.Equals<Field>;
  readonly isProven: Precondition.Equals<Bool>;
  readonly isNew: Precondition.Equals<Bool>;

  constructor(State: StateDefinition<State>, descr?: AccountPreconditionsDescription<State>) {
    this.State = State;
    this.balance = Precondition.InRange.from(descr?.balance, {
      lower: UInt64.empty(),
      upper: UInt64.MAXINT(),
    });
    this.nonce = Precondition.InRange.from(descr?.nonce, {
      lower: UInt32.empty(),
      upper: UInt32.MAXINT(),
    });
    this.receiptChainHash = Precondition.Equals.from(descr?.receiptChainHash, Field.empty());
    this.delegate = Precondition.Equals.from(descr?.delegate, PublicKey.empty());
    this.state = descr?.state ?? StatePreconditions.empty(State);
    this.actionState = Precondition.Equals.from(descr?.actionState, Actions.emptyActionState());
    this.isProven = Precondition.Equals.from(descr?.isProven, Bool.empty());
    this.isNew = Precondition.Equals.from(descr?.isNew, Bool.empty());
  }

  toGeneric(): AccountPreconditions {
    return AccountPreconditions.generic({
      ...this,
      state: StatePreconditions.toGeneric(this.State, this.state),
    });
  }

  static fromGeneric<State extends StateLayout>(
    x: AccountPreconditions,
    State: StateDefinition<State>
  ): AccountPreconditions<State> {
    return new AccountPreconditions(State, {
      ...this,
      state: StatePreconditions.fromGeneric(x.state, State),
    });
  }

  toInternalRepr(): BindingsLayout.AccountPrecondition {
    const statePreconditions = StatePreconditions.toFieldPreconditions(this.State, this.state);

    if (statePreconditions.length !== ZkappConstants.MAX_ZKAPP_STATE_FIELDS) {
      throw new Error('invalid number of zkapp state field constraints');
    }

    return {
      balance: this.balance.toOption(),
      nonce: this.nonce.toOption(),
      receiptChainHash: this.receiptChainHash.toOption(),
      delegate: this.delegate.toOption(),
      state: statePreconditions.map((c) => c.toOption()),
      actionState: this.actionState.toOption(),
      provedState: this.isProven.toOption(),
      isNew: this.isNew.toOption(),
    };
  }

  static fromInternalRepr(x: BindingsLayout.AccountPrecondition): AccountPreconditions {
    return new AccountPreconditions<'GenericState'>('GenericState', {
      balance: Precondition.InRange.fromOption(x.balance),
      nonce: Precondition.InRange.fromOption(x.nonce),
      receiptChainHash: Precondition.Equals.fromOption(x.receiptChainHash),
      delegate: Precondition.Equals.fromOption(x.delegate),
      state: new GenericStatePreconditions(x.state.map(Precondition.Equals.fromOption<Field>)),
      actionState: Precondition.Equals.fromOption(x.actionState),
      isProven: Precondition.Equals.fromOption(x.provedState),
      isNew: Precondition.Equals.fromOption(x.isNew),
    });
  }

  toJSON(): any {
    return AccountPreconditions.toJSON(this);
  }

  toInput(): HashInput {
    return AccountPreconditions.toInput(this);
  }

  toFields(): Field[] {
    return AccountPreconditions.toFields(this);
  }

  static generic(descr?: AccountPreconditionsDescription<'GenericState'>): AccountPreconditions {
    return new AccountPreconditions<'GenericState'>('GenericState', descr);
  }

  static sizeInFields(): number {
    return BindingsLayout.AccountPrecondition.sizeInFields();
  }

  static emptyPoly<State extends StateLayout>(
    State: StateDefinition<State>
  ): AccountPreconditions<State> {
    return new AccountPreconditions(State);
  }

  static empty(): AccountPreconditions {
    return this.emptyPoly('GenericState');
  }

  static check<State extends StateLayout>(_x: AccountPreconditions<State>) {
    throw new Error('TODO');
  }

  static toJSON<State extends StateLayout>(x: AccountPreconditions<State>): any {
    return BindingsLayout.AccountPrecondition.toJSON(x.toInternalRepr());
  }

  static toInput<State extends StateLayout>(x: AccountPreconditions<State>): HashInput {
    return BindingsLayout.AccountPrecondition.toInput(x.toInternalRepr());
  }

  static toFields<State extends StateLayout>(x: AccountPreconditions<State>): Field[] {
    return BindingsLayout.AccountPrecondition.toFields(x.toInternalRepr());
  }

  static fromFields(fields: Field[], aux: any[]): AccountPreconditions {
    return AccountPreconditions.fromInternalRepr(
      BindingsLayout.AccountPrecondition.fromFields(fields, aux)
    );
  }

  static toAuxiliary<State extends StateLayout>(x?: AccountPreconditions<State>): any[] {
    return BindingsLayout.AccountPrecondition.toAuxiliary(x?.toInternalRepr());
  }

  static toValue<State extends StateLayout>(
    x: AccountPreconditions<State>
  ): AccountPreconditions<State> {
    return x;
  }

  static fromValue<State extends StateLayout>(
    x: AccountPreconditions<State>
  ): AccountPreconditions<State> {
    return x;
  }

  static from<State extends StateLayout>(
    State: StateDefinition<State>,
    value: AccountPreconditions<State> | AccountPreconditionsDescription<State> | undefined
  ): AccountPreconditions<State> {
    if (value instanceof AccountPreconditions) {
      return value;
    } else if (value === undefined) {
      return AccountPreconditions.emptyPoly(State);
    } else {
      return new AccountPreconditions(State, value);
    }
  }
}
