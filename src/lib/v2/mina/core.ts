import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { Field as WrappedField } from '../../provable/wrapped.js';
import { emptyHashWithPrefix, hashWithPrefix, packToFields } from '../../provable/crypto/poseidon.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { Provable } from '../../provable/types/provable-intf.js';
import { prefixes, protocolVersions } from '../../../bindings/crypto/constants.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';
import { Types } from '../../../bindings/mina-transaction/types.js';
import { bytesToBits, prefixToField, stringLengthInBytes, stringToBytes } from '../../../bindings/lib/binable.js';
import { GenericHashInput } from '../../../bindings/lib/generic.js';

export import Option = Bindings.Leaves.Option;
export import Range = Bindings.Leaves.Range;

export const MAX_ZKAPP_STATE_FIELDS = 8;

export const CURRENT_TRANSACTION_VERSION = UInt32.from(protocolVersions.txnVersion);

export const MAX_TOKEN_SYMBOL_LENGTH = 6;

// TODO: constructors from Mina and NanoMina
export type MinaAmount = UInt64;

export function mapUndefined<A, B>(value: A | undefined, f: (a: A) => B): B | undefined {
  return value === undefined ? undefined : f(value);
}

export interface ToFields {
  toFields(): Field[];
}

export type Tuple<T> = [T, ...T[]] | [];

export type ProvableTuple = Tuple<Provable<any>>;

export type ProvableInstance<P> = P extends Provable<infer T> ? T : never;

export type ProvableTupleInstances<T extends ProvableTuple> = {[I in keyof T]: ProvableInstance<T[I]>};

export type Constructor<T> = new (...args: any[]) => T;

// TODO: delete and replace with state register layout interface
export interface Empty<T> {
  empty: () => T;
}

// TODO: Using this pattern, we can remove a lot of the boilerplate from type definitions which
//       wrap `BindingsType`s. However, this comes at the cost of making the code less direct,
//       and thus harder to document. I'm leaving this here for now in case we decide it's more
//       important for the code to be ergonomic for core developers.
/*
export function deriveProvableUnderConversion<T extends Object, Repr>(
  Repr: Provable<Repr>,
  BaseClass: (new (...args: any[]) => T) & {
    toProvableRepr(x: T): Repr;
    fromProvableRepr(x: Repr): T;
  }
) {
  return class extends BaseClass {
    static sizeInFields(): number {
      return Repr.sizeInFields();
    }

    static toFields(x: T): Field[] {
      return Repr.toFields(BaseClass.toProvableRepr(x))
    }

    static toAuxiliary(x?: T): any[] {
      return Repr.toAuxiliary(x !== undefined ? BaseClass.toProvableRepr(x) : undefined);
    }

    static fromFields(fields: Field[], aux: any[]): T {
      return BaseClass.fromProvableRepr(Repr.fromFields(fields, aux));
    }

    static toValue(x: T): T {
      return x;
    }

    static fromValue(x: T): T {
      return x;
    }

    static check(_x: T) {
      throw new Error('TODO');
    }
  }
}
*/

// TODO
export class TokenId {
  // TODO: construct this from it's parts, don't pass in the raw Field directly
  constructor(
    public value: Field
  ) {}

  static MINA: TokenId = new TokenId(new Field(1));
}

export class AccountId {
  constructor(
    public publicKey: PublicKey,
    public tokenId: TokenId
  ) {}

