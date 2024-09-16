import { MAX_ZKAPP_STATE_FIELDS, Constraint, Empty, GenericStateConstraints, MinaAmount, State } from './core.js';
import { Bool } from '../../provable/bool.js'
import { Field } from '../../provable/field.js'
import { UInt32, UInt64 } from '../../provable/int.js'
import { PublicKey } from '../../provable/crypto/signature.js'
// TODO: pull last remanants of old transaction leavs into v2 bindings
import { Actions } from '../../../bindings/mina-transaction/transaction-leaves.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/js-layout-v2.js';

export type PreconditionsDescription<SC extends State.Constraints> = {
	network?: Preconditions.Network | Preconditions.NetworkDescription,
	account?: Preconditions.Account<SC> | Preconditions.AccountDescription<SC>,
	validWhile?: UInt32 | Constraint.InRange<UInt32>
}

export class Preconditions<SC extends State.Constraints> {
	readonly network: Preconditions.Network;
	readonly account: Preconditions.Account<SC>;
	readonly validWhile: Constraint.InRange<UInt32>;

  constructor(StateConstraint: Empty<SC>, descr?: PreconditionsDescription<SC>) {
    this.network = Preconditions.Network.from(descr?.network);
    this.account = Preconditions.Account.from(StateConstraint, descr?.account);
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

  static fromInternalRepr(x: BindingsLayout.Preconditions): Preconditions<GenericStateConstraints> {
    return new Preconditions(GenericStateConstraints, {
      network: Preconditions.Network.fromInternalRepr(x.network),
      account: Preconditions.Account.fromInternalRepr(x.account),
      validWhile: Constraint.InRange.fromOption(x.validWhile),
    });
  }

  toJSON(): any {
    return Preconditions.toJSON(this);
  }

  toFields(): Field[] {
    return Preconditions.toFields(this);
  }

  static sizeInFields(): number {
    return BindingsLayout.Preconditions.sizeInFields();
  }

  static emptyPoly<SC extends State.Constraints>(StateConstraints: Empty<SC>): Preconditions<SC> {
    return new Preconditions(StateConstraints);
  }

  static empty(): Preconditions<GenericStateConstraints> {
    return new Preconditions(GenericStateConstraints);
  }

  static check<SC extends State.Constraints>(_x: Preconditions<SC>) {
    throw new Error('TODO');
  }

  static toJSON<SC extends State.Constraints>(x: Preconditions<SC>): any {
    return BindingsLayout.Preconditions.toJSON(x.toInternalRepr());
  }

  static toFields<SC extends State.Constraints>(x: Preconditions<SC>): Field[] {
    return BindingsLayout.Preconditions.toFields(x.toInternalRepr());
  }

  static fromFields(fields: Field[], aux: any[]): Preconditions<GenericStateConstraints> {
    return Preconditions.fromInternalRepr(BindingsLayout.Preconditions.fromFields(fields, aux));
  }

  static toAuxiliary<SC extends State.Constraints>(x?: Preconditions<SC>): any[] {
    return BindingsLayout.Preconditions.toAuxiliary(x?.toInternalRepr());
  }

  static toValue<SC extends State.Constraints>(x: Preconditions<SC>): Preconditions<SC> {
    return x;
  }

  static fromValue<SC extends State.Constraints>(x: Preconditions<SC>): Preconditions<SC> {
    return x;
  }

  static from<SC extends State.Constraints>(StateConstraint: Empty<SC>, value: Preconditions<SC> | PreconditionsDescription<SC> | undefined): Preconditions<SC> {
    if(value instanceof Preconditions) {
      return value;
    } else if(value === undefined) {
      return Preconditions.emptyPoly(StateConstraint);
    } else {
      return new Preconditions(StateConstraint, value);
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

    toJSON(): any {
      return Network.toJSON(this);
    }

    toFields(): Field[] {
      return Network.toFields(this);
    }

    static sizeInFields(): number {
      return BindingsLayout.NetworkPrecondition.sizeInFields();
    }

    static empty(): Network {
      return new Network();
    }

    static check(_x: Network) {
      throw new Error('TODO');
    }

    static toJSON(x: Network): any {
      return BindingsLayout.NetworkPrecondition.toJSON(x.toInternalRepr());
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

  export type AccountDescription<SC extends State.Constraints> = {
		balance?: MinaAmount | Constraint.InRange<MinaAmount>,
		nonce?: UInt32 | Constraint.InRange<UInt32>,
		receiptChainHash?: Field | Constraint.Equals<Field>,
		delegate?: PublicKey | Constraint.Equals<PublicKey>,
		state?: SC,
		actionState?: Field | Constraint.Equals<Field>,
    // NB: renamed from the protocol's type name of `provenState`
		isProven?: Bool | Constraint.Equals<Bool>,
		isNew?: Bool | Constraint.Equals<Bool>
  };

  export class Account<SC extends State.Constraints> {
		readonly balance: Constraint.InRange<MinaAmount>;
		readonly nonce: Constraint.InRange<UInt32>;
		readonly receiptChainHash: Constraint.Equals<Field>;
		readonly delegate: Constraint.Equals<PublicKey>;
		readonly state: SC;
		readonly actionState: Constraint.Equals<Field>;
		readonly isProven: Constraint.Equals<Bool>;
		readonly isNew: Constraint.Equals<Bool>;

    constructor(StateConstraint: Empty<SC>, descr?: AccountDescription<SC>) {
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
      this.state = descr?.state ?? StateConstraint.empty();
      this.actionState = Constraint.Equals.from(descr?.actionState, Actions.emptyActionState());
      this.isProven = Constraint.Equals.from(descr?.isProven, Bool.empty());
      this.isNew = Constraint.Equals.from(descr?.isNew, Bool.empty());
    }

    toInternalRepr(): BindingsLayout.AccountPrecondition {
      const stateConstraints = this.state.toFieldConstraints();
      if(stateConstraints.length !== MAX_ZKAPP_STATE_FIELDS) {
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

    static fromInternalRepr(x: BindingsLayout.AccountPrecondition): Account<GenericStateConstraints> {
      return new Account(GenericStateConstraints, {
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

    toFields(): Field[] {
      return Account.toFields(this);
    }

    static sizeInFields(): number {
      return BindingsLayout.AccountPrecondition.sizeInFields();
    }

    static emptyPoly<SC extends State.Constraints>(StateConstraint: Empty<SC>): Account<SC> {
      return new Account(StateConstraint);
    }

    static empty(): Account<GenericStateConstraints> {
      return this.emptyPoly(GenericStateConstraints);
    }

    static check<SC extends State.Constraints>(_x: Account<SC>) {
      throw new Error('TODO');
    }

    static toJSON<SC extends State.Constraints>(x: Account<SC>): any {
      return BindingsLayout.AccountPrecondition.toJSON(x.toInternalRepr());
    }

    static toFields<SC extends State.Constraints>(x: Account<SC>): Field[] {
      return BindingsLayout.AccountPrecondition.toFields(x.toInternalRepr());
    }

    static fromFields(fields: Field[], aux: any[]): Account<GenericStateConstraints> {
      return Account.fromInternalRepr(BindingsLayout.AccountPrecondition.fromFields(fields, aux));
    }

    static toAuxiliary<SC extends State.Constraints>(x?: Account<SC>): any[] {
      return BindingsLayout.AccountPrecondition.toAuxiliary(x?.toInternalRepr())
    }

    static toValue<SC extends State.Constraints>(x: Account<SC>): Account<SC> {
      return x;
    }

    static fromValue<SC extends State.Constraints>(x: Account<SC>): Account<SC> {
      return x;
    }

    static from<SC extends State.Constraints>(
      StateConstraint: Empty<SC>,
      value: Account<SC> | AccountDescription<SC> | undefined
    ): Account<SC> {
      if(value instanceof Account) {
        return value;
      } else if(value === undefined) {
        return Account.emptyPoly(StateConstraint);
      } else {
        return new Account(StateConstraint, value);
      }
    }
  }
}
