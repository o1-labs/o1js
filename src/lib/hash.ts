import { HashInput, ProvableExtended, Struct } from './circuit_value.js';
import { Poseidon as Poseidon_, Field } from '../snarky.js';
import { inCheckedComputation } from './proof_system.js';
import { createHashHelpers } from './hash-generic.js';

// external API
export { Poseidon, TokenSymbol };

// internal API
export {
  HashInput,
  Hash,
  prefixes,
  emptyHashWithPrefix,
  hashWithPrefix,
  salt,
  packToFields,
  emptyReceiptChainHash,
};

class Sponge {
  private sponge: unknown;

  constructor() {
    let isChecked = inCheckedComputation();
    this.sponge = Poseidon_.spongeCreate(isChecked);
  }

  absorb(x: Field) {
    Poseidon_.spongeAbsorb(this.sponge, x);
  }

  squeeze() {
    return Poseidon_.spongeSqueeze(this.sponge);
  }
}

const Poseidon = {
  hash(input: Field[]) {
    let isChecked = !input.every((x) => x.isConstant());
    // this is the same:
    // return Poseidon_.update(this.initialState, input, isChecked)[0];
    return Poseidon_.hash(input, isChecked);
  },

  update(state: [Field, Field, Field], input: Field[]) {
    let isChecked = !(
      state.every((x) => x.isConstant()) && input.every((x) => x.isConstant())
    );
    return Poseidon_.update(state, input, isChecked);
  },

  initialState(): [Field, Field, Field] {
    return [Field(0), Field(0), Field(0)];
  },

  Sponge,
};

const Hash = createHashHelpers(Field, Poseidon);
let { salt, emptyHashWithPrefix, hashWithPrefix } = Hash;

const prefixes: typeof Poseidon_.prefixes = new Proxy({} as any, {
  // hack bc Poseidon_.prefixes is not available at start-up
  get(_target, prop) {
    return Poseidon_.prefixes[
      prop as keyof typeof Poseidon_.prefixes
    ] as string;
  },
});

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
