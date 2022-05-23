import { shutdown, isReady, Field } from '../../dist/server';

describe('Field constructor', () => {
  beforeAll(() => isReady);
  afterAll(() => setTimeout(shutdown, 0));

  // Field(number)

  it('handles small numbers', () => {
    expect(Field(5).toString()).toEqual('5');
    expect(Field(1313).toString()).toEqual('1313');
  });

  it('handles large numbers 2^31 <= x < 2^53', () => {
    expect(Field(2 ** 31).toString()).toEqual('2147483648');
    expect(Field(Number.MAX_SAFE_INTEGER).toString()).toEqual(
      String(Number.MAX_SAFE_INTEGER)
    );
  });

  it('handles negative numbers', () => {
    expect(Field(-1)).toEqual(Field.one.neg());
    expect(Field(-(2 ** 31))).toEqual(Field(2 ** 31).neg());
  });

  it('throws on fractional numbers', () => {
    expect(() => Field(0.5)).toThrow();
    expect(() => Field(-1.1)).toThrow();
  });

  // TODO Field(string), Field(boolean), Field(otherField)
});
