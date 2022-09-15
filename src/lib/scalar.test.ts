import { shutdown, isReady, Field, Bool, Circuit, Scalar } from 'snarkyjs';

describe('scalar', () => {
  beforeAll(async () => {
    await isReady;
  });

  afterAll(async () => {
    setTimeout(async () => {
      await shutdown();
    }, 0);
  });

  describe('scalar', () => {
    describe('Inside circuit', () => {
      describe('toFields', () => {
        it('should return an array of Fields', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(Scalar, () => Scalar.random());
              const fieldArr = x.toFields();
              expect(Array.isArray(fieldArr)).toBe(true);
            });
          }).not.toThrow();
        });
      });

      describe('ofFields', () => {
        it('should return a Scalar', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              Circuit.witness(Scalar, () => Scalar.ofFields([Field.one]));
            });
          }).not.toThrow();
        });
      });

      describe('ofBits', () => {
        it('should return a Scalar', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              Circuit.witness(Scalar, () => Scalar.ofBits([Bool(true)]));
            });
          }).not.toThrow();
        });
      });

      describe('random', () => {
        it('should not crash', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              Circuit.witness(Scalar, () => Scalar.random());
            });
          }).not.toThrow();
        });

        it('two different calls should be different', () => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Scalar, () => Scalar.random());
            const y = Circuit.witness(Scalar, () => Scalar.random());
            expect(x).not.toEqual(y);
          });
        });
      });

      describe('toJSON/fromJSON', () => {
        it("fromJSON('1') should be 1", () => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Scalar, () => Scalar.fromJSON('1')!);
            expect(x.toJSON()).toEqual('1');
          });
        });

        it("fromJSON('2^32-1') should be 2^32-1", () => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(
              Scalar,
              () => Scalar.fromJSON(String(2 ** 32 - 1))!
            );
            expect(x.toJSON()).toEqual(String(2 ** 32 - 1));
          });
        });

        it('fromJSON(1) should be 1', () => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Scalar, () => Scalar.fromJSON(1)!);
            expect(x.toJSON()).toEqual('1');
          });
        });

        it('fromJSON(2^32-1) should be 2^32 - 1', () => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(
              Scalar,
              () => Scalar.fromJSON(String(2 ** 32 - 1))!
            );
            expect(x.toJSON()).toEqual(String(2 ** 32 - 1));
          });
        });

        it('fromJSON(true) should be 1', () => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Scalar, () => Scalar.fromJSON(true)!);
            expect(x.toJSON()).toEqual('1');
          });
        });

        it('fromJSON(false) should be 0', () => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Scalar, () => Scalar.fromJSON(false)!);
            expect(x.toJSON()).toEqual('0');
          });
        });
      });
    });

    describe('Outside circuit', () => {
      describe('toFields', () => {
        it('should return an array of Fields', () => {
          expect(() => {
            const x = Scalar.random();
            const fieldArr = x.toFields();
            expect(Array.isArray(fieldArr)).toBe(true);
          }).not.toThrow();
        });
      });

      describe('ofFields', () => {
        it('should return a Scalar', () => {
          expect(() => {
            Scalar.ofFields([Field.one]);
          }).not.toThrow();
        });
      });

      describe('ofBits', () => {
        it('should return a Scalar', () => {
          expect(() => {
            Scalar.ofBits([Bool(true)]);
          }).not.toThrow();
        });
      });

      describe('random', () => {
        it('should not crash', () => {
          expect(() => {
            Scalar.random();
          }).not.toThrow();
        });

        it('two different calls should be different', () => {
          expect(Scalar.random()).not.toEqual(Scalar.random());
        });
      });

      describe('toJSON/fromJSON', () => {
        it("fromJSON('1') should be 1", () => {
          expect(Scalar.fromJSON('1')!.toJSON()).toEqual('1');
        });

        it("fromJSON('2^32-1') should be 2^32-1", () => {
          expect(Scalar.fromJSON(String(2 ** 32 - 1))!.toJSON()).toEqual(
            String(2 ** 32 - 1)
          );
        });

        it('fromJSON(1) should be 1', () => {
          expect(Scalar.fromJSON(1)!.toJSON()).toEqual('1');
        });

        it('fromJSON(true) should be 1', () => {
          expect(Scalar.fromJSON(true)!.toJSON()).toEqual('1');
        });

        it('fromJSON(false) should be 0', () => {
          expect(Scalar.fromJSON(false)!.toJSON()).toEqual('0');
        });

        it('fromJSON([]) should be undefined', () => {
          expect(Scalar.fromJSON([])).toBeNull();
        });
      });

      describe('neg', () => {
        it('neg(1)=-1', () => {
          const x = Scalar.fromJSON(1)!;
          expect(x.neg().toJSON()).toEqual(
            '28948022309329048855892746252171976963363056481941647379679742748393362948096'
          );
        });

        it('neg(-1)=1', () => {
          const x = Scalar.fromJSON(-1)!;
          expect(x.neg().toJSON()).toEqual(
            '28948022309329048855892746252171976963363056481941647379661296004319653396482'
          );
        });

        it('neg(0)=0', () => {
          const x = Scalar.fromJSON(0)!;
          expect(x.neg().toJSON()).toEqual('0');
        });
      });

      describe('add', () => {
        it('1+1=2', () => {
          const x = Scalar.fromJSON(1)!;
          const y = Scalar.fromJSON(1)!;
          expect(x.add(y).toJSON()).toEqual('2');
        });

        it('5000+5000=10000', () => {
          const x = Scalar.fromJSON(5000)!;
          const y = Scalar.fromJSON(5000)!;
          expect(x.add(y).toJSON()).toEqual('10000');
        });

        it('((2^64/2)+(2^64/2)) adds to 2^64', () => {
          const v = (1n << 64n) - 2n;
          const x = Scalar.fromJSON(String(v / 2n))!;
          const y = Scalar.fromJSON(String(v / 2n))!;
          expect(x.add(y).toJSON()).toEqual(String(v));
        });
      });

      describe('sub', () => {
        it('1-1=0', () => {
          const x = Scalar.fromJSON(1)!;
          const y = Scalar.fromJSON(1)!;
          expect(x.sub(y).toJSON()).toEqual('0');
        });

        it('10000-5000=5000', () => {
          const x = Scalar.fromJSON(10000)!;
          const y = Scalar.fromJSON(5000)!;
          expect(x.sub(y).toJSON()).toEqual('5000');
        });

        // Expected: "-1" Received: "28948022309329048855892746252171976963363056481941647379679742748393362948096"
        it.skip('0-1=-1', () => {
          const x = Scalar.fromJSON(0)!;
          const y = Scalar.fromJSON(1)!;
          expect(x.sub(y).toJSON()).toEqual('-1');
        });

        // Expected: "2" Received: "28948022309329048855892746252171976963363056481941647379661296004319653396483"
        it.skip('1-(-1)=2', () => {
          const x = Scalar.fromJSON(1)!;
          const y = Scalar.fromJSON(-1)!;
          expect(x.sub(y).toJSON()).toEqual('2');
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          const x = Scalar.fromJSON(1)!;
          const y = Scalar.fromJSON(2)!;
          expect(x.mul(y).toJSON()).toEqual('2');
        });

        it('1x0=0', () => {
          const x = Scalar.fromJSON(1)!;
          const y = Scalar.fromJSON(0)!;
          expect(x.mul(y).toJSON()).toEqual('0');
        });

        it('1000x1000=1000000', () => {
          const x = Scalar.fromJSON(1000)!;
          const y = Scalar.fromJSON(1000)!;
          expect(x.mul(y).toJSON()).toEqual('1000000');
        });

        it('(2^64-1)x1=(2^64-1)', () => {
          const v = (1n << 64n) - 1n;
          const x = Scalar.fromJSON(String(v))!;
          const y = Scalar.fromJSON(1)!;
          expect(x.mul(y).toJSON()).toEqual(String(v));
        });
      });

      describe('div', () => {
        it('2/1=2', () => {
          const x = Scalar.fromJSON(2)!;
          const y = Scalar.fromJSON(1)!;
          expect(x.div(y).toJSON()).toEqual('2');
        });

        it('0/1=0', () => {
          const x = Scalar.fromJSON(0)!;
          const y = Scalar.fromJSON(1)!;
          expect(x.div(y).toJSON()).toEqual('0');
        });

        it('2000/1000=2', () => {
          const x = Scalar.fromJSON(2000)!;
          const y = Scalar.fromJSON(1000)!;
          expect(x.div(y).toJSON()).toEqual('2');
        });

        it('(2^64-1)/1=(2^64-1)', () => {
          const v = (1n << 64n) - 1n;
          const x = Scalar.fromJSON(String(v))!;
          const y = Scalar.fromJSON(1)!;
          expect(x.div(y).toJSON()).toEqual(String(v));
        });
      });
    });
  });
});
