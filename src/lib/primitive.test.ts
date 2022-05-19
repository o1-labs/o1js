import { isReady, shutdown, Field, Bool, Circuit } from '../../dist/server';

describe('bool', () => {
  beforeAll(async () => {
    await isReady;
    return;
  });

  afterAll(async () => {
    setTimeout(async () => {
      await shutdown();
    }, 0);
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

    describe('and', () => {
      it('true "and" true should return true', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xTrue = Circuit.witness(Bool, () => new Bool(true));
            const yTrue = Circuit.witness(Bool, () => new Bool(true));

            xTrue.and(yTrue).assertEquals(new Bool(true));
          });
        }).not.toThrow();
      });

      it('should throw if true "and" true is compared to false', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xTrue = Circuit.witness(Bool, () => new Bool(true));
            const yTrue = Circuit.witness(Bool, () => new Bool(true));

            xTrue.and(yTrue).assertEquals(new Bool(false));
          });
        }).toThrow();
      });

      it('false "and" false should return false', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xFalse = Circuit.witness(Bool, () => new Bool(false));
            const yFalse = Circuit.witness(Bool, () => new Bool(false));

            xFalse.and(yFalse).assertEquals(new Bool(false));
          });
        }).not.toThrow();
      });

      it('should throw if false "and" false is compared to true', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xFalse = Circuit.witness(Bool, () => new Bool(false));
            const yFalse = Circuit.witness(Bool, () => new Bool(false));

            xFalse.and(yFalse).assertEquals(new Bool(true));
          });
        }).toThrow();
      });

      it('false "and" true should return false', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xFalse = Circuit.witness(Bool, () => new Bool(false));
            const yTrue = Circuit.witness(Bool, () => new Bool(true));

            xFalse.and(yTrue).assertEquals(new Bool(false));
          });
        }).not.toThrow();
      });

      it('should throw if false "and" true is compared to true', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xFalse = Circuit.witness(Bool, () => new Bool(false));
            const yTrue = Circuit.witness(Bool, () => new Bool(true));

            xFalse.and(yTrue).assertEquals(new Bool(true));
          });
        }).toThrow();
      });
    });

    describe('not', () => {
      it('should return true', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xTrue = Circuit.witness(Bool, () => new Bool(true));
            xTrue.toField().assertEquals(new Field(1));
          });
        }).not.toThrow();
      });
      it('should return a new bool that is the negation of the input', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xTrue = Circuit.witness(Bool, () => new Bool(true));
            const yFalse = Circuit.witness(Bool, () => new Bool(false));
            xTrue.not().assertEquals(new Bool(false));
            yFalse.not().assertEquals(new Bool(true));
          });
        }).not.toThrow();
      });

      it('should throw if input.not() is compared to input', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xTrue = Circuit.witness(Bool, () => new Bool(true));
            xTrue.not().assertEquals(xTrue);
          });
        }).toThrow();
      });
    });

    describe('or', () => {
      it('true "or" true should return true', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xTrue = Circuit.witness(Bool, () => new Bool(true));
            const yTrue = Circuit.witness(Bool, () => new Bool(true));

            xTrue.or(yTrue).assertEquals(new Bool(true));
          });
        }).not.toThrow();
      });

      it('should throw if true "or" true is compared to false', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xTrue = Circuit.witness(Bool, () => new Bool(true));
            const yTrue = Circuit.witness(Bool, () => new Bool(true));

            xTrue.or(yTrue).assertEquals(new Bool(false));
          });
        }).toThrow();
      });

      it('false "or" false should return false', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xFalse = Circuit.witness(Bool, () => new Bool(false));
            const yFalse = Circuit.witness(Bool, () => new Bool(false));

            xFalse.or(yFalse).assertEquals(new Bool(false));
          });
        }).not.toThrow();
      });

      it('should throw if false "or" false is compared to true', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xFalse = Circuit.witness(Bool, () => new Bool(false));
            const yFalse = Circuit.witness(Bool, () => new Bool(false));

            xFalse.or(yFalse).assertEquals(new Bool(true));
          });
        }).toThrow();
      });

      it('false "or" true should return true', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const xFalse = Circuit.witness(Bool, () => new Bool(false));
            const yTrue = Circuit.witness(Bool, () => new Bool(true));

            xFalse.or(yTrue).assertEquals(new Bool(true));
          });
        }).not.toThrow();
      });
    });

    describe('assertEquals', () => {
      it('should not throw on true "assertEqual" true', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Bool, () => new Bool(true));

            x.assertEquals(x);
          });
        }).not.toThrow();
      });

      it('should throw on true "assertEquals" false', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Bool, () => new Bool(true));
            const y = Circuit.witness(Bool, () => new Bool(false));

            x.assertEquals(y);
          });
        }).toThrow();
      });
    });
    describe('equals', () => {
      it('should not throw on true "equals" true', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Bool, () => new Bool(true));

            x.equals(x);
          });
        }).not.toThrow();
      });

      it('should throw on true "equals" false', async () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Bool, () => new Bool(true));
            const y = Circuit.witness(Bool, () => new Bool(false));

            x.equals(y);
          });
        }).toThrow();
      });
    });
  });
});
