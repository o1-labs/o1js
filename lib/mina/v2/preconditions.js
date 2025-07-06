"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpochLedgerPreconditions = exports.EpochDataPreconditions = exports.Precondition = exports.Preconditions = void 0;
const state_js_1 = require("./state.js");
const bool_js_1 = require("../../provable/bool.js");
const field_js_1 = require("../../provable/field.js");
const int_js_1 = require("../../provable/int.js");
const signature_js_1 = require("../../provable/crypto/signature.js");
// TODO: pull last remanants of old transaction leavs into v2 bindings
const transaction_leaves_js_1 = require("../../../bindings/mina-transaction/v1/transaction-leaves.js");
const BindingsLayout = require("../../../bindings/mina-transaction/gen/v2/js-layout.js");
const constants_js_1 = require("../v1/constants.js");
var Precondition;
(function (Precondition) {
    class Equals {
        constructor(isEnabled, value) {
            this.isEnabled = isEnabled;
            this.value = value;
        }
        toStringHuman() {
            if (!this.isEnabled.toBoolean()) {
                return 'disabled';
            }
            else {
                return `== ${this.value}`;
            }
        }
        toValue(defaultValue) {
            if (this.isEnabled.toBoolean()) {
                return this.value;
            }
            else {
                return defaultValue;
            }
        }
        mapToValue(defaultValue, f) {
            if (this.isEnabled.toBoolean()) {
                return f(this.value);
            }
            else {
                return defaultValue;
            }
        }
        toOption() {
            return { isSome: this.isEnabled, value: this.value };
        }
        isSatisfied(x) {
            return bool_js_1.Bool.or(this.isEnabled.not(), this.value.equals(x));
        }
        static disabled(defaultValue) {
            return new Equals(new bool_js_1.Bool(false), defaultValue);
        }
        static equals(value) {
            return new Equals(new bool_js_1.Bool(true), value);
        }
        static fromOption(option) {
            return new Equals(option.isSome, option.value);
        }
        static from(value, defaultValue) {
            if (value instanceof Equals) {
                return value;
            }
            else if (value !== undefined) {
                return Equals.equals(value);
            }
            else {
                return Equals.disabled(defaultValue);
            }
        }
    }
    Precondition.Equals = Equals;
    class InRange {
        constructor(isEnabled, lower, upper) {
            this.isEnabled = isEnabled;
            this.lower = lower;
            this.upper = upper;
        }
        toStringHuman() {
            if (!this.isEnabled.toBoolean()) {
                return 'disabled';
            }
            else if (this.lower.equals(this.upper).toBoolean()) {
                return `== ${this.lower}`;
            }
            else {
                return `between (${this.lower}, ${this.upper})`;
            }
        }
        toValue(defaultValue) {
            if (this.isEnabled.toBoolean()) {
                return { lower: this.lower, upper: this.upper };
            }
            else {
                return defaultValue;
            }
        }
        mapToValue(defaultValue, f) {
            if (this.isEnabled.toBoolean()) {
                return { lower: f(this.lower), upper: f(this.upper) };
            }
            else {
                return defaultValue;
            }
        }
        toOption() {
            return {
                isSome: this.isEnabled,
                value: {
                    lower: this.lower,
                    upper: this.upper,
                },
            };
        }
        isSatisfied(x) {
            return bool_js_1.Bool.or(this.isEnabled.not(), bool_js_1.Bool.and(this.lower.lessThanOrEqual(x), this.upper.greaterThanOrEqual(x)));
        }
        static disabled(defaultValue) {
            const isDefaultRange = typeof defaultValue === 'object' &&
                defaultValue !== null &&
                'lower' in defaultValue &&
                'upper' in defaultValue;
            const lower = isDefaultRange ? defaultValue.lower : defaultValue;
            const upper = isDefaultRange ? defaultValue.upper : defaultValue;
            return new InRange(new bool_js_1.Bool(false), lower, upper);
        }
        static equals(value) {
            return new InRange(new bool_js_1.Bool(true), value, value);
        }
        static betweenInclusive(lower, upper) {
            return new InRange(new bool_js_1.Bool(true), lower, upper);
        }
        static fromOption(option) {
            return new InRange(option.isSome, option.value.lower, option.value.upper);
        }
        // TODO: lessThan, greaterThan
        static from(value, defaultValue) {
            if (value instanceof InRange) {
                return value;
            }
            else if (value !== undefined) {
                return InRange.equals(value);
            }
            else {
                return InRange.disabled(defaultValue);
            }
        }
    }
    Precondition.InRange = InRange;
})(Precondition || (exports.Precondition = Precondition = {}));
class Preconditions {
    constructor(State, descr) {
        this.network = NetworkPreconditions.from(descr?.network);
        this.account = AccountPreconditions.from(State, descr?.account);
        this.validWhile = Precondition.InRange.from(descr?.validWhile, {
            lower: int_js_1.UInt32.empty(),
            upper: int_js_1.UInt32.MAXINT(),
        });
    }
    toGeneric() {
        return new Preconditions('GenericState', {
            ...this,
            account: this.account.toGeneric(),
        });
    }
    static fromGeneric(x, State) {
        return new Preconditions(State, {
            ...this,
            account: AccountPreconditions.fromGeneric(x.account, State),
        });
    }
    toInternalRepr() {
        return {
            network: this.network.toInternalRepr(),
            account: this.account.toInternalRepr(),
            validWhile: this.validWhile.toOption(),
        };
    }
    static fromInternalRepr(x) {
        return new Preconditions('GenericState', {
            network: NetworkPreconditions.fromInternalRepr(x.network),
            account: AccountPreconditions.fromInternalRepr(x.account),
            validWhile: Precondition.InRange.fromOption(x.validWhile),
        });
    }
    toJSON() {
        return Preconditions.toJSON(this);
    }
    toInput() {
        return Preconditions.toInput(this);
    }
    toFields() {
        return Preconditions.toFields(this);
    }
    static sizeInFields() {
        return BindingsLayout.Preconditions.sizeInFields();
    }
    static emptyPoly(State) {
        return new Preconditions(State);
    }
    static empty() {
        return new Preconditions('GenericState');
    }
    static check(_x) {
        throw new Error('TODO');
    }
    static toJSON(x) {
        return BindingsLayout.Preconditions.toJSON(x.toInternalRepr());
    }
    static toInput(x) {
        return BindingsLayout.Preconditions.toInput(x.toInternalRepr());
    }
    static toFields(x) {
        return BindingsLayout.Preconditions.toFields(x.toInternalRepr());
    }
    static fromFields(fields, aux) {
        return Preconditions.fromInternalRepr(BindingsLayout.Preconditions.fromFields(fields, aux));
    }
    static toAuxiliary(x) {
        return BindingsLayout.Preconditions.toAuxiliary(x?.toInternalRepr());
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static from(State, value) {
        if (value instanceof Preconditions) {
            return value;
        }
        else if (value === undefined) {
            return Preconditions.emptyPoly(State);
        }
        else {
            return new Preconditions(State, value);
        }
    }
}
exports.Preconditions = Preconditions;
class EpochLedgerPreconditions {
    constructor(descr) {
        this.hash = Precondition.Equals.from(descr?.hash, new field_js_1.Field(0));
        this.totalCurrency = Precondition.InRange.from(descr?.totalCurrency, {
            lower: int_js_1.UInt64.empty(),
            upper: int_js_1.UInt64.MAXINT(),
        });
    }
    toInternalRepr() {
        return {
            hash: this.hash.toOption(),
            totalCurrency: this.totalCurrency.toOption(),
        };
    }
    static fromInternalRepr(x) {
        return new EpochLedgerPreconditions({
            hash: Precondition.Equals.fromOption(x.hash),
            totalCurrency: Precondition.InRange.fromOption(x.totalCurrency),
        });
    }
    toJSON() {
        return EpochLedgerPreconditions.toJSON(this);
    }
    toInput() {
        return EpochLedgerPreconditions.toInput(this);
    }
    toFields() {
        return EpochLedgerPreconditions.toFields(this);
    }
    static sizeInFields() {
        return BindingsLayout.EpochLedgerPrecondition.sizeInFields();
    }
    static empty() {
        return new EpochLedgerPreconditions();
    }
    static check(_x) {
        throw new Error('TODO');
    }
    static toJSON(x) {
        return BindingsLayout.EpochLedgerPrecondition.toJSON(x.toInternalRepr());
    }
    static toInput(x) {
        return BindingsLayout.EpochLedgerPrecondition.toInput(x.toInternalRepr());
    }
    static toFields(x) {
        return BindingsLayout.EpochLedgerPrecondition.toFields(x.toInternalRepr());
    }
    static fromFields(fields, aux) {
        return EpochLedgerPreconditions.fromInternalRepr(BindingsLayout.EpochLedgerPrecondition.fromFields(fields, aux));
    }
    static toAuxiliary(x) {
        return BindingsLayout.EpochLedgerPrecondition.toAuxiliary(x?.toInternalRepr());
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static from(value) {
        if (value instanceof EpochLedgerPreconditions) {
            return value;
        }
        else if (value === undefined) {
            return EpochLedgerPreconditions.empty();
        }
        else {
            return new EpochLedgerPreconditions(value);
        }
    }
}
exports.EpochLedgerPreconditions = EpochLedgerPreconditions;
class EpochDataPreconditions {
    constructor(descr) {
        this.ledger = EpochLedgerPreconditions.from(descr?.ledger);
        this.seed = Precondition.Equals.from(descr?.seed, new field_js_1.Field(0));
        this.startCheckpoint = Precondition.Equals.from(descr?.startCheckpoint, new field_js_1.Field(0));
        this.lockCheckpoint = Precondition.Equals.from(descr?.lockCheckpoint, new field_js_1.Field(0));
        this.epochLength = Precondition.InRange.from(descr?.epochLength, {
            lower: int_js_1.UInt32.empty(),
            upper: int_js_1.UInt32.MAXINT(),
        });
    }
    toInternalRepr() {
        return {
            ledger: this.ledger.toInternalRepr(),
            seed: this.seed.toOption(),
            startCheckpoint: this.startCheckpoint.toOption(),
            lockCheckpoint: this.lockCheckpoint.toOption(),
            epochLength: this.epochLength.toOption(),
        };
    }
    static fromInternalRepr(x) {
        return new EpochDataPreconditions({
            ledger: EpochLedgerPreconditions.fromInternalRepr(x.ledger),
            seed: Precondition.Equals.fromOption(x.seed),
            startCheckpoint: Precondition.Equals.fromOption(x.startCheckpoint),
            lockCheckpoint: Precondition.Equals.fromOption(x.lockCheckpoint),
            epochLength: Precondition.InRange.fromOption(x.epochLength),
        });
    }
    toJSON() {
        return EpochDataPreconditions.toJSON(this);
    }
    toInput() {
        return EpochDataPreconditions.toInput(this);
    }
    toFields() {
        return EpochDataPreconditions.toFields(this);
    }
    static sizeInFields() {
        return BindingsLayout.EpochDataPrecondition.sizeInFields();
    }
    static empty() {
        return new EpochDataPreconditions();
    }
    static check(_x) {
        throw new Error('TODO');
    }
    static toJSON(x) {
        return BindingsLayout.EpochDataPrecondition.toJSON(x.toInternalRepr());
    }
    static toInput(x) {
        return BindingsLayout.EpochDataPrecondition.toInput(x.toInternalRepr());
    }
    static toFields(x) {
        return BindingsLayout.EpochDataPrecondition.toFields(x.toInternalRepr());
    }
    static fromFields(fields, aux) {
        return EpochDataPreconditions.fromInternalRepr(BindingsLayout.EpochDataPrecondition.fromFields(fields, aux));
    }
    static toAuxiliary(x) {
        return BindingsLayout.EpochDataPrecondition.toAuxiliary(x?.toInternalRepr());
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static from(value) {
        if (value instanceof EpochDataPreconditions) {
            return value;
        }
        else if (value === undefined) {
            return EpochDataPreconditions.empty();
        }
        else {
            return new EpochDataPreconditions(value);
        }
    }
}
exports.EpochDataPreconditions = EpochDataPreconditions;
class NetworkPreconditions {
    constructor(descr) {
        this.snarkedLedgerHash = Precondition.Equals.from(descr?.snarkedLedgerHash, field_js_1.Field.empty());
        this.blockchainLength = Precondition.InRange.from(descr?.blockchainLength, {
            lower: int_js_1.UInt32.empty(),
            upper: int_js_1.UInt32.MAXINT(),
        });
        this.minWindowDensity = Precondition.InRange.from(descr?.minWindowDensity, {
            lower: int_js_1.UInt32.empty(),
            upper: int_js_1.UInt32.MAXINT(),
        });
        this.totalCurrency = Precondition.InRange.from(descr?.totalCurrency, {
            lower: int_js_1.UInt64.empty(),
            upper: int_js_1.UInt64.MAXINT(),
        });
        this.globalSlotSinceGenesis = Precondition.InRange.from(descr?.globalSlotSinceGenesis, {
            lower: int_js_1.UInt32.empty(),
            upper: int_js_1.UInt32.MAXINT(),
        });
        this.stakingEpochData = EpochDataPreconditions.from(descr?.stakingEpochData);
        this.nextEpochData = EpochDataPreconditions.from(descr?.nextEpochData);
    }
    toInternalRepr() {
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
    static fromInternalRepr(x) {
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
    static empty() {
        return new NetworkPreconditions();
    }
    toJSON() {
        return NetworkPreconditions.toJSON(this);
    }
    toInput() {
        return NetworkPreconditions.toInput(this);
    }
    toFields() {
        return NetworkPreconditions.toFields(this);
    }
    static sizeInFields() {
        return BindingsLayout.NetworkPrecondition.sizeInFields();
    }
    static check(_x) {
        throw new Error('TODO');
    }
    static toJSON(x) {
        return BindingsLayout.NetworkPrecondition.toJSON(x.toInternalRepr());
    }
    static toInput(x) {
        return BindingsLayout.NetworkPrecondition.toInput(x.toInternalRepr());
    }
    static toFields(x) {
        return BindingsLayout.NetworkPrecondition.toFields(x.toInternalRepr());
    }
    static fromFields(fields, aux) {
        return NetworkPreconditions.fromInternalRepr(BindingsLayout.NetworkPrecondition.fromFields(fields, aux));
    }
    static toAuxiliary(x) {
        return BindingsLayout.NetworkPrecondition.toAuxiliary(x?.toInternalRepr());
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static from(value) {
        if (value instanceof NetworkPreconditions) {
            return value;
        }
        else if (value === undefined) {
            return NetworkPreconditions.empty();
        }
        else {
            return new NetworkPreconditions(value);
        }
    }
}
class AccountPreconditions {
    constructor(State, descr) {
        this.State = State;
        this.balance = Precondition.InRange.from(descr?.balance, {
            lower: int_js_1.UInt64.empty(),
            upper: int_js_1.UInt64.MAXINT(),
        });
        this.nonce = Precondition.InRange.from(descr?.nonce, {
            lower: int_js_1.UInt32.empty(),
            upper: int_js_1.UInt32.MAXINT(),
        });
        this.receiptChainHash = Precondition.Equals.from(descr?.receiptChainHash, field_js_1.Field.empty());
        this.delegate = Precondition.Equals.from(descr?.delegate, signature_js_1.PublicKey.empty());
        this.state = descr?.state ?? state_js_1.StatePreconditions.empty(State);
        this.actionState = Precondition.Equals.from(descr?.actionState, transaction_leaves_js_1.Actions.emptyActionState());
        this.isProven = Precondition.Equals.from(descr?.isProven, bool_js_1.Bool.empty());
        this.isNew = Precondition.Equals.from(descr?.isNew, bool_js_1.Bool.empty());
    }
    toGeneric() {
        return AccountPreconditions.generic({
            ...this,
            state: state_js_1.StatePreconditions.toGeneric(this.State, this.state),
        });
    }
    static fromGeneric(x, State) {
        return new AccountPreconditions(State, {
            ...this,
            state: state_js_1.StatePreconditions.fromGeneric(x.state, State),
        });
    }
    toInternalRepr() {
        const statePreconditions = state_js_1.StatePreconditions.toFieldPreconditions(this.State, this.state);
        if (statePreconditions.length !== constants_js_1.ZkappConstants.MAX_ZKAPP_STATE_FIELDS) {
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
    static fromInternalRepr(x) {
        return new AccountPreconditions('GenericState', {
            balance: Precondition.InRange.fromOption(x.balance),
            nonce: Precondition.InRange.fromOption(x.nonce),
            receiptChainHash: Precondition.Equals.fromOption(x.receiptChainHash),
            delegate: Precondition.Equals.fromOption(x.delegate),
            state: new state_js_1.GenericStatePreconditions(x.state.map((Precondition.Equals.fromOption))),
            actionState: Precondition.Equals.fromOption(x.actionState),
            isProven: Precondition.Equals.fromOption(x.provedState),
            isNew: Precondition.Equals.fromOption(x.isNew),
        });
    }
    toJSON() {
        return AccountPreconditions.toJSON(this);
    }
    toInput() {
        return AccountPreconditions.toInput(this);
    }
    toFields() {
        return AccountPreconditions.toFields(this);
    }
    static generic(descr) {
        return new AccountPreconditions('GenericState', descr);
    }
    static sizeInFields() {
        return BindingsLayout.AccountPrecondition.sizeInFields();
    }
    static emptyPoly(State) {
        return new AccountPreconditions(State);
    }
    static empty() {
        return this.emptyPoly('GenericState');
    }
    static check(_x) {
        throw new Error('TODO');
    }
    static toJSON(x) {
        return BindingsLayout.AccountPrecondition.toJSON(x.toInternalRepr());
    }
    static toInput(x) {
        return BindingsLayout.AccountPrecondition.toInput(x.toInternalRepr());
    }
    static toFields(x) {
        return BindingsLayout.AccountPrecondition.toFields(x.toInternalRepr());
    }
    static fromFields(fields, aux) {
        return AccountPreconditions.fromInternalRepr(BindingsLayout.AccountPrecondition.fromFields(fields, aux));
    }
    static toAuxiliary(x) {
        return BindingsLayout.AccountPrecondition.toAuxiliary(x?.toInternalRepr());
    }
    static toValue(x) {
        return x;
    }
    static fromValue(x) {
        return x;
    }
    static from(State, value) {
        if (value instanceof AccountPreconditions) {
            return value;
        }
        else if (value === undefined) {
            return AccountPreconditions.emptyPoly(State);
        }
        else {
            return new AccountPreconditions(State, value);
        }
    }
}
