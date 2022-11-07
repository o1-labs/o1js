import { Bool, Field } from './field-bigint.js';
import { provable } from './provable-bigint.js';

export { PublicKey };

type PublicKey = { x: Field; isOdd: Bool };

const PublicKey = {
  ...provable({ x: Field, isOdd: Bool }),

  toJSON(x: PublicKey) {
    throw Error('unimplemented');
  },
  fromJSON(json: string): PublicKey {
    throw Error('unimplemented');
  },
};
