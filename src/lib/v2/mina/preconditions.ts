import { MAX_ZKAPP_STATE_FIELDS, Constraint, MinaAmount } from './core.js';
import { GenericStateConstraints, StateConstraints, StateDefinition, StateLayout } from './state.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { HashInput } from '../../provable/types/provable-derivers.js';
// TODO: pull last remanants of old transaction leavs into v2 bindings
import { Actions } from '../../../bindings/mina-transaction/transaction-leaves.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/js-layout-v2.js';

export type PreconditionsDescription<State extends StateLayout> = {
	network?: Preconditions.NetworkDescription | Preconditions.Network,
	account?: Preconditions.Account<State> | Preconditions.AccountDescription<State>,
	validWhile?: UInt32 | Constraint.InRange<UInt32>
}

export class Preconditions<State extends StateLayout = 'GenericState'> {
	readonly network: Preconditions.Network;
	readonly account: Preconditions.Account<State>;
	readonly validWhile: Constraint.InRange<UInt32>;

  constructor(State: StateDefinition<State>, descr?: PreconditionsDescription<State>) {
    this.network = Preconditions.Network.from(descr?.network);
    this.account = Preconditions.Account.from(State, descr?.account);
    this.validWhile = Constraint.InRange.from(descr?.validWhile, {
      lower: UInt32.empty(),
      upper: UInt32.MAXINT()
    });
  }

  toInternalRepr(): BindingsLayout.Preconditions {
    return {
      network: this.network.toInternalRepr(),
      account: this.account.toInternalRepr(),
      validWhile: this.validWhile.toOption()
    }
  }

