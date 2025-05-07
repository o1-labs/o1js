// NOTE: these leaves are currently backwards compatible with the old encoding format, but the
// auxiliary components may change format in the future

import { FieldsDecoder, ProvableSerializable } from './util.js';
import { versionBytes } from '../../crypto/constants.js';
import { withVersionNumber } from '../../lib/binable.js';
import { Bool } from '../../../lib/provable/bool.js';
import { Field } from '../../../lib/provable/field.js';
import { Provable } from '../../../lib/provable/provable.js';
import { HashInput } from '../../../lib/provable/types/provable-derivers.js'
import { Struct } from '../../../lib/provable/types/struct.js';
import { toBase58Check } from '../../../lib/util/base58.js';

export { Bool } from '../../../lib/provable/bool.js';
export { Field } from '../../../lib/provable/field.js';
export { Int64, UInt32, UInt64, Sign } from '../../../lib/provable/int.js';
export { PublicKey } from '../../../lib/provable/crypto/signature.js';

// for now, we erase the value conversion in the proxy, as it is currently not utilized
function proxyProvableSerializable<T, Val>(T: ProvableSerializable<T, Val>): ProvableSerializable<T, T> {
  return {
    sizeInFields(): number {
      return T.sizeInFields();
    },

    toJSON(x: T): any {
      return T.toJSON(x);
    },

    toInput(x: T): HashInput {
      return T.toInput(x);
    },

    toFields(x: T): Field[] {
      return T.toFields(x);
    },

    toAuxiliary(x?: T): any[] {
      return T.toAuxiliary(x);
    },

    fromFields(fields: Field[], aux: any[]): T {
      return T.fromFields(fields, aux);
    },

    toValue(x: T): T {
      return x;
    },

    fromValue(x: T): T {
      return x;
    },

    check(x: T) {
      T.check(x);
    }
  }
}

export interface Option<T> {
  isSome: Bool;
  value: T;
}

export function Option<T>(T: ProvableSerializable<T>) {
  return {
    sizeInFields(): number {
      return Bool.sizeInFields() + T.sizeInFields();
    },

    toJSON(x: Option<T>): any {
      return x.isSome.toBoolean() ? T.toJSON(x.value) : null;
    },

    toInput(x: Option<T>): HashInput {
      const flagInput = Bool.toInput(x.isSome);
      const valueInput = T.toInput(x.value);
      return {
        fields: valueInput.fields,
        packed: flagInput.packed!.concat(valueInput.packed ?? [])
      }
    },

    toFields(x: Option<T>): Field[] {
      return [
        ...Bool.toFields(x.isSome),
        ...T.toFields(x.value)
      ];
    },

    toAuxiliary(x?: Option<T>): any[] {
      return T.toAuxiliary(x?.value);
    },

    fromFields(fields: Field[], aux: any[]): Option<T> {
      const decoder = new FieldsDecoder(fields);
      const isSome = decoder.decode(Bool.sizeInFields(), Bool.fromFields);
      const value = decoder.decode(T.sizeInFields(), (f) => T.fromFields(f, aux));
      return { isSome, value };
    },

    toValue(x: Option<T>): Option<T> {
      return x;
    },

    fromValue(x: Option<T>): Option<T> {
      return x;
    },

    check(_x: Option<T>) {
      throw new Error('TODO')
    }
  }
};

Option.map = <A, B>(option: Option<A>, f: (value: A) => B): Option<B> => ({
  isSome: option.isSome,
  value: f(option.value)
});

Option.none = <T>(defaultValue: T): Option<T> => ({
  isSome: new Bool(false),
  value: defaultValue
});

Option.some = <T>(value: T): Option<T> => ({
  isSome: new Bool(true),
  value
});

export interface Range<T> {
  lower: T;
  upper: T;
}

export function Range<T>(T: Provable<T>) {
  return Struct({
    lower: T,
    upper: T
  });
}

export interface CommittedList {
  data: Field[][];
  hash: Field;
}

