import { isReady, shutdown, Field, Bool, Circuit } from '../../dist/server';

describe('bool', () => {
  beforeAll(async () => {
    await isReady;
    return;
  });

  afterAll(async () => {
    setTimeout(async () => {
      await shutdown();
    }, 1500);
  });

  describe('inside circuit', () => {
    describe('toField', () => {
      it('should return a Field', async () => {
        expect(true).toEqual(true);
      });
      it('should convert false to Field element 0 ', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xFalse = Circuit.witness(Bool, () => new Bool(false));

            xFalse.toField().assertEquals(new Field(0));
          });
        }).not.toThrow();
      });

      it('should throw when false toString is compared to Field element other than 0 ', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xFalse = Circuit.witness(Bool, () => new Bool(false));
            xFalse.toField().assertEquals(new Field(1));
          });
        }).toThrow();
      });

      it('should convert true to Field element 1', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xTrue = Circuit.witness(Bool, () => new Bool(true));
            xTrue.toField().assertEquals(new Field(1));
          });
        }).not.toThrow();
      });

      it('should throw when true toString is compared to Field element other than 1 ', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xTrue = Circuit.witness(Bool, () => new Bool(true));
            xTrue.toField().assertEquals(new Field(0));
          });
        }).toThrow();
      });
    });
  });
});
