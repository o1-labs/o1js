import { GenericSignableField } from '../../../bindings/lib/generic.js';
import { prefixToField } from '../../../bindings/lib/binable.js';

export { createHashHelpers, HashHelpers };

type Hash<Field> = {
  initialState(): Field[];
  update(state: Field[], input: Field[]): Field[];
};

type HashHelpers<Field> = ReturnType<typeof createHashHelpers<Field>>;

function createHashHelpers<Field>(
  Field: GenericSignableField<Field>,
  Hash: Hash<Field>
) {
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
  return { salt, emptyHashWithPrefix, hashWithPrefix };
}
