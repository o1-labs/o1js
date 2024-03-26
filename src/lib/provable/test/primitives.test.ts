import { Field, Bool, Provable } from 'o1js';
describe('bool', () => {
  describe('inside circuit', () => {
    describe('toField', () => {
      it('should convert false to Field element 0', async () => {
        await Provable.runAndCheck(() => {
          const xFalse = Provable.witness(Bool, () => new Bool(false));

          xFalse.toField().assertEquals(new Field(0));
        });
      });
      it('should throw when false toString is compared to Field element other than 0 ', async () => {
        await expect(
          Provable.runAndCheck(() => {
            const xFalse = Provable.witness(Bool, () => new Bool(false));
            xFalse.toField().assertEquals(new Field(1));
          })
        ).rejects.toThrow();
      });

      it('should convert true to Field element 1', async () => {
        await Provable.runAndCheck(() => {
          const xTrue = Provable.witness(Bool, () => new Bool(true));
          xTrue.toField().assertEquals(new Field(1));
        });
      });

      it('should throw when true toField is compared to Field element other than 1 ', async () => {
        await expect(
          Provable.runAndCheck(() => {
            const xTrue = Provable.witness(Bool, () => new Bool(true));
            xTrue.toField().assertEquals(new Field(0));
          })
        ).rejects.toThrow();
      });
    });

    describe('toFields', () => {
      it('should return an array of Fields', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Bool, () => new Bool(false));
          const fieldArr = x.toFields();
          const isArr = Array.isArray(fieldArr);
          expect(isArr).toBe(true);
          fieldArr[0].assertEquals(new Field(0));
        });
      });
    });
    describe('and', () => {
      it('true "and" true should return true', async () => {
        await Provable.runAndCheck(() => {
          const xTrue = Provable.witness(Bool, () => new Bool(true));
          const yTrue = Provable.witness(Bool, () => new Bool(true));

          xTrue.and(yTrue).assertEquals(new Bool(true));
        });
      });

      it('should throw if true "and" true is compared to false', async () => {
        await expect(
          Provable.runAndCheck(() => {
            const xTrue = Provable.witness(Bool, () => new Bool(true));
            const yTrue = Provable.witness(Bool, () => new Bool(true));

            xTrue.and(yTrue).assertEquals(new Bool(false));
          })
        ).rejects.toThrow();
      });

      it('false "and" false should return false', async () => {
        await Provable.runAndCheck(() => {
          const xFalse = Provable.witness(Bool, () => new Bool(false));
          const yFalse = Provable.witness(Bool, () => new Bool(false));

          xFalse.and(yFalse).assertEquals(new Bool(false));
        });
      });

      it('should throw if false "and" false is compared to true', async () => {
        await expect(
          Provable.runAndCheck(() => {
            const xFalse = Provable.witness(Bool, () => new Bool(false));
            const yFalse = Provable.witness(Bool, () => new Bool(false));

            xFalse.and(yFalse).assertEquals(new Bool(true));
          })
        ).rejects.toThrow();
      });

      it('false "and" true should return false', async () => {
        await Provable.runAndCheck(() => {
          const xFalse = Provable.witness(Bool, () => new Bool(false));
          const yTrue = Provable.witness(Bool, () => new Bool(true));

          xFalse.and(yTrue).assertEquals(new Bool(false));
        });
      });

      it('should throw if false "and" true is compared to true', async () => {
        await expect(
          Provable.runAndCheck(() => {
            const xFalse = Provable.witness(Bool, () => new Bool(false));
            const yTrue = Provable.witness(Bool, () => new Bool(true));

            xFalse.and(yTrue).assertEquals(new Bool(true));
          })
        ).rejects.toThrow();
      });
    });

    describe('not', () => {
      it('should return true', async () => {
        await Provable.runAndCheck(() => {
          const xTrue = Provable.witness(Bool, () => new Bool(true));
          xTrue.toField().assertEquals(new Field(1));
        });
      });
      it('should return a new bool that is the negation of the input', async () => {
        await Provable.runAndCheck(() => {
          const xTrue = Provable.witness(Bool, () => new Bool(true));
          const yFalse = Provable.witness(Bool, () => new Bool(false));
          xTrue.not().assertEquals(new Bool(false));
          yFalse.not().assertEquals(new Bool(true));
        });
      });

      it('should throw if input.not() is compared to input', async () => {
        expect(
          Provable.runAndCheck(() => {
            const xTrue = Provable.witness(Bool, () => new Bool(true));
            xTrue.not().assertEquals(xTrue);
          })
        ).rejects.toThrow();
      });
    });

    describe('or', () => {
      it('true "or" true should return true', async () => {
        await Provable.runAndCheck(() => {
          const xTrue = Provable.witness(Bool, () => new Bool(true));
          const yTrue = Provable.witness(Bool, () => new Bool(true));

          xTrue.or(yTrue).assertEquals(new Bool(true));
        });
      });

      it('should throw if true "or" true is compared to false', async () => {
        expect(
          Provable.runAndCheck(() => {
            const xTrue = Provable.witness(Bool, () => new Bool(true));
            const yTrue = Provable.witness(Bool, () => new Bool(true));

            xTrue.or(yTrue).assertEquals(new Bool(false));
          })
        ).rejects.toThrow();
      });

      it('false "or" false should return false', async () => {
        await Provable.runAndCheck(() => {
          const xFalse = Provable.witness(Bool, () => new Bool(false));
          const yFalse = Provable.witness(Bool, () => new Bool(false));

          xFalse.or(yFalse).assertEquals(new Bool(false));
        });
      });

      it('should throw if false "or" false is compared to true', async () => {
        expect(
          Provable.runAndCheck(() => {
            const xFalse = Provable.witness(Bool, () => new Bool(false));
            const yFalse = Provable.witness(Bool, () => new Bool(false));

            xFalse.or(yFalse).assertEquals(new Bool(true));
          })
        ).rejects.toThrow();
      });

      it('false "or" true should return true', async () => {
        await Provable.runAndCheck(() => {
          const xFalse = Provable.witness(Bool, () => new Bool(false));
          const yTrue = Provable.witness(Bool, () => new Bool(true));

          xFalse.or(yTrue).assertEquals(new Bool(true));
        });
      });
    });

    describe('assertEquals', () => {
      it('should not throw on true "assertEqual" true', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Bool, () => new Bool(true));

          x.assertEquals(x);
        });
      });

      it('should throw on true "assertEquals" false', async () => {
        expect(
          Provable.runAndCheck(() => {
            const x = Provable.witness(Bool, () => new Bool(true));
            const y = Provable.witness(Bool, () => new Bool(false));

            x.assertEquals(y);
          })
        ).rejects.toThrow();
      });
    });
    describe('equals', () => {
      it('should not throw on true "equals" true', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Bool, () => new Bool(true));

          x.equals(x).assertEquals(true);
        });
      });
      it('should throw on true "equals" false', async () => {
        expect(
          Provable.runAndCheck(() => {
            const x = Provable.witness(Bool, () => new Bool(true));
            const y = Provable.witness(Bool, () => new Bool(false));
            x.equals(y).assertEquals(true);
          })
        ).rejects.toThrow();
      });
    });
  });
  describe('outside circuit', () => {
    describe('toField', () => {
      it('should convert false to Field element 0', () => {
        expect(new Bool(false).toField()).toEqual(new Field(0));
      });
      it('should throw when false toField is compared to Field element other than 0 ', () => {
        expect(() => {
          expect(new Bool(false).toField()).toEqual(new Field(1));
        }).toThrow();
      });

      it('should convert true to Field element 1', () => {
        expect(new Bool(true).toField()).toEqual(new Field(1));
      });

      it('should throw when true toField is compared to Field element other than 1 ', () => {
        expect(() => {
          expect(new Bool(true).toField()).toEqual(new Field(0));
        }).toThrow();
      });
    });

    describe('toFields', () => {
      it('should return an array of Fields', () => {
        const x = new Bool(false);
        const fieldArr = x.toFields();
        const isArr = Array.isArray(fieldArr);
        expect(isArr).toBe(true);
        expect(fieldArr[0]).toEqual(new Field(0));
      });
    });
    describe('and', () => {
      it('true "and" true should return true', async () => {
        const xTrue = new Bool(true);
        const yTrue = new Bool(true);
        expect(xTrue.and(yTrue)).toEqual(new Bool(true));
      });

      it('should throw if true "and" true is compared to false', async () => {
        expect(() => {
          const xTrue = new Bool(true);
          const yTrue = new Bool(true);
          expect(xTrue.and(yTrue)).toEqual(new Bool(false));
        }).toThrow();
      });

      it('false "and" false should return false', async () => {
        const xFalse = new Bool(false);
        const yFalse = new Bool(false);
        expect(xFalse.and(yFalse)).toEqual(new Bool(false));
      });

      it('should throw if false "and" false is compared to true', async () => {
        expect(() => {
          const xFalse = new Bool(false);
          const yFalse = new Bool(false);
          expect(xFalse.and(yFalse)).toEqual(new Bool(true));
        }).toThrow();
      });

      it('false "and" true should return false', async () => {
        const xFalse = new Bool(false);
        const yTrue = new Bool(true);
        expect(xFalse.and(yTrue)).toEqual(new Bool(false));
      });

      it('should throw if false "and" true is compared to true', async () => {
        expect(() => {
          const xFalse = new Bool(false);
          const yFalse = new Bool(false);
          expect(xFalse.and(yFalse)).toEqual(new Bool(true));
        }).toThrow();
      });
    });
    describe('not', () => {
      it('should return a new bool that is the negation of the input', async () => {
        const xTrue = new Bool(true);
        const yFalse = new Bool(false);
        expect(xTrue.not()).toEqual(new Bool(false));
        expect(yFalse.not()).toEqual(new Bool(true));
      });

      it('should throw if input.not() is compared to input', async () => {
        expect(() => {
          const xTrue = new Bool(true);

          xTrue.not().assertEquals(xTrue);
        }).toThrow();
      });
    });

    describe('or', () => {
      it('true "or" true should return true', async () => {
        const xTrue = new Bool(true);
        const yTrue = new Bool(true);

        xTrue.or(yTrue).assertEquals(new Bool(true));
      });

      it('should throw if true "or" true is compared to false', async () => {
        expect(() => {
          const xTrue = new Bool(true);
          const yTrue = new Bool(true);

          expect(xTrue.or(yTrue)).toEqual(new Bool(false));
        }).toThrow();
      });

      it('false "or" false should return false', async () => {
        const xFalse = new Bool(false);
        const yFalse = new Bool(false);

        expect(xFalse.or(yFalse)).toEqual(new Bool(false));
      });

      it('should throw if false "or" false is compared to true', async () => {
        expect(() => {
          const xFalse = new Bool(false);
          const yFalse = new Bool(false);

          expect(xFalse.or(yFalse)).toEqual(new Bool(true));
        }).toThrow();
      });

      it('false "or" true should return true', async () => {
        const xFalse = new Bool(false);
        const yTrue = new Bool(true);
        xFalse.or(yTrue).assertEquals(new Bool(true));
      });
    });
    describe('toBoolean', () => {
      it('should return a true javascript boolean', () => {
        const xTrue = new Bool(true);
        expect(xTrue.toBoolean()).toEqual(true);
      });
      it('should return a false javascript boolean', () => {
        const xFalse = new Bool(false);
        expect(xFalse.toBoolean()).toEqual(false);
      });
    });
  });
});