export const CommittedList: ProvableSerializable<CommittedList> = {
  sizeInFields(): number {
    return 1;
  },

  toJSON(x: CommittedList): any {
    return x.data.map((datum) => datum.map(Field.toJSON));
  },

  toInput(x: CommittedList): HashInput {
    return { fields: [x.hash] };
  },

  toFields(x: CommittedList): Field[] {
    return [x.hash];
  },

  toAuxiliary(x?: CommittedList): any[] {
    if(x === undefined) throw new Error('cannot convert undefined CommittedList into auxiliary data');
    return [x.data];
  },

  fromFields(fields: Field[], aux: any[]): CommittedList {
    // TODO: runtime type-check the aux data
    return {data: aux[0], hash: fields[0]};
  },

  toValue(x: CommittedList): CommittedList {
    return x;
  },

  fromValue(x: CommittedList): CommittedList {
    return x;
  },

  check(_x: CommittedList) {
    throw new Error('TODO');
  }
};

export type Events = CommittedList;

export const Events = CommittedList;

export type Actions = CommittedList;

export const Actions = CommittedList;

export type AuthRequiredIdentifier =
  | 'Impossible'
  | 'None'
  | 'Proof'
  | 'Signature'
  | 'Either'
  // TODO: Both

export interface AuthRequired {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
}

export const AuthRequired = {
  ...proxyProvableSerializable<AuthRequired, any>(Struct({constant: Bool, signatureNecessary: Bool, signatureSufficient: Bool})),

  empty(): AuthRequired {
    return {
      constant: new Bool(true),
      signatureNecessary: new Bool(false),
      signatureSufficient: new Bool(true)
    }
  },

  isImpossible(x: AuthRequired): Bool {
    return Bool.allTrue([
      x.constant,
      x.signatureNecessary,
      x.signatureSufficient.not()
    ]);
  },

  isNone(x: AuthRequired): Bool {
    return Bool.allTrue([
      x.constant,
      x.signatureNecessary.not(),
      x.signatureSufficient
    ]);
  },

  isProof(x: AuthRequired): Bool {
    return Bool.allTrue([
      x.constant.not(),
      x.signatureNecessary.not(),
      x.signatureSufficient.not()
    ]);
  },

  isSignature(x: AuthRequired): Bool {
    return Bool.allTrue([
      x.constant.not(),
      x.signatureNecessary,
      x.signatureSufficient
    ]);
  },

  isEither(x: AuthRequired): Bool {
    return Bool.allTrue([
      x.constant.not(),
      x.signatureNecessary.not(),
      x.signatureSufficient
    ]);
  },

  identifier(x: AuthRequired): AuthRequiredIdentifier {
    if(AuthRequired.isImpossible(x).toBoolean()) {
      return 'Impossible';
    } else if(AuthRequired.isNone(x).toBoolean()) {
      return 'None';
    } else if(AuthRequired.isProof(x).toBoolean()) {
      return 'Proof';
    } else if(AuthRequired.isSignature(x).toBoolean()) {
      return 'Signature';
    } else if(AuthRequired.isEither(x).toBoolean()) {
      return 'Either';
    } else {
      throw new Error('invariant broken: invalid authorization level encoding');
    }
  },

  toJSON(x: AuthRequired): any {
    return AuthRequired.identifier(x);
  }
};

AuthRequired satisfies ProvableSerializable<AuthRequired>;

export type StateHash = Field;

export const StateHash: ProvableSerializable<StateHash> = {
  ...proxyProvableSerializable<Field, any>(Field),

  toJSON(x: StateHash): any {
    const bytes = withVersionNumber(Field, 1).toBytes(x);
    return toBase58Check(bytes, versionBytes.stateHash);
  }
};

export type TokenId = Field;

export const TokenId = Field;

export interface TokenSymbol {
  field: Field,
  symbol: string
}

export const TokenSymbol: ProvableSerializable<TokenSymbol> = {
  ...proxyProvableSerializable<TokenSymbol, any>(Struct({field: Field, symbol: String})),

  toJSON(x: TokenSymbol): any {
    return x.symbol;
  },

  toInput(x: TokenSymbol): HashInput {
    return { packed: [[x.field, 48]] };
  }
};

export interface ZkappUri {
  data: string,
  hash: Field
}

export const ZkappUri: ProvableSerializable<ZkappUri> = {
  ...proxyProvableSerializable<ZkappUri, any>(Struct({data: String, hash: Field})),

  toJSON(x: ZkappUri): any {
    return x.data;
  },

  toAuxiliary(x?: ZkappUri): any[] {
    return [x?.data];
  },

  fromFields(fields: Field[], aux: any[]) {
    return {
      data: aux[0],
      hash: fields[0],
    };
  }
};
