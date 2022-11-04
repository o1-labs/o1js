import { createProvable } from './provable-generic.js';
import { Field, ProvableExtended } from './field-bigint.js';

export { provable, dataAsHash };

let provable = createProvable<Field>();

function dataAsHash<T, J>({
  emptyValue,
  toJSON,
}: {
  emptyValue: T;
  toJSON: (value: T) => J;
}): ProvableExtended<{ data: T; hash: Field }, J> {
  return {
    sizeInFields() {
      return 1;
    },
    toFields({ hash }) {
      return [hash];
    },
    toAuxiliary(value) {
      return [value?.data ?? emptyValue];
    },
    fromFields([hash], [data]) {
      return { data, hash };
    },
    toJSON({ data }) {
      return toJSON(data);
    },
    check() {},
    toInput({ hash }) {
      return { fields: [hash] };
    },
  };
}
