import { Field, Provable, Scalar, ScalarField } from 'o1js';

describe('scalar', () => {
  describe('scalar', () => {
    describe('Inside circuit', () => {
      describe('toFields', () => {
        it('should return an array of Fields', async () => {
          await Provable.runAndCheck(() => {
            const x = Provable.witness(Scalar, () => Scalar.random());
            const fieldArr = x.toFields();
            expect(Array.isArray(fieldArr)).toBe(true);
          });
        });
      });

      describe('toFields / fromFields', () => {
        it('should return the same', async () => {
          let s0 = Scalar.random();
          await Provable.runAndCheck(() => {
            let s1 = Provable.witness(Scalar, () => s0);
            Provable.assertEqual(Scalar.fromFields(s1.toFields()), s0);
          });
        });
      });

      describe('fromBits', () => {
        it('should return a Scalar', async () => {
          await Provable.runAndCheck(() => {
            Provable.witness(Scalar, () => Scalar.fromBits(Field.random().toBits()));
          });
        });
      });

      describe('toScalarField / fromScalarField', () => {
        it('should return the same', async () => {
          const s = Scalar.random();
          await Provable.runAndCheck(() => {
            const scalar = Provable.witness(Scalar, () => s);
            const scalarField = ScalarField.fromScalar(scalar);
            const scalar2 = scalarField.toScalar();
            Provable.assertEqual(scalar, scalar2);
          });
        });
      });

      describe('random', () => {
        it('two different calls should be different', async () => {
          await Provable.runAndCheck(() => {
            const x = Provable.witness(Scalar, () => Scalar.random());
            const y = Provable.witness(Scalar, () => Scalar.random());
            expect(x).not.toEqual(y);
          });
        });
      });
    });

    describe('Outside circuit', () => {
      describe('toFields / fromFields', () => {
        it('roundtrip works', () => {
          let x = Scalar.random();
          expect(Scalar.fromFields(x.toFields())).toEqual(x);
        });
      });

      describe('fromBits', () => {
        it('should return a scalar with the same bigint value', () => {
          let x = Field.random();
          let bits_ = x.toBits();
          let s = Scalar.fromBits(bits_);
          expect(x.toBigInt()).toEqual(s.toBigInt());
        });
      });

      describe('random', () => {
        it('two different calls should be different', () => {
          expect(Scalar.random()).not.toEqual(Scalar.random());
        });
      });

      describe('toJSON/fromJSON', () => {
        it("fromJSON('1') should be 1", () => {
          expect(Scalar.fromJSON('1')!.toJSON()).toEqual('1');
        });

        it("fromJSON('2^32-1') should be 2^32-1", () => {
          expect(Scalar.fromJSON(String(2 ** 32 - 1))!.toJSON()).toEqual(String(2 ** 32 - 1));
        });

        it('fromJSON(1) should be 1', () => {
          expect(Scalar.from(1).toJSON()).toEqual('1');
        });

        it('fromJSON(0n) should be 1', () => {
          expect(Scalar.from(0n).toJSON()).toEqual('0');
        });
      });

      describe('neg', () => {
        it('neg(1)=-1', () => {
          const x = Scalar.from(1);
          expect(x.neg().toBigInt()).toEqual(Scalar.ORDER - 1n);
        });

        it('neg(-1)=1', () => {
          const x = Scalar.from(-1);
          expect(x.neg().toJSON()).toEqual('1');
        });

        it('neg(0)=0', () => {
          const x = Scalar.from(0);
          expect(x.neg().toJSON()).toEqual('0');
        });
      });

      describe('add', () => {
        it('1+1=2', () => {
          const x = Scalar.from(1);
          const y = Scalar.from(1);
          expect(x.add(y).toJSON()).toEqual('2');
        });

        it('5000+5000=10000', () => {
          const x = Scalar.from(5000);
          const y = Scalar.from(5000);
          expect(x.add(y).toJSON()).toEqual('10000');
        });

        it('((2^64/2)+(2^64/2)) adds to 2^64', () => {
          const v = (1n << 64n) - 2n;
          const x = Scalar.fromJSON(String(v / 2n));
          const y = Scalar.fromJSON(String(v / 2n));
          expect(x.add(y).toJSON()).toEqual(String(v));
        });
      });

      describe('sub', () => {
        it('1-1=0', () => {
          const x = Scalar.from(1);
          const y = Scalar.from(1);
          expect(x.sub(y).toJSON()).toEqual('0');
        });

        it('10000-5000=5000', () => {
          const x = Scalar.from(10000);
          const y = Scalar.from(5000);
          expect(x.sub(y).toJSON()).toEqual('5000');
        });

        it('0-1=-1', () => {
          const x = Scalar.from(0);
          const y = Scalar.from(1);
          expect(x.sub(y).toBigInt()).toEqual(Scalar.ORDER - 1n);
        });

        it('1-(-1)=2', () => {
          const x = Scalar.from(1);
          const y = Scalar.from(-1);
          expect(x.sub(y).toBigInt()).toEqual(2n);
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          const x = Scalar.from(1);
          const y = Scalar.from(2);
          expect(x.mul(y).toJSON()).toEqual('2');
        });

        it('1x0=0', () => {
          const x = Scalar.from(1);
          const y = Scalar.from(0);
          expect(x.mul(y).toJSON()).toEqual('0');
        });

        it('1000x1000=1000000', () => {
          const x = Scalar.from(1000);
          const y = Scalar.from(1000);
          expect(x.mul(y).toJSON()).toEqual('1000000');
        });

        it('(2^64-1)x1=(2^64-1)', () => {
          const v = (1n << 64n) - 1n;
          const x = Scalar.from(String(v));
          const y = Scalar.from(1);
          expect(x.mul(y).toJSON()).toEqual(String(v));
        });
      });

      describe('div', () => {
        it('2/1=2', () => {
          const x = Scalar.from(2);
          const y = Scalar.from(1);
          expect(x.div(y).toJSON()).toEqual('2');
        });

        it('0/1=0', () => {
          const x = Scalar.from(0);
          const y = Scalar.from(1);
          expect(x.div(y).toJSON()).toEqual('0');
        });

        it('2000/1000=2', () => {
          const x = Scalar.from(2000);
          const y = Scalar.from(1000);
          expect(x.div(y).toJSON()).toEqual('2');
        });

        it('(2^64-1)/1=(2^64-1)', () => {
          const v = (1n << 64n) - 1n;
          const x = Scalar.from(String(v));
          const y = Scalar.from(1);
          expect(x.div(y).toJSON()).toEqual(String(v));
        });
      });
    });
  });
});
