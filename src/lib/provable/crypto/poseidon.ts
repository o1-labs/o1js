import { HashInput, ProvableExtended, Struct } from '../types/struct.js';
import { Snarky } from '../../../snarky.js';
import { Field } from '../wrapped.js';
import { createHashHelpers } from './hash-generic.js';
import { Provable } from '../provable.js';
import { MlFieldArray } from '../../ml/fields.js';
import { Poseidon as PoseidonBigint } from '../../../bindings/crypto/poseidon.js';
import { assert } from '../../util/errors.js';
import { rangeCheckN } from '../gadgets/range-check.js';
import { TupleN } from '../../util/types.js';
import { Group } from '../group.js';
import { ProvableType, WithProvable } from '../types/provable-intf.js';

// external API
export { Poseidon, TokenSymbol };

// internal API
export {
  ProvableHashable,
  HashInput,
  HashHelpers,
  emptyHashWithPrefix,
  hashWithPrefix,
  salt,
  packToFields,
  emptyReceiptChainHash,
  hashConstant,
  isHashable,
};

type Hashable<T> = { toInput: (x: T) => HashInput; empty: () => T };
type ProvableHashable<T, V = any> = Provable<T, V> & Hashable<T>;

class Sponge {
  #sponge: unknown;

  // TODO: implement constant version in TS. currently, you need to call `initializeBindings()` before successfully calling this
  constructor() {
    let isChecked = Provable.inCheckedComputation();
    assert(
      Snarky !== undefined,
      'Poseidon.Sponge(): bindings are not initialized, try calling `await initializeBindings()` first.'
    );
    this.#sponge = Snarky.poseidon.sponge.create(isChecked);
  }

  absorb(x: Field) {
    Snarky.poseidon.sponge.absorb(this.#sponge, x.value);
  }

  squeeze(): Field {
    return Field(Snarky.poseidon.sponge.squeeze(this.#sponge));
  }
}

const Poseidon = {
  hash(input: Field[]) {
    if (isConstant(input)) {
      return Field(PoseidonBigint.hash(toBigints(input)));
    }
    return Poseidon.update(Poseidon.initialState(), input)[0];
  },

  update(state: [Field, Field, Field], input: Field[]) {
    if (isConstant(state) && isConstant(input)) {
      let newState = PoseidonBigint.update(toBigints(state), toBigints(input));
      return TupleN.fromArray(3, newState.map(Field));
    }

    let newState = Snarky.poseidon.update(MlFieldArray.to(state), MlFieldArray.to(input));
    return MlFieldArray.from(newState) as [Field, Field, Field];
  },

  hashWithPrefix(prefix: string, input: Field[]) {
    let init = Poseidon.update(Poseidon.initialState(), [prefixToField(prefix)]);
    return Poseidon.update(init, input)[0];
  },

  initialState(): [Field, Field, Field] {
    return [Field(0), Field(0), Field(0)];
  },

  Unsafe: {
    /**
     * Low-level version of `Poseidon.hashToGroup()`.
     *
     * **Warning**: This function is marked unsafe because its output is not deterministic.
     * It returns the square root of a value without constraining which of the two possible
     * square roots is chosen. This allows the prover to choose between two different hashes,
     * which can be a vulnerability if consuming code treats the output as unique.
     */
    hashToGroup(input: Field[]) {
      if (isConstant(input)) {
        let result = PoseidonBigint.hashToGroup(toBigints(input));
        assert(result !== undefined, 'hashToGroup works on all inputs');
        return new Group(result);
      }

      // y = sqrt(y^2)
      let [, x, y] = Snarky.poseidon.hashToGroup(MlFieldArray.to(input));
      return new Group({ x, y });
    },
  },

  /**
   * Hashes a list of field elements to a point on the Pallas curve.
   *
   * The output point is deterministic and its discrete log is not efficiently computable.
   */
  hashToGroup(input: Field[]): Group {
    if (isConstant(input)) return Poseidon.Unsafe.hashToGroup(input);

    let { x, y } = Poseidon.Unsafe.hashToGroup(input);

    // the y coordinate is calculated using a square root, so it has two possible values
    // to make the output deterministic, we negate y if it is odd
    let sign = Field.from(1n).sub(y.isOdd().toField().mul(2n)); // -1 is y is odd, 1 else
    y = y.mul(sign);

    return new Group({ x, y });
  },

  /**
   * Hashes a provable type efficiently.
   *
   * ```ts
   * let skHash = Poseidon.hashPacked(PrivateKey, secretKey);
   * ```
   *
   * Note: Instead of just doing `Poseidon.hash(value.toFields())`, this
   * uses the `toInput()` method on the provable type to pack the input into as few
   * field elements as possible. This saves constraints because packing has a much
   * lower per-field element cost than hashing.
   */
  hashPacked<T>(type: WithProvable<Hashable<T>>, value: T) {
    let input = ProvableType.get(type).toInput(value);
    let packed = packToFields(input);
    return Poseidon.hash(packed);
  },

  Sponge,
};

function hashConstant(input: Field[]) {
  return Field(PoseidonBigint.hash(toBigints(input)));
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
        if (j === 7)
          assert(c === 0, `Invalid character ${char}, only ASCII characters are supported.`);
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
      currentPackedField = currentPackedField.mul(Field(1n << BigInt(size))).add(field);
    } else {
      packedBits.push(currentPackedField);
      currentSize = size;
      currentPackedField = field;
    }
  }
  packedBits.push(currentPackedField);
  return fields.concat(packedBits);
}

function isHashable<T>(obj: any): obj is Hashable<T> {
  if (!obj) {
    return false;
  }
  const hasToInput = 'toInput' in obj && typeof obj.toInput === 'function';
  const hasEmpty = 'empty' in obj && typeof obj.empty === 'function';
  return hasToInput && hasEmpty;
}

const TokenSymbolPure: ProvableExtended<{ symbol: string; field: Field }, string, string> = {
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
    rangeCheckN(48, field);
  },
  toValue({ symbol }) {
    return symbol;
  },
  fromValue(symbol: string | TokenSymbol) {
    if (typeof symbol !== 'string') return symbol;
    let bytesLength = new TextEncoder().encode(symbol).length;
    if (bytesLength > 6)
      throw Error(`Token symbol ${symbol} should be a maximum of 6 bytes, but is ${bytesLength}`);
    let field = prefixToField(symbol);
    return { symbol, field };
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
  empty() {
    return { symbol: '', field: Field(0n) };
  },
};
class TokenSymbol extends Struct(TokenSymbolPure) {
  static from(value: string | TokenSymbol) {
    return TokenSymbol.fromValue(value) as TokenSymbol;
  }
}

function emptyReceiptChainHash() {
  return emptyHashWithPrefix('CodaReceiptEmpty');
}

function isConstant(fields: Field[]) {
  return fields.every((x) => x.isConstant());
}
function toBigints(fields: Field[]) {
  return fields.map((x) => x.toBigInt());
}
