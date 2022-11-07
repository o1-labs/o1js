import { createProvable } from './provable-generic.js';
import { Field, ProvableExtended } from './field-bigint.js';

export { provable, dataAsHash };

let provable = createProvable<Field>();

function dataAsHash<T, J>({
  emptyValue,
  toJSON,
  fromJSON,
}: {
  emptyValue: T;
  toJSON: (value: T) => J;
  fromJSON: (json: J) => { data: T; hash: Field };
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
    fromJSON(json) {
      return fromJSON(json);
    },
    check() {},
    toInput({ hash }) {
      return { fields: [hash] };
    },
  };
}
