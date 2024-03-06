import type { ProvableHashable } from '../hash.js';

export { RandomId };

const RandomId: ProvableHashable<number> = {
  sizeInFields: () => 0,
  toFields: () => [],
  toAuxiliary: (v = Math.random()) => [v],
  fromFields: (_, [v]) => v,
  check: () => {},
  toInput: () => ({}),
  empty: () => Math.random(),
};
