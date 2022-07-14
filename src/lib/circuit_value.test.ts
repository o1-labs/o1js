import { Bool, Circuit, isReady, shutdown, Int64 } from '../../dist/server';

describe('circuit', () => {
  beforeAll(() => isReady);
  afterAll(() => setTimeout(shutdown, 0));

  it('Circuit.switch picks the right value', () => {
    const x = Circuit.switch([Bool(false), Bool(true), Bool(false)], Int64, [
      Int64.from(-1),
      Int64.from(-2),
      Int64.from(-3),
    ]);
    expect(x.toString()).toBe('-2');
  });

  it('Circuit.switch throws when mask has >1 nonzero elements', () => {
    expect(() =>
      Circuit.switch([Bool(true), Bool(true), Bool(false)], Int64, [
        Int64.from(-1),
        Int64.from(-2),
        Int64.from(-3),
      ])
    ).toThrow(/`mask` must have 0 or 1 true element, found 2/);
  });
});
