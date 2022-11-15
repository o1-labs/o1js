import { Bool, Field } from './field.js';
import { provable } from './provable.js';

export { PublicKey };

type PublicKey = { x: Field; isOdd: Bool };

const PublicKey = {
  ...provable({ x: Field, isOdd: Bool }),

  toJSON(x: PublicKey) {
    throw 'unimplemented';
  },
};
