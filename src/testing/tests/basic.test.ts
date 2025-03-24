import { Testing } from '../src/testing.js';

// placeholder test
describe('@o1js/testing', () => {
  it('should export Testing namespace', () => {
    expect(Testing).toBeDefined();
    expect(Testing.Property).toBeDefined();
    expect(Testing.Equivalent).toBeDefined();
    expect(Testing.ConstraintSystem).toBeDefined();
  });
});