  static empty(): AccountId {
    return new AccountId(
      PublicKey.empty(),
      TokenId.MINA
    );
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

export class AccountTiming {
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
    initialMinimumBalance: UInt64,
    cliffTime: UInt32,
    cliffAmount: UInt64,
    vestingPeriod: UInt32,
    vestingIncrement: UInt64,
  }) {
    this.initialMinimumBalance = initialMinimumBalance;
    this.cliffTime = cliffTime;
    this.cliffAmount = cliffAmount;
    this.vestingPeriod = vestingPeriod;
    this.vestingIncrement = vestingIncrement;
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

export class ZkappUri {
  readonly data: string;
  readonly hash: Field;

  constructor(uri: string | { data: string, hash: Field }) {
    if(typeof uri === 'object') {
      this.data = uri.data;
      this.hash = uri.hash;
    } else {
      this.data = uri;

      let packed: Field[];
      if(uri.length === 0) {
        packed = [new Field(0), new Field(0)];
      } else {
        const bits = bytesToBits(stringToBytes(uri));
        bits.push(true);
        const input: GenericHashInput<Field> = {
          packed: bits.map((b) => [new Field(Number(b)), 1]),
        };
        packed = packToFields(input);
      }

      this.hash = hashWithPrefix(prefixes.zkappUri, packed);
    }
  }

  toJSON(): Types.Json.AccountUpdate['body']['update']['zkappUri'] {
    return this.data.toString();
  }

  static empty(): ZkappUri {
    return new ZkappUri("");
  }

  static from(uri: ZkappUri | string): ZkappUri {
    return uri instanceof ZkappUri ? uri : new ZkappUri(uri);
  }
}

// TODO NOW -- figure out a better way to combine this and the bindings leaves version
export class TokenSymbol {
  readonly symbol: string;
  readonly field: Field;

  constructor(symbol: string | { symbol: string, field: Field }) {
    if(typeof symbol === 'object') {
      this.symbol = symbol.symbol;
      this.field = symbol.field;
    } else {
      let bytesLength = stringLengthInBytes(symbol);
      if (bytesLength > MAX_TOKEN_SYMBOL_LENGTH) {
        throw Error(`Token symbol ${symbol} should be a maximum of ${MAX_TOKEN_SYMBOL_LENGTH} bytes, but is ${bytesLength}`);
      }

      this.symbol = symbol;
      this.field = prefixToField(WrappedField, symbol)
    }
  }

  toJSON(): Types.Json.AccountUpdate['body']['update']['tokenSymbol'] {
    return this.symbol.toString();
  }

  static empty(): TokenSymbol {
    return new TokenSymbol("");
  }

  static from(symbol: TokenSymbol | string): TokenSymbol {
    return symbol instanceof TokenSymbol ? symbol : new TokenSymbol(symbol);
  }
}

/*
// TODO: should we change this in the protocol to be range constraints?
export class GenericStateConstraints implements State.Constraints {
  constructor(
    public constraints: Constraint.Equals<Field>[]
  ) {
    if(this.constraints.length > MAX_ZKAPP_STATE_FIELDS) {
      throw new Error('exceeded maximum number of state constraints');
    }

    if(this.constraints.length < MAX_ZKAPP_STATE_FIELDS) {
      for(let i = this.constraints.length; i < MAX_ZKAPP_STATE_FIELDS; i++) {
        this.constraints.push(Constraint.Equals.disabled(Field.empty()))
      }
    }

    if(this.constraints.length !== MAX_ZKAPP_STATE_FIELDS) {
      throw new Error('invariant broken');
    }
  }

  toFieldConstraints(): Constraint.Equals<Field>[] {
    return [...this.constraints];
  }

  static empty(): GenericStateConstraints {
    return new GenericStateConstraints([]);
  }
}

export class GenericStateUpdates implements State.Updates {
  constructor(
    public updates: Update<Field>[]
  ) {
    if(this.updates.length > MAX_ZKAPP_STATE_FIELDS) {
      throw new Error('exceeded maximum number of state constraints');
    }

    if(this.updates.length < MAX_ZKAPP_STATE_FIELDS) {
      for(let i = this.updates.length; i < MAX_ZKAPP_STATE_FIELDS; i++) {
        this.updates.push(Update.disabled(Field.empty()))
      }
    }

    if(this.updates.length !== MAX_ZKAPP_STATE_FIELDS) {
      throw new Error('invariant broken');
    }
  }

  toFieldUpdates(): Update<Field>[] {
    return [...this.updates];
  }

  static empty(): GenericStateUpdates {
    return new GenericStateUpdates([]);
  }
}

export const GenericState = {
  Constraints: GenericStateConstraints,
  Updates: GenericStateUpdates,
};

GenericState satisfies State.Definition<GenericStateConstraints, GenericStateUpdates>;
*/

/*
export class GenericEvent implements ToFields {
  constructor(
    public data: Field[]
  ) {}

  toFields(): Field[] {
    return [...this.data];
  }

  hash(): Field {
    return hashWithPrefix(prefixes.event, this.data);
  }

  static hashList(emptyPrefix: string, consPrefix: string, events: GenericEvent[]): Field {
    let hash = emptyHashWithPrefix(emptyPrefix);

    for(let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      hash = hashWithPrefix(consPrefix, [hash, event.hash()]);
    }

    return hash;
  }

  static from<Event extends ToFields>(event: Event): GenericEvent {
    return new GenericEvent(event.toFields());
  }
}

export function hashEvents(events: GenericEvent[]): Field {
  return GenericEvent.hashList('MinaZkappEventsEmpty', prefixes.events, events);
}

export function hashActions(actions: GenericEvent[]): Field {
  return GenericEvent.hashList('MinaZkappActionsEmpty', prefixes.sequenceEvents, actions);
}
*/

export class Update<T> {
  constructor(
    public set: Bool,
    public value: T
  ) {}

  // these functions are bad because they rely on toBoolean, such usage needs to be better considered and marked
  /*
  toValue<D>(defaultValue: D): T | D {
    if(this.set.toBoolean()) {
      return this.value;
    } else {
      return defaultValue;
    }
  }

  mapToValue<D, R>(defaultValue: D, f: (t: T) => R): R | D {
    if(this.set.toBoolean()) {
      return f(this.value);
    } else {
      return defaultValue;
    }
  }
  */

  toOption(): Option<T> {
    return {isSome: this.set, value: this.value};
  }

  static fromOption<T>(option: Option<T>): Update<T> {
    return new Update(option.isSome, option.value);
  }

  static disabled<T>(defaultValue: T): Update<T> {
    return new Update(new Bool(false), defaultValue);
  }

  static set<T>(value: T): Update<T> {
    return new Update(new Bool(true), value);
  }

  static from<T>(value: Update<T> | T | undefined, defaultValue: T): Update<T> {
    if(value instanceof Update) {
      return value;
    } else if(value !== undefined) {
      return Update.set(value);
    } else {
      return Update.disabled(defaultValue);
    }
  }
}

export namespace Constraint {
  export class Equals<T> {
    constructor(
      public isEnabled: Bool,
      public value: T
    ) {}

    toValue<D>(defaultValue: D): T | D {
      if(this.isEnabled.toBoolean()) {
        return this.value;
      } else {
        return defaultValue;
      }
    }

    mapToValue<D, R>(defaultValue: D, f: (t: T) => R): R | D {
      if(this.isEnabled.toBoolean()) {
        return f(this.value);
      } else {
        return defaultValue;
      }
    }

    toOption(): Option<T> {
      return {isSome: this.isEnabled, value: this.value};
    }

    static disabled<T>(defaultValue: T): Equals<T> {
      return new Equals(new Bool(false), defaultValue);
    }

    static equals<T>(value: T): Equals<T> {
      return new Equals(new Bool(true), value);
    }

    static fromOption<T>(option: Option<T>): Equals<T> {
      return new Equals(option.isSome, option.value);
    }

    static from<T>(value: Equals<T> | T | undefined, defaultValue: T): Equals<T> {
      if(value instanceof Equals) {
        return value;
      } else if(value !== undefined) {
        return Equals.equals(value);
      } else {
        return Equals.disabled(defaultValue);
      }
    }
  }

  export class InRange<T> {
    constructor(
      public isEnabled: Bool,
      public lower: T,
      public upper: T
    ) {}

    toValue<D>(defaultValue: D): {lower: T, upper: T} | D {
      if(this.isEnabled.toBoolean()) {
        return {lower: this.lower, upper: this.upper};
      } else {
        return defaultValue;
      }
    }

    mapToValue<D, R>(defaultValue: D, f: (t: T) => R): {lower: R, upper: R} | D {
      if(this.isEnabled.toBoolean()) {
        return {lower: f(this.lower), upper: f(this.upper)};
      } else {
        return defaultValue;
      }
    }

    toOption(): Option<Range<T>> {
      return {
        isSome: this.isEnabled,
        value: {
          lower: this.lower,
          upper: this.upper
        }
      };
    }

    static disabled<T>(defaultValue: T | {lower: T, upper: T}): InRange<T> {
      const isDefaultRange = typeof defaultValue === 'object' && defaultValue !== null && 'lower' in defaultValue && 'upper' in defaultValue;
      const lower = isDefaultRange ? defaultValue.lower : defaultValue;
      const upper = isDefaultRange ? defaultValue.upper : defaultValue;
      return new InRange(new Bool(false), lower, upper);
    }

    static equals<T>(value: T): InRange<T> {
      return new InRange(new Bool(true), value, value);
    }

    static betweenInclusive<T>(lower: T, upper: T): InRange<T> {
      return new InRange(new Bool(true), lower, upper);
    }

    static fromOption<T>(option: Option<Range<T>>): InRange<T> {
      return new InRange(option.isSome, option.value.lower, option.value.upper);
    }

    // TODO: lessThan, greaterThan

    static from<T>(value: InRange<T> | T | undefined, defaultValue: T | {lower: T, upper: T}): InRange<T> {
      if(value instanceof InRange) {
        return value;
      } else if(value !== undefined) {
        return InRange.equals(value);
      } else {
        return InRange.disabled(defaultValue);
      }
    }
  }
}

/*
export namespace State {
  export interface Constraints {
    toFieldConstraints(): Constraint.Equals<Field>[];
  }

  export interface Updates {
    toFieldUpdates(): Update<Field>[];
  }

  // TODO: do we really want to have empty defined here? maybe we rely on conversion from builtin updates instead
  export type Definition<Constraints extends State.Constraints, Updates extends State.Updates> = {
    Constraints: Constructor<Constraints> & Empty<Constraints>;
    Updates: Constructor<Updates> & Empty<Updates>;
  }
}
*/
