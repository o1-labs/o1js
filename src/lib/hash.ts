import { HashInput, ProvableExtended, Struct } from './circuit_value.js';
import { Snarky } from '../snarky.js';
import { Field } from './core.js';
import { createHashHelpers } from './hash-generic.js';
import { Provable } from './provable.js';
import { MlFieldArray } from './ml/fields.js';
import { UInt8 } from './int.js';
import { isField } from './field.js';

// external API
export { Poseidon, TokenSymbol, Hash };

// internal API
export {
  HashInput,
  HashHelpers,
  emptyHashWithPrefix,
  hashWithPrefix,
  salt,
  packToFields,
  emptyReceiptChainHash,
  hashConstant,
};

class Sponge {
  private sponge: unknown;

  constructor() {
    let isChecked = Provable.inCheckedComputation();
    this.sponge = Snarky.poseidon.sponge.create(isChecked);
  }

  absorb(x: Field) {
    Snarky.poseidon.sponge.absorb(this.sponge, x.value);
  }

  squeeze(): Field {
    return Field(Snarky.poseidon.sponge.squeeze(this.sponge));
  }
}

const Poseidon = {
  hash(input: Field[]) {
    let isChecked = !input.every((x) => x.isConstant());
    // this is the same:
    // return Snarky.poseidon.update(this.initialState, input, isChecked)[0];
    let digest = Snarky.poseidon.hash(MlFieldArray.to(input), isChecked);
    return Field(digest);
  },

  hashToGroup(input: Field[]) {
    let isChecked = !input.every((x) => x.isConstant());
    // y = sqrt(y^2)
    let [, xv, yv] = Snarky.poseidon.hashToGroup(
      MlFieldArray.to(input),
      isChecked
    );

    let x = Field(xv);
    let y = Field(yv);

    let x0 = Provable.witness(Field, () => {
      // the even root of y^2 will become x0, so the APIs are uniform
      let isEven = y.toBigInt() % 2n === 0n;

      // we just change the order so the even root is x0
      // y.mul(-1); is the second root of sqrt(y^2)
      return isEven ? y : y.mul(-1);
    });

    let x1 = x0.mul(-1);

    // we check that either x0 or x1 match the original root y
    y.equals(x0).or(y.equals(x1)).assertTrue();

    return { x, y: { x0, x1 } };
  },

  update(state: [Field, Field, Field], input: Field[]) {
    let isChecked = !(
      state.every((x) => x.isConstant()) && input.every((x) => x.isConstant())
    );
    let newState = Snarky.poseidon.update(
      MlFieldArray.to(state),
      MlFieldArray.to(input),
      isChecked
    );
    return MlFieldArray.from(newState) as [Field, Field, Field];
  },

  initialState(): [Field, Field, Field] {
    return [Field(0), Field(0), Field(0)];
  },

  Sponge,
};

function hashConstant(input: Field[]) {
  let digest = Snarky.poseidon.hash(MlFieldArray.to(input), false);
  return Field(digest);
}

const HashHelpers = createHashHelpers(Field, Poseidon);
let { salt, emptyHashWithPrefix, hashWithPrefix } = HashHelpers;

// same as Random_oracle.prefix_to_field in OCaml
function prefixToField(prefix: string) {
  if (prefix.length * 8 >= 255) throw Error('prefix too long');
  let bits = [...prefix]
    .map((char) => {
      // convert char to 8 bits
      let bits = [];
      for (let j = 0, c = char.charCodeAt(0); j < 8; j++, c >>= 1) {
        bits.push(!!(c & 1));
      }
      return bits;
    })
    .flat();
  return Field.fromBits(bits);
}

/**
 * Convert the {fields, packed} hash input representation to a list of field elements
 * Random_oracle_input.Chunked.pack_to_fields
 */
function packToFields({ fields = [], packed = [] }: HashInput) {
  if (packed.length === 0) return fields;
  let packedBits = [];
  let currentPackedField = Field(0);
  let currentSize = 0;
  for (let [field, size] of packed) {
    currentSize += size;
    if (currentSize < 255) {
      currentPackedField = currentPackedField
        .mul(Field(1n << BigInt(size)))
        .add(field);
    } else {
      packedBits.push(currentPackedField);
      currentSize = size;
      currentPackedField = field;
    }
  }
  packedBits.push(currentPackedField);
  return fields.concat(packedBits);
}

const TokenSymbolPure: ProvableExtended<
  { symbol: string; field: Field },
  string
> = {
  toFields({ field }) {
    return [field];
  },
  toAuxiliary(value) {
    return [value?.symbol ?? ''];
  },
  fromFields([field], [symbol]) {
    return { symbol, field };
  },
  sizeInFields() {
    return 1;
  },
  check({ field }: TokenSymbol) {
    let actual = field.rangeCheckHelper(48);
    actual.assertEquals(field);
  },
  toJSON({ symbol }) {
    return symbol;
  },
  fromJSON(symbol: string) {
    let field = prefixToField(symbol);
    return { symbol, field };
  },
  toInput({ field }) {
    return { packed: [[field, 48]] };
  },
};
class TokenSymbol extends Struct(TokenSymbolPure) {
  static get empty() {
    return { symbol: '', field: Field(0) };
  }

  static from(symbol: string): TokenSymbol {
    let bytesLength = new TextEncoder().encode(symbol).length;
    if (bytesLength > 6)
      throw Error(
        `Token symbol ${symbol} should be a maximum of 6 bytes, but is ${bytesLength}`
      );
    let field = prefixToField(symbol);
    return { symbol, field };
  }
}

function emptyReceiptChainHash() {
  return emptyHashWithPrefix('CodaReceiptEmpty');
}

function buildSHA(length: 224 | 256 | 384 | 512, nist: boolean) {
  return {
    hash(message: UInt8[]) {
      return Snarky.sha
        .create([0, ...message.map((f) => f.value.value)], nist, length)
        .map(Field);
    },
  };
}

const Hash = {
  default: Poseidon.hash,

  Poseidon: Poseidon,

  SHA224: buildSHA(224, true),

  SHA256: buildSHA(256, true),

  SHA384: buildSHA(384, true),

  SHA512: buildSHA(512, true),

  Keccack256: buildSHA(256, false),
};
