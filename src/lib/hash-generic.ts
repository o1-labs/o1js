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
  Hash: Hash<Field>,
  packToFields: (input: GenericHashInput<Field>) => Field[]
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
