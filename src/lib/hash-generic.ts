import { GenericField, GenericHashInput } from '../provable/generic.js';
import { prefixToField } from '../provable/binable.js';

export { createHashHelpers, HashHelpers };

type Hash<Field> = {
  initialState(): Field[];
  update(state: Field[], input: Field[]): Field[];
};

type HashHelpers<Field> = ReturnType<typeof createHashHelpers<Field>>

function createHashHelpers<Field>(
  Field: GenericField<Field>,
  Hash: Hash<Field>
) {
  function toBigInt(x: Field): bigint {
    if (typeof x === 'bigint') return x;
    if ((x as any).toBigInt) return (x as any).toBigInt();
    throw Error(`toBigInt: not implemented for ${x}`);
  }

  function salt(prefix: string) {
    return Hash.update(Hash.initialState(), [prefixToField(Field, prefix)]);
  }
  function emptyHashWithPrefix(prefix: string) {
    return salt(prefix)[0];
  }
  function hashWithPrefix(prefix: string, input: Field[]) {
    let init = salt(prefix);
    return Hash.update(init, input)[0];
  }

  type HashInput = GenericHashInput<Field>;

  /**
   * Convert the {fields, packed} hash input representation to a list of field elements
   * Random_oracle_input.Chunked.pack_to_fields
   */
  function packToFields({ fields = [], packed = [] }: HashInput) {
    if (packed.length === 0) return fields;
    let packedBits = [];
    let currentPackedField = 0n;
    let currentSize = 0;
    for (let [field_, size] of packed) {
      let field = toBigInt(field_);
      currentSize += size;
      if (currentSize < 255) {
        currentPackedField = currentPackedField * (1n << BigInt(size)) + field;
      } else {
        packedBits.push(currentPackedField);
        currentSize = size;
        currentPackedField = field;
      }
    }
    packedBits.push(currentPackedField);
    return fields.concat(packedBits.map(Field));
  }

  return {
    salt,
    emptyHashWithPrefix,
    hashWithPrefix,
    /**
     * Convert the {fields, packed} hash input representation to a list of field elements
     * Random_oracle_input.Chunked.pack_to_fields
     */
    packToFields,
  };
}
