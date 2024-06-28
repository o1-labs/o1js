import { Fq } from '../dist/node/bindings/crypto/finite-field.js';
import { checkRange } from '../dist/node/mina-signer/src/field-bigint.js';

describe('checkRange', () => {
  const lower = 0n;
  const upper = Fq.modulus;
  const checkScalarRange = checkRange(lower, upper, 'Scalar');

  it('throws an error for values smaller than the lower bound', () => {
    const smallValue = lower - 1n;
    expect(() => checkScalarRange(smallValue)).toThrowError(
      `Scalar: inputs smaller than ${lower} are not allowed, got ${smallValue} \
        You may want to use \`convertPrivateKeyToBase58WithMod\` before using this key.
      `
    );
  });

  it('throws an error for values larger than the upper bound', () => {
    const largeValue = upper;
    expect(() => checkScalarRange(largeValue)).toThrowError(
      `Scalar: inputs larger than ${
        upper - 1n
      } are not allowed, got ${largeValue} \
        You may want to use \`convertPrivateKeyToBase58WithMod\` before using this key.`
    );
  });

  it('does not throw an error for values within the range', () => {
    const validValue = upper - 1n;
    expect(() => checkScalarRange(validValue)).not.toThrow();
  });
});
