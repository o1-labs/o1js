import { Bool, Circuit, isReady, shutdown, Int64 } from '../../dist/server';

describe('circuit', () => {
  beforeAll(() => isReady);
  afterAll(() => setTimeout(shutdown, 0));

  it('Circuit.pickOne picks the right value', () => {
    const x = Circuit.pickOne([Bool(false), Bool(true), Bool(false)], Int64, [
      Int64.from(-1),
      Int64.from(-2),
      Int64.from(-3),
    ]);
    expect(x.toString()).toBe('-2');
  });
});