  static fromInternalRepr(x: BindingsLayout.Preconditions): Preconditions {
    return new Preconditions('GenericState', {
      network: Preconditions.Network.fromInternalRepr(x.network),
      account: Preconditions.Account.fromInternalRepr(x.account),
      validWhile: Constraint.InRange.fromOption(x.validWhile),
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

  static from<State extends StateLayout>(State: StateDefinition<State>, value: Preconditions<State> | PreconditionsDescription<State> | undefined): Preconditions<State> {
    if(value instanceof Preconditions) {
      return value;
    } else if(value === undefined) {
      return Preconditions.emptyPoly(State);
    } else {
      return new Preconditions(State, value);
    }
  }
}

export namespace Preconditions {
  export type EpochLedgerDescription = {
    hash?: Field | Constraint.Equals<Field>,
    totalCurrency?: MinaAmount | Constraint.InRange<MinaAmount>
  };

  export class EpochLedger {
    readonly hash: Constraint.Equals<Field>;
    readonly totalCurrency: Constraint.InRange<MinaAmount>;

    constructor(descr?: EpochLedgerDescription) {
      this.hash = Constraint.Equals.from(descr?.hash, new Field(0));
      this.totalCurrency = Constraint.InRange.from(descr?.totalCurrency, {
        lower: UInt64.empty(),
        upper: UInt64.MAXINT()
      });
    }

    toInternalRepr(): BindingsLayout.EpochLedgerPrecondition {
      return {
        hash: this.hash.toOption(),
        totalCurrency: this.totalCurrency.toOption(),
      }
    }

    static fromInternalRepr(x: BindingsLayout.EpochLedgerPrecondition): EpochLedger {
      return new EpochLedger({
        hash: Constraint.Equals.fromOption(x.hash),
        totalCurrency: Constraint.InRange.fromOption(x.totalCurrency)
      });
    }

    toJSON(): any {
      return EpochLedger.toJSON(this);
    }

    toInput(): HashInput {
      return EpochLedger.toInput(this);
    }

    toFields(): Field[] {
      return EpochLedger.toFields(this);
    }

    static sizeInFields(): number {
      return BindingsLayout.EpochLedgerPrecondition.sizeInFields();
    }

    static empty(): EpochLedger {
      return new EpochLedger();
    }

    static check(_x: EpochLedger) {
      throw new Error('TODO');
    }

    static toJSON(x: EpochLedger): any {
      return BindingsLayout.EpochLedgerPrecondition.toJSON(x.toInternalRepr());
    }

    static toInput(x: EpochLedger): HashInput {
      return BindingsLayout.EpochLedgerPrecondition.toInput(x.toInternalRepr());
    }

    static toFields(x: EpochLedger): Field[] {
      return BindingsLayout.EpochLedgerPrecondition.toFields(x.toInternalRepr());
    }

    static fromFields(fields: Field[], aux: any[]): EpochLedger {
      return EpochLedger.fromInternalRepr(BindingsLayout.EpochLedgerPrecondition.fromFields(fields, aux));
    }

    static toAuxiliary(x?: EpochLedger): any[] {
      return BindingsLayout.EpochLedgerPrecondition.toAuxiliary(x?.toInternalRepr())
    }

    static toValue(x: EpochLedger): EpochLedger {
      return x;
    }

    static fromValue(x: EpochLedger): EpochLedger {
      return x;
    }

    static from(value: EpochLedger | EpochLedgerDescription | undefined): EpochLedger {
      if(value instanceof EpochLedger) {
        return value;
      } else if(value === undefined) {
        return EpochLedger.empty();
      } else {
        return new EpochLedger(value);
      }
    }
  }

  export type EpochDataDescription = {
    ledger?: EpochLedger | EpochLedgerDescription,
    seed?: Field | Constraint.Equals<Field>,
    startCheckpoint?: Field | Constraint.Equals<Field>,
    lockCheckpoint?: Field | Constraint.Equals<Field>,
    epochLength?: UInt32 | Constraint.InRange<UInt32>
  };

  export class EpochData {
    readonly ledger: EpochLedger;
    readonly seed: Constraint.Equals<Field>;
    readonly startCheckpoint: Constraint.Equals<Field>;
    readonly lockCheckpoint: Constraint.Equals<Field>;
    readonly epochLength: Constraint.InRange<UInt32>;

    constructor(descr?: EpochDataDescription) {
      this.ledger = EpochLedger.from(descr?.ledger);
      this.seed = Constraint.Equals.from(descr?.seed, new Field(0));
      this.startCheckpoint = Constraint.Equals.from(descr?.startCheckpoint, new Field(0));
      this.lockCheckpoint = Constraint.Equals.from(descr?.lockCheckpoint, new Field(0));
      this.epochLength = Constraint.InRange.from(descr?.epochLength, {
        lower: UInt32.empty(),
        upper: UInt32.MAXINT()
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

    static fromInternalRepr(x: BindingsLayout.EpochDataPrecondition): EpochData {
      return new EpochData({
        ledger: EpochLedger.fromInternalRepr(x.ledger),
        seed: Constraint.Equals.fromOption(x.seed),
        startCheckpoint: Constraint.Equals.fromOption(x.startCheckpoint),
        lockCheckpoint: Constraint.Equals.fromOption(x.lockCheckpoint),
        epochLength: Constraint.InRange.fromOption(x.epochLength),
      });
    }

    toJSON(): any {
      return EpochData.toJSON(this);
    }

    toInput(): HashInput {
      return EpochData.toInput(this);
    }

    toFields(): Field[] {
      return EpochData.toFields(this);
    }

    static sizeInFields(): number {
      return BindingsLayout.EpochDataPrecondition.sizeInFields();
    }

    static empty(): EpochData {
      return new EpochData();
    }

    static check(_x: EpochData) {
      throw new Error('TODO');
    }

    static toJSON(x: EpochData): any {
      return BindingsLayout.EpochDataPrecondition.toJSON(x.toInternalRepr());
    }

    static toInput(x: EpochData): HashInput {
      return BindingsLayout.EpochDataPrecondition.toInput(x.toInternalRepr());
    }

    static toFields(x: EpochData): Field[] {
      return BindingsLayout.EpochDataPrecondition.toFields(x.toInternalRepr());
    }

    static fromFields(fields: Field[], aux: any[]): EpochData {
      return EpochData.fromInternalRepr(BindingsLayout.EpochDataPrecondition.fromFields(fields, aux));
    }

    static toAuxiliary(x?: EpochData): any[] {
      return BindingsLayout.EpochDataPrecondition.toAuxiliary(x?.toInternalRepr())
    }

    static toValue(x: EpochData): EpochData {
      return x;
    }

    static fromValue(x: EpochData): EpochData {
      return x;
    }

    static from(value: EpochData | EpochDataDescription | undefined): EpochData {
      if(value instanceof EpochData) {
        return value;
      } else if(value === undefined) {
        return EpochData.empty();
      } else {
        return new EpochData(value);
      }
    }
  }

  export type NetworkDescription = {
    snarkedLedgerHash?: Field | Constraint.Equals<Field>,
    blockchainLength?: UInt32 | Constraint.InRange<UInt32>,
    minWindowDensity?: UInt32 | Constraint.InRange<UInt32>,
    totalCurrency?: MinaAmount | Constraint.InRange<MinaAmount>,
    globalSlotSinceGenesis?: UInt32 | Constraint.InRange<UInt32>,
    stakingEpochData?: EpochData | EpochDataDescription,
    nextEpochData?: EpochData | EpochDataDescription,
  };

  /*
  export class Network extends deriveProvableUnderConversion(
    BindingsLayout.NetworkPrecondition,
    class NetworkBase {
      readonly snarkedLedgerHash: Constraint.Equals<Field>;
      readonly blockchainLength: Constraint.InRange<UInt32>;
      readonly minWindowDensity: Constraint.InRange<UInt32>;
      readonly totalCurrency: Constraint.InRange<MinaAmount>;
      readonly globalSlotSinceGenesis: Constraint.InRange<UInt32>;
      readonly stakingEpochData: EpochData;
      readonly nextEpochData: EpochData;

      constructor(descr?: NetworkDescription) {
        this.snarkedLedgerHash = Constraint.Equals.from(descr?.snarkedLedgerHash, Field.empty());
        this.blockchainLength = Constraint.InRange.from(descr?.blockchainLength, {
          lower: UInt32.empty(),
          upper: UInt32.MAXINT()
        });
        this.minWindowDensity = Constraint.InRange.from(descr?.minWindowDensity, {
          lower: UInt32.empty(),
          upper: UInt32.MAXINT()
        });
        this.totalCurrency = Constraint.InRange.from(descr?.totalCurrency, {
          lower: UInt64.empty(),
          upper: UInt64.MAXINT()
        });
        this.globalSlotSinceGenesis = Constraint.InRange.from(descr?.globalSlotSinceGenesis, {
          lower: UInt32.empty(),
          upper: UInt32.MAXINT(),
        });
        this.stakingEpochData = EpochData.from(descr?.stakingEpochData);
        this.nextEpochData = EpochData.from(descr?.nextEpochData);
      }

      static toProvableRepr(x: NetworkBase): BindingsLayout.NetworkPrecondition {
        return {
          snarkedLedgerHash: x.snarkedLedgerHash.toOption(),
          blockchainLength: x.blockchainLength.toOption(),
          minWindowDensity: x.minWindowDensity.toOption(),
          totalCurrency: x.totalCurrency.toOption(),
          globalSlotSinceGenesis: x.globalSlotSinceGenesis.toOption(),
          stakingEpochData: x.stakingEpochData.toInternalRepr(),
          nextEpochData: x.nextEpochData.toInternalRepr(),
        }
      }

      static fromProvableRepr(x: BindingsLayout.NetworkPrecondition): NetworkBase {
        return new NetworkBase({
          snarkedLedgerHash: Constraint.Equals.fromOption(x.snarkedLedgerHash),
          blockchainLength: Constraint.InRange.fromOption(x.blockchainLength),
          minWindowDensity: Constraint.InRange.fromOption(x.minWindowDensity),
          totalCurrency: Constraint.InRange.fromOption(x.totalCurrency),
          globalSlotSinceGenesis: Constraint.InRange.fromOption(x.globalSlotSinceGenesis),
          stakingEpochData: EpochData.fromInternalRepr(x.stakingEpochData),
          nextEpochData: EpochData.fromInternalRepr(x.nextEpochData),
        });
      }
    }
  ) {
    static empty(): Network {
      return new Network();
    }

    static from(value: Network | NetworkDescription | undefined): Network {
      if(value instanceof Network) {
        return value;
      } else if(value === undefined) {
        return Network.empty();
      } else {
        return new Network(value);
      }
    }
  }
  */

  export class Network {
    readonly snarkedLedgerHash: Constraint.Equals<Field>;
    readonly blockchainLength: Constraint.InRange<UInt32>;
    readonly minWindowDensity: Constraint.InRange<UInt32>;
    readonly totalCurrency: Constraint.InRange<MinaAmount>;
    readonly globalSlotSinceGenesis: Constraint.InRange<UInt32>;
    readonly stakingEpochData: EpochData;
    readonly nextEpochData: EpochData;

    constructor(descr?: NetworkDescription) {
      this.snarkedLedgerHash = Constraint.Equals.from(descr?.snarkedLedgerHash, Field.empty());
      this.blockchainLength = Constraint.InRange.from(descr?.blockchainLength, {
        lower: UInt32.empty(),
        upper: UInt32.MAXINT()
      });
      this.minWindowDensity = Constraint.InRange.from(descr?.minWindowDensity, {
        lower: UInt32.empty(),
        upper: UInt32.MAXINT()
      });
      this.totalCurrency = Constraint.InRange.from(descr?.totalCurrency, {
        lower: UInt64.empty(),
        upper: UInt64.MAXINT()
      });
      this.globalSlotSinceGenesis = Constraint.InRange.from(descr?.globalSlotSinceGenesis, {
        lower: UInt32.empty(),
        upper: UInt32.MAXINT(),
      });
      this.stakingEpochData = EpochData.from(descr?.stakingEpochData);
      this.nextEpochData = EpochData.from(descr?.nextEpochData);
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
      }
    }

    static fromInternalRepr(x: BindingsLayout.NetworkPrecondition): Network {
      return new Network({
        snarkedLedgerHash: Constraint.Equals.fromOption(x.snarkedLedgerHash),
        blockchainLength: Constraint.InRange.fromOption(x.blockchainLength),
        minWindowDensity: Constraint.InRange.fromOption(x.minWindowDensity),
        totalCurrency: Constraint.InRange.fromOption(x.totalCurrency),
        globalSlotSinceGenesis: Constraint.InRange.fromOption(x.globalSlotSinceGenesis),
        stakingEpochData: EpochData.fromInternalRepr(x.stakingEpochData),
        nextEpochData: EpochData.fromInternalRepr(x.nextEpochData),
      });
    }

    static empty(): Network {
      return new Network();
    }

    toJSON(): any {
      return Network.toJSON(this);
    }

    toInput(): HashInput {
      return Network.toInput(this);
    }


    toFields(): Field[] {
      return Network.toFields(this);
    }

    static sizeInFields(): number {
      return BindingsLayout.NetworkPrecondition.sizeInFields();
    }

    static check(_x: Network) {
      throw new Error('TODO');
    }

    static toJSON(x: Network): any {
      return BindingsLayout.NetworkPrecondition.toJSON(x.toInternalRepr());
    }

    static toInput(x: Network): HashInput {
      return BindingsLayout.NetworkPrecondition.toInput(x.toInternalRepr());
    }

    static toFields(x: Network): Field[] {
      return BindingsLayout.NetworkPrecondition.toFields(x.toInternalRepr());
    }

    static fromFields(fields: Field[], aux: any[]): Network {
      return Network.fromInternalRepr(BindingsLayout.NetworkPrecondition.fromFields(fields, aux));
    }

    static toAuxiliary(x?: Network): any[] {
      return BindingsLayout.NetworkPrecondition.toAuxiliary(x?.toInternalRepr())
    }

    static toValue(x: Network): Network {
      return x;
    }

    static fromValue(x: Network): Network {
      return x;
    }

    static from(value: Network | NetworkDescription | undefined): Network {
      if(value instanceof Network) {
        return value;
      } else if(value === undefined) {
        return Network.empty();
      } else {
        return new Network(value);
      }
    }
  }

  export type AccountDescription<State extends StateLayout> = {
		balance?: MinaAmount | Constraint.InRange<MinaAmount>,
		nonce?: UInt32 | Constraint.InRange<UInt32>,
		receiptChainHash?: Field | Constraint.Equals<Field>,
		delegate?: PublicKey | Constraint.Equals<PublicKey>,
		state?: StateConstraints<State>,
		actionState?: Field | Constraint.Equals<Field>,
    // NB: renamed from the protocol's type name of `provenState`
		isProven?: Bool | Constraint.Equals<Bool>,
		isNew?: Bool | Constraint.Equals<Bool>
  };

  export class Account<State extends StateLayout = 'GenericState'> {
    // TODO: should these really be read-only?
    readonly State: StateDefinition<State>;
		readonly balance: Constraint.InRange<MinaAmount>;
		readonly nonce: Constraint.InRange<UInt32>;
		readonly receiptChainHash: Constraint.Equals<Field>;
		readonly delegate: Constraint.Equals<PublicKey>;
		readonly state: StateConstraints<State>;
		readonly actionState: Constraint.Equals<Field>;
		readonly isProven: Constraint.Equals<Bool>;
		readonly isNew: Constraint.Equals<Bool>;

    constructor(State: StateDefinition<State>, descr?: AccountDescription<State>) {
      this.State = State;
      this.balance = Constraint.InRange.from(descr?.balance, {
        lower: UInt64.empty(),
        upper: UInt64.MAXINT()
      });
      this.nonce = Constraint.InRange.from(descr?.nonce, {
        lower: UInt32.empty(),
        upper: UInt32.MAXINT()
      });
      this.receiptChainHash = Constraint.Equals.from(descr?.receiptChainHash, Field.empty());
      this.delegate = Constraint.Equals.from(descr?.delegate, PublicKey.empty());
      this.state = descr?.state ?? StateConstraints.empty(State);
      this.actionState = Constraint.Equals.from(descr?.actionState, Actions.emptyActionState());
      this.isProven = Constraint.Equals.from(descr?.isProven, Bool.empty());
      this.isNew = Constraint.Equals.from(descr?.isNew, Bool.empty());
    }

    toInternalRepr(): BindingsLayout.AccountPrecondition {
      // const stateConstraints = this.state instanceof GenericStateConstraints ? this.state.constraints : ;
      const stateConstraints = StateConstraints.toFieldConstraints(this.State, this.state);

      if(stateConstraints.length !== MAX_ZKAPP_STATE_FIELDS) {
        console.log(`length = ${stateConstraints.length}, stateConstraints = ${JSON.stringify(stateConstraints)}`);
        throw new Error('invalid number of zkapp state field constraints');
      }

      return {
        balance: this.balance.toOption(),
        nonce: this.nonce.toOption(),
        receiptChainHash: this.receiptChainHash.toOption(),
        delegate: this.delegate.toOption(),
        state: stateConstraints.map((c) => c.toOption()),
        actionState: this.actionState.toOption(),
        provedState: this.isProven.toOption(),
        isNew: this.isNew.toOption()
      };
    }

    static fromInternalRepr(x: BindingsLayout.AccountPrecondition): Account {
      return new Account<'GenericState'>('GenericState', {
        balance: Constraint.InRange.fromOption(x.balance),
        nonce: Constraint.InRange.fromOption(x.nonce),
        receiptChainHash: Constraint.Equals.fromOption(x.receiptChainHash),
        delegate: Constraint.Equals.fromOption(x.delegate),
        state: new GenericStateConstraints(x.state.map(Constraint.Equals.fromOption<Field>)),
        actionState: Constraint.Equals.fromOption(x.actionState),
        isProven: Constraint.Equals.fromOption(x.provedState),
        isNew: Constraint.Equals.fromOption(x.isNew),
      })
    }

    toJSON(): any {
      return Account.toJSON(this);
    }

    toInput(): HashInput {
      return Account.toInput(this);
    }

    toFields(): Field[] {
      return Account.toFields(this);
    }

    static sizeInFields(): number {
      return BindingsLayout.AccountPrecondition.sizeInFields();
    }

    static emptyPoly<State extends StateLayout>(State: StateDefinition<State>): Account<State> {
      return new Account(State);
    }

    static empty(): Account {
      return this.emptyPoly('GenericState');
    }

    static check<State extends StateLayout>(_x: Account<State>) {
      throw new Error('TODO');
    }

    static toJSON<State extends StateLayout>(x: Account<State>): any {
      return BindingsLayout.AccountPrecondition.toJSON(x.toInternalRepr());
    }

    static toInput<State extends StateLayout>(x: Account<State>): HashInput {
      return BindingsLayout.AccountPrecondition.toInput(x.toInternalRepr());
    }

    static toFields<State extends StateLayout>(x: Account<State>): Field[] {
      return BindingsLayout.AccountPrecondition.toFields(x.toInternalRepr());
    }

    static fromFields(fields: Field[], aux: any[]): Account {
      return Account.fromInternalRepr(BindingsLayout.AccountPrecondition.fromFields(fields, aux));
    }

    static toAuxiliary<State extends StateLayout>(x?: Account<State>): any[] {
      return BindingsLayout.AccountPrecondition.toAuxiliary(x?.toInternalRepr())
    }

    static toValue<State extends StateLayout>(x: Account<State>): Account<State> {
      return x;
    }

    static fromValue<State extends StateLayout>(x: Account<State>): Account<State> {
      return x;
    }

    static from<State extends StateLayout>(
      State: StateDefinition<State>,
      value: Account<State> | AccountDescription<State> | undefined
    ): Account<State> {
      if(value instanceof Account) {
        return value;
      } else if(value === undefined) {
        return Account.emptyPoly(State);
      } else {
        return new Account(State, value);
      }
    }
  }
}
