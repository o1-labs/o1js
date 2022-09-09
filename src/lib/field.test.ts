import { shutdown, isReady, Field } from 'snarkyjs';

describe('Field constructor', () => {
  beforeAll(() => isReady);
  afterAll(() => setTimeout(shutdown, 0));

  // Field(number), Field.fromNumber

  it('handles small numbers', () => {
    expect(Field(5).toString()).toEqual('5');
    expect(Field(1313).toString()).toEqual('1313');
    expect(Field.fromNumber(5).toString()).toEqual('5');
  });

  it('handles large numbers 2^31 <= x < 2^53', () => {
    expect(Field(2 ** 31).toString()).toEqual('2147483648');
    expect(Field(Number.MAX_SAFE_INTEGER).toString()).toEqual(
      String(Number.MAX_SAFE_INTEGER)
    );
    expect(Field.fromNumber(2 ** 31).toString()).toEqual('2147483648');
  });

  it('handles negative numbers', () => {
    expect(Field(-1)).toEqual(Field.one.neg());
    expect(Field(-(2 ** 31))).toEqual(Field(2 ** 31).neg());
    expect(Field.fromNumber(-1)).toEqual(Field.one.neg());
  });

  it('throws on fractional numbers', () => {
    expect(() => Field(0.5)).toThrow();
    expect(() => Field(-1.1)).toThrow();
    expect(() => Field.fromNumber(0.5)).toThrow();
  });

  // Field(bigint), Field.fromBigInt, toBigInt

  it('handles bigints', () => {
    expect(Field(-1n)).toEqual(Field.one.neg());
    expect(Field.fromBigInt(-1n)).toEqual(Field.fromNumber(-1));
    expect(Field(Field.ORDER - 1n)).toEqual(Field.one.neg());
    expect(Field(1n << 64n).toString()).toEqual('18446744073709551616');
    expect(Field.fromBigInt(1n << 64n)).toEqual(Field('18446744073709551616'));
  });

  // TODO Field(string), Field(boolean), Field(otherField)
});

describe('Field serialization and static props', () => {
  it('toBigInt works on static props', () => {
    expect(Field.one.toBigInt()).toEqual(1n);
    expect(Field.zero.toBigInt()).toEqual(0n);
    expect(Field.minusOne.toBigInt()).toEqual(Field.ORDER - 1n);
    expect(Field(0xff).toBigInt()).toEqual(0xffn);
  });
});
