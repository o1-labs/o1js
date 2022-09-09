import {
  shutdown,
  isReady,
  Circuit,
  Int64,
  UInt64,
  UInt32,
  Field,
  Bool,
  Sign,
} from 'snarkyjs';

describe('int', () => {
  beforeAll(async () => {
    await isReady;
  });

  afterAll(async () => {
    // Use a timeout to defer the execution of `shutdown()` until Jest processes all tests.
    // `shutdown()` exits the process when it's done cleanup so we want to delay it's execution until Jest is done
    setTimeout(async () => {
      await shutdown();
    }, 0);
  });

  const NUMBERMAX = 2 ** 53 - 1; //  JavaScript numbers can only safely store integers in the range -(2^53 − 1) to 2^53 − 1

  describe('Int64', () => {
    describe('toString', () => {
      it('should be the same as Field.zero', async () => {
        const int = new Int64(UInt64.zero, Sign.one);
        const field = Field.zero;
        expect(int.toString()).toEqual(field.toString());
      });

      it('should be -1', async () => {
        const int = new Int64(UInt64.one).neg();
        expect(int.toString()).toEqual('-1');
      });

      it('should be the same as 2^53-1', async () => {
        const int = Int64.fromField(Field(String(NUMBERMAX)));
        const field = Field(String(NUMBERMAX));
        expect(int.toString()).toEqual(field.toString());
      });
    });

    describe('zero', () => {
      it('should be the same as Field zero', async () => {
        expect(Int64.zero.magnitude.value).toEqual(Field.zero);
      });
    });

    describe('fromUnsigned', () => {
      it('should be the same as UInt64.zero', async () => {
        expect(new Int64(UInt64.zero, Sign.one)).toEqual(
          Int64.fromUnsigned(UInt64.zero)
        );
      });

      it('should be the same as UInt64.MAXINT', async () => {
        expect(Int64.fromBigInt((1n << 64n) - 1n)).toEqual(
          Int64.fromUnsigned(UInt64.MAXINT())
        );
      });
    });

    describe('neg', () => {
      it('neg(1)=-1', () => {
        const int = Int64.one;
        expect(int.neg().toField()).toEqual(Field.minusOne);
      });
      it('neg(2^53-1)=-2^53-1', () => {
        const int = Int64.fromNumber(NUMBERMAX);
        expect(int.neg().toString()).toEqual(`${-NUMBERMAX}`);
      });
    });

    describe('add', () => {
      it('1+1=2', () => {
        expect(Int64.one.add(Int64.fromString('1')).toString()).toEqual('2');
      });

      it('5000+(-4000)=1000', () => {
        expect(
          Int64.fromNumber(5000)
            .add(Int64.fromField(Field(-4000)))
            .toString()
        ).toEqual('1000');
      });

      it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
        const value = ((1n << 64n) - 2n) / 2n;
        expect(
          Int64.fromBigInt(value)
            .add(Int64.fromBigInt(value))
            .add(Int64.one)
            .toString()
        ).toEqual(UInt64.MAXINT().toString());
      });

      it('should throw on overflow', () => {
        expect(() => {
          Int64.fromBigInt(1n << 64n);
        }).toThrow();
        expect(() => {
          Int64.fromBigInt(-(1n << 64n));
        }).toThrow();
        expect(() => {
          Int64.from(100).add(1n << 64n);
        }).toThrow();
        expect(() => {
          Int64.from(100).sub('1180591620717411303424');
        }).toThrow();
        expect(() => {
          Int64.from(100).mul(UInt64.from(Field(1n << 100n)));
        }).toThrow();
      });

      // TODO - should we make these throw?
      // These are edge cases, where one of two inputs is out of the Int64 range,
      // but the result of an operation with a proper Int64 moves it into the range.
      // They would only get caught if we'd also check the range in the Int64 / UInt64 constructors,
      // which breaks out current practice of having a dumb constructor that only stores variables
      it.skip('operations should throw on overflow of any input', () => {
        expect(() => {
          new Int64(new UInt64(Field(1n << 64n))).sub(1);
        }).toThrow();
        expect(() => {
          new Int64(new UInt64(Field(-(1n << 64n)))).add(5);
        }).toThrow();
        expect(() => {
          Int64.from(20).sub(new UInt64(Field((1n << 64n) + 10n)));
        }).toThrow();
        expect(() => {
          Int64.from(6).add(new UInt64(Field(-(1n << 64n) - 5n)));
        }).toThrow();
      });

      it('should throw on overflow addition', () => {
        expect(() => {
          Int64.from((1n << 64n) - 1n).add(1);
        }).toThrow();
        expect(() => {
          Int64.one.add((1n << 64n) - 1n);
        }).toThrow();
      });
      it('should not throw on non-overflowing addition', () => {
        expect(() => {
          Int64.fromBigInt((1n << 64n) - 1n).add(Int64.zero);
        }).not.toThrow();
      });
    });

    describe('sub', () => {
      it('1-1=0', () => {
        expect(Int64.one.sub(Int64.fromNumber(1)).toString()).toEqual('0');
      });

      it('10000-5000=5000', () => {
        expect(
          Int64.fromField(Field(10000)).sub(Int64.fromString('5000')).toString()
        ).toEqual('5000');
      });

      it('0-1=-1', () => {
        expect(Int64.zero.sub(Int64.one).toString()).toEqual('-1');
      });

      it('(0-MAXINT) subs to -MAXINT', () => {
        expect(Int64.zero.sub(UInt64.MAXINT()).toString()).toEqual(
          '-' + UInt64.MAXINT().toString()
        );
      });
    });

    describe('toFields', () => {
      it('toFields(1) should be the same as [Field.one, Field.one]', () => {
        expect(Int64.toFields(Int64.one)).toEqual([Field.one, Field.one]);
      });

      it('toFields(2^53-1) should be the same as Field(2^53-1)', () => {
        expect(Int64.toFields(Int64.fromNumber(NUMBERMAX))).toEqual([
          Field(String(NUMBERMAX)),
          Field.one,
        ]);
      });
    });
    describe('ofFields', () => {
      it('ofFields([1, 1]) should be the same as Int64.one', () => {
        expect(Int64.ofFields([Field.one, Field.one])).toEqual(Int64.one);
      });

      it('ofFields(2^53-1) should be the same as Field(2^53-1)', () => {
        expect(Int64.ofFields([Field(String(NUMBERMAX)), Field.one])).toEqual(
          Int64.fromNumber(NUMBERMAX)
        );
      });
    });

    describe('mul / div / mod', () => {
      it('mul, div and mod work', () => {
        // 2 ** 6 === 64
        let x = Int64.fromField(Field(2))
          .mul(2)
          .mul('2')
          .mul(2n)
          .mul(UInt32.fromNumber(2))
          .mul(UInt64.fromNumber(2));
        expect(`${x}`).toBe('64');

        // 64 * (-64) === -64**2
        let y = Int64.fromNumber(-64);
        expect(`${x.mul(y)}`).toEqual(`${-(64 ** 2)}`);
        // (-64) // 64 === -1
        expect(y.div(x).toString()).toEqual('-1');
        // (-64) // 65 === 0
        expect(y.div(65).toString()).toEqual('0');
        // 64 % 3 === 1
        expect(x.mod(3).toString()).toEqual('1');
        // (-64) % 3 === 2
        expect(y.mod(3).toString()).toEqual('2');
      });
    });
  });

  describe('UInt64', () => {
    describe('Inside circuit', () => {
      describe('add', () => {
        it('1+1=2', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.add(y).assertEquals(new UInt64(Field(2)));
            });
          }).not.toThrow();
        });

        it('5000+5000=10000', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(5000)));
              const y = Circuit.witness(UInt64, () => new UInt64(Field(5000)));
              x.add(y).assertEquals(new UInt64(Field(10000)));
            });
          }).not.toThrow();
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const n = Field((((1n << 64n) - 2n) / 2n).toString());
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(n));
              const y = Circuit.witness(UInt64, () => new UInt64(n));
              x.add(y).add(1).assertEquals(UInt64.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on overflow addition', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.add(y);
            });
          }).toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.sub(y).assertEquals(new UInt64(Field.zero));
            });
          }).not.toThrow();
        });

        it('10000-5000=5000', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(10000)));
              const y = Circuit.witness(UInt64, () => new UInt64(Field(5000)));
              x.sub(y).assertEquals(new UInt64(Field(5000)));
            });
          }).not.toThrow();
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.zero));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.sub(y);
            });
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field(2)));
              x.mul(y).assertEquals(new UInt64(Field(2)));
            });
          }).not.toThrow();
        });

        it('1x0=0', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.zero));
              x.mul(y).assertEquals(new UInt64(Field.zero));
            });
          }).not.toThrow();
        });

        it('1000x1000=1000000', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              x.mul(y).assertEquals(new UInt64(Field(1000000)));
            });
          }).not.toThrow();
        });

        it('MAXINTx1=MAXINT', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.mul(y).assertEquals(UInt64.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on overflow multiplication', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => new UInt64(Field(2)));
              x.mul(y);
            });
          }).toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(2)));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.div(y).assertEquals(new UInt64(Field(2)));
            });
          }).not.toThrow();
        });

        it('0/1=0', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.zero));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.div(y).assertEquals(new UInt64(Field.zero));
            });
          }).not.toThrow();
        });

        it('2000/1000=2', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(2000)));
              const y = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              x.div(y).assertEquals(new UInt64(Field(2)));
            });
          }).not.toThrow();
        });

        it('MAXINT/1=MAXINT', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.div(y).assertEquals(UInt64.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on division by zero', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => new UInt64(Field.zero));
              x.div(y);
            });
          }).toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.mod(y).assertEquals(new UInt64(Field.zero));
            });
          }).not.toThrow();
        });

        it('500%32=20', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(500)));
              const y = Circuit.witness(UInt64, () => new UInt64(Field(32)));
              x.mod(y).assertEquals(new UInt64(Field(20)));
            });
          }).not.toThrow();
        });

        it('MAXINT%7=1', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => new UInt64(Field(7)));
              x.mod(y).assertEquals(new UInt64(Field.one));
            });
          }).not.toThrow();
        });

        it('should throw on mod by zero', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => new UInt64(Field.zero));
              x.mod(y).assertEquals(new UInt64(Field.one));
            });
          }).toThrow();
        });
      });

      describe('assertLt', () => {
        it('1<2=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field(2)));
              x.assertLt(y);
            });
          }).not.toThrow();
        });

        it('1<1=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.assertLt(y);
            });
          }).toThrow();
        });

        it('2<1=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(2)));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.assertLt(y);
            });
          }).toThrow();
        });

        it('1000<100000=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Circuit.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              x.assertLt(y);
            });
          }).not.toThrow();
        });

        it('100000<1000=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              const y = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              x.assertLt(y);
            });
          }).toThrow();
        });

        it('MAXINT<MAXINT=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => UInt64.MAXINT());
              x.assertLt(y);
            });
          }).toThrow();
        });
      });

      describe('assertLte', () => {
        it('1<=1=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.assertLte(y);
            });
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(2)));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.assertLte(y);
            });
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Circuit.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              x.assertLte(y);
            });
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              const y = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              x.assertLte(y);
            });
          }).toThrow();
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => UInt64.MAXINT());
              x.assertLte(y);
            });
          }).not.toThrow();
        });
      });

      describe('assertGt', () => {
        it('2>1=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(2)));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.assertGt(y);
            });
          }).not.toThrow();
        });

        it('1>1=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.assertGt(y);
            });
          }).toThrow();
        });

        it('1>2=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field(2)));
              x.assertGt(y);
            });
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              const y = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              x.assertGt(y);
            });
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Circuit.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              x.assertGt(y);
            });
          }).toThrow();
        });

        it('MAXINT>MAXINT=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => UInt64.MAXINT());
              x.assertGt(y);
            });
          }).toThrow();
        });
      });

      describe('assertGte', () => {
        it('1<=1=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
              x.assertGte(y);
            });
          }).not.toThrow();
        });

        it('1>=2=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field.one));
              const y = Circuit.witness(UInt64, () => new UInt64(Field(2)));
              x.assertGte(y);
            });
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              const y = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              x.assertGte(y);
            });
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Circuit.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              x.assertGte(y);
            });
          }).toThrow();
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt64, () => UInt64.MAXINT());
              const y = Circuit.witness(UInt64, () => UInt64.MAXINT());
              x.assertGte(y);
            });
          }).not.toThrow();
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field.one', () => {
            expect(() => {
              Circuit.runAndCheck(() => {
                const x = Circuit.witness(UInt64, () => UInt64.fromNumber(1));
                const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
                x.assertEquals(y);
              });
            }).not.toThrow();
          });

          it('should be the same as 2^53-1', () => {
            expect(() => {
              Circuit.runAndCheck(() => {
                const x = Circuit.witness(UInt64, () =>
                  UInt64.fromNumber(NUMBERMAX)
                );
                const y = Circuit.witness(
                  UInt64,
                  () => new UInt64(Field(String(NUMBERMAX)))
                );
                x.assertEquals(y);
              });
            }).not.toThrow();
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field.one', () => {
            expect(() => {
              Circuit.runAndCheck(() => {
                const x = Circuit.witness(UInt64, () => UInt64.fromString('1'));
                const y = Circuit.witness(UInt64, () => new UInt64(Field.one));
                x.assertEquals(y);
              });
            }).not.toThrow();
          });

          it('should be the same as 2^53-1', () => {
            expect(() => {
              Circuit.runAndCheck(() => {
                const x = Circuit.witness(UInt64, () =>
                  UInt64.fromString(String(NUMBERMAX))
                );
                const y = Circuit.witness(
                  UInt64,
                  () => new UInt64(Field(String(NUMBERMAX)))
                );
                x.assertEquals(y);
              });
            }).not.toThrow();
          });
        });
      });
    });

    describe('Outside of circuit', () => {
      describe('add', () => {
        it('1+1=2', () => {
          expect(new UInt64(Field.one).add(1).toString()).toEqual('2');
        });

        it('5000+5000=10000', () => {
          expect(new UInt64(Field(5000)).add(5000).toString()).toEqual('10000');
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const value = Field((((1n << 64n) - 2n) / 2n).toString());
          expect(
            new UInt64(value)
              .add(new UInt64(value))
              .add(new UInt64(Field.one))
              .toString()
          ).toEqual(UInt64.MAXINT().toString());
        });

        it('should throw on overflow addition', () => {
          expect(() => {
            UInt64.MAXINT().add(1);
          }).toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', () => {
          expect(new UInt64(Field.one).sub(1).toString()).toEqual('0');
        });

        it('10000-5000=5000', () => {
          expect(new UInt64(Field(10000)).sub(5000).toString()).toEqual('5000');
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            UInt64.fromNumber(0).sub(1);
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(new UInt64(Field.one).mul(2).toString()).toEqual('2');
        });

        it('1x0=0', () => {
          expect(new UInt64(Field.one).mul(0).toString()).toEqual('0');
        });

        it('1000x1000=1000000', () => {
          expect(new UInt64(Field(1000)).mul(1000).toString()).toEqual(
            '1000000'
          );
        });

        it('MAXINTx1=MAXINT', () => {
          expect(UInt64.MAXINT().mul(1).toString()).toEqual(
            UInt64.MAXINT().toString()
          );
        });

        it('should throw on overflow multiplication', () => {
          expect(() => {
            UInt64.MAXINT().mul(2);
          }).toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', () => {
          expect(new UInt64(Field(2)).div(1).toString()).toEqual('2');
        });

        it('0/1=0', () => {
          expect(new UInt64(Field.zero).div(1).toString()).toEqual('0');
        });

        it('2000/1000=2', () => {
          expect(new UInt64(Field(2000)).div(1000).toString()).toEqual('2');
        });

        it('MAXINT/1=MAXINT', () => {
          expect(UInt64.MAXINT().div(1).toString()).toEqual(
            UInt64.MAXINT().toString()
          );
        });

        it('should throw on division by zero', () => {
          expect(() => {
            UInt64.MAXINT().div(0);
          }).toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', () => {
          expect(new UInt64(Field.one).mod(1).toString()).toEqual('0');
        });

        it('500%32=20', () => {
          expect(new UInt64(Field(500)).mod(32).toString()).toEqual('20');
        });

        it('MAXINT%7=1', () => {
          expect(UInt64.MAXINT().mod(7).toString()).toEqual('1');
        });

        it('should throw on mod by zero', () => {
          expect(() => {
            UInt64.MAXINT().mod(0);
          }).toThrow();
        });
      });

      describe('lt', () => {
        it('1<2=true', () => {
          expect(new UInt64(Field.one).lt(new UInt64(Field(2)))).toEqual(
            Bool(true)
          );
        });

        it('1<1=false', () => {
          expect(new UInt64(Field.one).lt(new UInt64(Field.one))).toEqual(
            Bool(false)
          );
        });

        it('2<1=false', () => {
          expect(new UInt64(Field(2)).lt(new UInt64(Field.one))).toEqual(
            Bool(false)
          );
        });

        it('1000<100000=true', () => {
          expect(new UInt64(Field(1000)).lt(new UInt64(Field(100000)))).toEqual(
            Bool(true)
          );
        });

        it('100000<1000=false', () => {
          expect(new UInt64(Field(100000)).lt(new UInt64(Field(1000)))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT<MAXINT=false', () => {
          expect(UInt64.MAXINT().lt(UInt64.MAXINT())).toEqual(Bool(false));
        });
      });

      describe('lte', () => {
        it('1<=1=true', () => {
          expect(new UInt64(Field.one).lte(new UInt64(Field.one))).toEqual(
            Bool(true)
          );
        });

        it('2<=1=false', () => {
          expect(new UInt64(Field(2)).lte(new UInt64(Field.one))).toEqual(
            Bool(false)
          );
        });

        it('1000<=100000=true', () => {
          expect(
            new UInt64(Field(1000)).lte(new UInt64(Field(100000)))
          ).toEqual(Bool(true));
        });

        it('100000<=1000=false', () => {
          expect(
            new UInt64(Field(100000)).lte(new UInt64(Field(1000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(UInt64.MAXINT().lte(UInt64.MAXINT())).toEqual(Bool(true));
        });
      });

      describe('assertLte', () => {
        it('1<=1=true', () => {
          expect(() => {
            new UInt64(Field.one).assertLte(new UInt64(Field.one));
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            new UInt64(Field(2)).assertLte(new UInt64(Field.one));
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            new UInt64(Field(1000)).assertLte(new UInt64(Field(100000)));
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            new UInt64(Field(100000)).assertLte(new UInt64(Field(1000)));
          }).toThrow();
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(() => {
            UInt64.MAXINT().assertLte(UInt64.MAXINT());
          }).not.toThrow();
        });
      });

      describe('gt', () => {
        it('2>1=true', () => {
          expect(new UInt64(Field(2)).gt(new UInt64(Field.one))).toEqual(
            Bool(true)
          );
        });

        it('1>1=false', () => {
          expect(new UInt64(Field.one).gt(new UInt64(Field.one))).toEqual(
            Bool(false)
          );
        });

        it('1>2=false', () => {
          expect(new UInt64(Field.one).gt(new UInt64(Field(2)))).toEqual(
            Bool(false)
          );
        });

        it('100000>1000=true', () => {
          expect(new UInt64(Field(100000)).gt(new UInt64(Field(1000)))).toEqual(
            Bool(true)
          );
        });

        it('1000>100000=false', () => {
          expect(new UInt64(Field(1000)).gt(new UInt64(Field(100000)))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT>MAXINT=false', () => {
          expect(UInt64.MAXINT().gt(UInt64.MAXINT())).toEqual(Bool(false));
        });
      });

      describe('gte', () => {
        it('2>=1=true', () => {
          expect(new UInt64(Field(2)).gte(new UInt64(Field.one))).toEqual(
            Bool(true)
          );
        });

        it('1>=1=true', () => {
          expect(new UInt64(Field.one).gte(new UInt64(Field.one))).toEqual(
            Bool(true)
          );
        });

        it('1>=2=false', () => {
          expect(new UInt64(Field.one).gte(new UInt64(Field(2)))).toEqual(
            Bool(false)
          );
        });

        it('100000>=1000=true', () => {
          expect(
            new UInt64(Field(100000)).gte(new UInt64(Field(1000)))
          ).toEqual(Bool(true));
        });

        it('1000>=100000=false', () => {
          expect(
            new UInt64(Field(1000)).gte(new UInt64(Field(100000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(UInt64.MAXINT().gte(UInt64.MAXINT())).toEqual(Bool(true));
        });
      });

      describe('assertGt', () => {
        it('1>1=false', () => {
          expect(() => {
            new UInt64(Field.one).assertGt(new UInt64(Field.one));
          }).toThrow();
        });

        it('2>1=true', () => {
          expect(() => {
            new UInt64(Field(2)).assertGt(new UInt64(Field.one));
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            new UInt64(Field(1000)).assertGt(new UInt64(Field(100000)));
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            new UInt64(Field(100000)).assertGt(new UInt64(Field(1000)));
          }).not.toThrow();
        });

        it('MAXINT>MAXINT=false', () => {
          expect(() => {
            UInt64.MAXINT().assertGt(UInt64.MAXINT());
          }).toThrow();
        });
      });

      describe('assertGte', () => {
        it('1>=1=true', () => {
          expect(() => {
            new UInt64(Field.one).assertGte(new UInt64(Field.one));
          }).not.toThrow();
        });

        it('2>=1=true', () => {
          expect(() => {
            new UInt64(Field(2)).assertGte(new UInt64(Field.one));
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            new UInt64(Field(1000)).assertGte(new UInt64(Field(100000)));
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            new UInt64(Field(100000)).assertGte(new UInt64(Field(1000)));
          }).not.toThrow();
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(() => {
            UInt64.MAXINT().assertGte(UInt64.MAXINT());
          }).not.toThrow();
        });
      });

      describe('toString()', () => {
        it('should be the same as Field.zero', async () => {
          const uint64 = new UInt64(Field.zero);
          const field = Field.zero;
          expect(uint64.toString()).toEqual(field.toString());
        });
        it('should be the same as 2^53-1', async () => {
          const uint64 = new UInt64(Field(String(NUMBERMAX)));
          const field = Field(String(NUMBERMAX));
          expect(uint64.toString()).toEqual(field.toString());
        });
      });

      describe('check()', () => {
        it('should pass checking a MAXINT', () => {
          expect(() => {
            UInt64.check(UInt64.MAXINT());
          }).not.toThrow();
        });

        it('should throw checking over MAXINT', () => {
          const aboveMax = new UInt64(Field((1n << 64n).toString())); // This number is defined in UInt64.MAXINT()
          expect(() => {
            UInt64.check(aboveMax);
          }).toThrow();
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field.one', () => {
            const uint = UInt64.fromNumber(1);
            expect(uint.value).toEqual(new UInt64(Field.one).value);
          });

          it('should be the same as 2^53-1', () => {
            const uint = UInt64.fromNumber(NUMBERMAX);
            expect(uint.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field.one', () => {
            const uint = UInt64.fromString('1');
            expect(uint.value).toEqual(new UInt64(Field.one).value);
          });

          it('should be the same as 2^53-1', () => {
            const uint = UInt64.fromString(String(NUMBERMAX));
            expect(uint.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
      });
    });
  });

  describe('UInt32', () => {
    const NUMBERMAX = 2 ** 32 - 1;

    describe('Inside circuit', () => {
      describe('add', () => {
        it('1+1=2', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.add(y).assertEquals(new UInt32(Field(2)));
            });
          }).not.toThrow();
        });

        it('5000+5000=10000', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(5000)));
              const y = Circuit.witness(UInt32, () => new UInt32(Field(5000)));
              x.add(y).assertEquals(new UInt32(Field(10000)));
            });
          }).not.toThrow();
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const n = Field((((1n << 32n) - 2n) / 2n).toString());
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(n));
              const y = Circuit.witness(UInt32, () => new UInt32(n));
              x.add(y).add(1).assertEquals(UInt32.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on overflow addition', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.add(y);
            });
          }).toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.sub(y).assertEquals(new UInt32(Field.zero));
            });
          }).not.toThrow();
        });

        it('10000-5000=5000', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(10000)));
              const y = Circuit.witness(UInt32, () => new UInt32(Field(5000)));
              x.sub(y).assertEquals(new UInt32(Field(5000)));
            });
          }).not.toThrow();
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.zero));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.sub(y);
            });
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field(2)));
              x.mul(y).assertEquals(new UInt32(Field(2)));
            });
          }).not.toThrow();
        });

        it('1x0=0', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.zero));
              x.mul(y).assertEquals(new UInt32(Field.zero));
            });
          }).not.toThrow();
        });

        it('1000x1000=1000000', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              x.mul(y).assertEquals(new UInt32(Field(1000000)));
            });
          }).not.toThrow();
        });

        it('MAXINTx1=MAXINT', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.mul(y).assertEquals(UInt32.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on overflow multiplication', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => new UInt32(Field(2)));
              x.mul(y);
            });
          }).toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(2)));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.div(y).assertEquals(new UInt32(Field(2)));
            });
          }).not.toThrow();
        });

        it('0/1=0', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.zero));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.div(y).assertEquals(new UInt32(Field.zero));
            });
          }).not.toThrow();
        });

        it('2000/1000=2', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(2000)));
              const y = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              x.div(y).assertEquals(new UInt32(Field(2)));
            });
          }).not.toThrow();
        });

        it('MAXINT/1=MAXINT', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.div(y).assertEquals(UInt32.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on division by zero', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => new UInt32(Field.zero));
              x.div(y);
            });
          }).toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.mod(y).assertEquals(new UInt32(Field.zero));
            });
          }).not.toThrow();
        });

        it('500%32=20', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(500)));
              const y = Circuit.witness(UInt32, () => new UInt32(Field(32)));
              x.mod(y).assertEquals(new UInt32(Field(20)));
            });
          }).not.toThrow();
        });

        it('MAXINT%7=3', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => new UInt32(Field(7)));
              x.mod(y).assertEquals(new UInt32(Field(3)));
            });
          }).not.toThrow();
        });

        it('should throw on mod by zero', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => new UInt32(Field.zero));
              x.mod(y).assertEquals(new UInt32(Field.one));
            });
          }).toThrow();
        });
      });

      describe('assertLt', () => {
        it('1<2=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field(2)));
              x.assertLt(y);
            });
          }).not.toThrow();
        });

        it('1<1=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.assertLt(y);
            });
          }).toThrow();
        });

        it('2<1=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(2)));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.assertLt(y);
            });
          }).toThrow();
        });

        it('1000<100000=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Circuit.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              x.assertLt(y);
            });
          }).not.toThrow();
        });

        it('100000<1000=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              const y = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              x.assertLt(y);
            });
          }).toThrow();
        });

        it('MAXINT<MAXINT=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => UInt32.MAXINT());
              x.assertLt(y);
            });
          }).toThrow();
        });
      });

      describe('assertLte', () => {
        it('1<=1=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.assertLte(y);
            });
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(2)));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.assertLte(y);
            });
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Circuit.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              x.assertLte(y);
            });
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              const y = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              x.assertLte(y);
            });
          }).toThrow();
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => UInt32.MAXINT());
              x.assertLte(y);
            });
          }).not.toThrow();
        });
      });

      describe('assertGt', () => {
        it('2>1=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(2)));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.assertGt(y);
            });
          }).not.toThrow();
        });

        it('1>1=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.assertGt(y);
            });
          }).toThrow();
        });

        it('1>2=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field(2)));
              x.assertGt(y);
            });
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              const y = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              x.assertGt(y);
            });
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Circuit.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              x.assertGt(y);
            });
          }).toThrow();
        });

        it('MAXINT>MAXINT=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => UInt32.MAXINT());
              x.assertGt(y);
            });
          }).toThrow();
        });
      });

      describe('assertGte', () => {
        it('1<=1=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
              x.assertGte(y);
            });
          }).not.toThrow();
        });

        it('1>=2=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field.one));
              const y = Circuit.witness(UInt32, () => new UInt32(Field(2)));
              x.assertGte(y);
            });
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              const y = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              x.assertGte(y);
            });
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Circuit.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              x.assertGte(y);
            });
          }).toThrow();
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(() => {
            Circuit.runAndCheck(() => {
              const x = Circuit.witness(UInt32, () => UInt32.MAXINT());
              const y = Circuit.witness(UInt32, () => UInt32.MAXINT());
              x.assertGte(y);
            });
          }).not.toThrow();
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field.one', () => {
            expect(() => {
              Circuit.runAndCheck(() => {
                const x = Circuit.witness(UInt32, () => UInt32.fromNumber(1));
                const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
                x.assertEquals(y);
              });
            }).not.toThrow();
          });

          it('should be the same as 2^53-1', () => {
            expect(() => {
              Circuit.runAndCheck(() => {
                const x = Circuit.witness(UInt32, () =>
                  UInt32.fromNumber(NUMBERMAX)
                );
                const y = Circuit.witness(
                  UInt32,
                  () => new UInt32(Field(String(NUMBERMAX)))
                );
                x.assertEquals(y);
              });
            }).not.toThrow();
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field.one', () => {
            expect(() => {
              Circuit.runAndCheck(() => {
                const x = Circuit.witness(UInt32, () => UInt32.fromString('1'));
                const y = Circuit.witness(UInt32, () => new UInt32(Field.one));
                x.assertEquals(y);
              });
            }).not.toThrow();
          });

          it('should be the same as 2^53-1', () => {
            expect(() => {
              Circuit.runAndCheck(() => {
                const x = Circuit.witness(UInt32, () =>
                  UInt32.fromString(String(NUMBERMAX))
                );
                const y = Circuit.witness(
                  UInt32,
                  () => new UInt32(Field(String(NUMBERMAX)))
                );
                x.assertEquals(y);
              });
            }).not.toThrow();
          });
        });
      });
    });

    describe('Outside of circuit', () => {
      describe('add', () => {
        it('1+1=2', () => {
          expect(new UInt32(Field.one).add(1).toString()).toEqual('2');
        });

        it('5000+5000=10000', () => {
          expect(new UInt32(Field(5000)).add(5000).toString()).toEqual('10000');
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const value = Field((((1n << 32n) - 2n) / 2n).toString());
          expect(
            new UInt32(value)
              .add(new UInt32(value))
              .add(new UInt32(Field.one))
              .toString()
          ).toEqual(UInt32.MAXINT().toString());
        });

        it('should throw on overflow addition', () => {
          expect(() => {
            UInt32.MAXINT().add(1);
          }).toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', () => {
          expect(new UInt32(Field.one).sub(1).toString()).toEqual('0');
        });

        it('10000-5000=5000', () => {
          expect(new UInt32(Field(10000)).sub(5000).toString()).toEqual('5000');
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            UInt32.fromNumber(0).sub(1);
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(new UInt32(Field.one).mul(2).toString()).toEqual('2');
        });

        it('1x0=0', () => {
          expect(new UInt32(Field.one).mul(0).toString()).toEqual('0');
        });

        it('1000x1000=1000000', () => {
          expect(new UInt32(Field(1000)).mul(1000).toString()).toEqual(
            '1000000'
          );
        });

        it('MAXINTx1=MAXINT', () => {
          expect(UInt32.MAXINT().mul(1).toString()).toEqual(
            UInt32.MAXINT().toString()
          );
        });

        it('should throw on overflow multiplication', () => {
          expect(() => {
            UInt32.MAXINT().mul(2);
          }).toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', () => {
          expect(new UInt32(Field(2)).div(1).toString()).toEqual('2');
        });

        it('0/1=0', () => {
          expect(new UInt32(Field.zero).div(1).toString()).toEqual('0');
        });

        it('2000/1000=2', () => {
          expect(new UInt32(Field(2000)).div(1000).toString()).toEqual('2');
        });

        it('MAXINT/1=MAXINT', () => {
          expect(UInt32.MAXINT().div(1).toString()).toEqual(
            UInt32.MAXINT().toString()
          );
        });

        it('should throw on division by zero', () => {
          expect(() => {
            UInt32.MAXINT().div(0);
          }).toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', () => {
          expect(new UInt32(Field.one).mod(1).toString()).toEqual('0');
        });

        it('500%32=20', () => {
          expect(new UInt32(Field(500)).mod(32).toString()).toEqual('20');
        });

        it('MAXINT%7=3', () => {
          expect(UInt32.MAXINT().mod(7).toString()).toEqual('3');
        });

        it('should throw on mod by zero', () => {
          expect(() => {
            UInt32.MAXINT().mod(0);
          }).toThrow();
        });
      });

      describe('lt', () => {
        it('1<2=true', () => {
          expect(new UInt32(Field.one).lt(new UInt32(Field(2)))).toEqual(
            Bool(true)
          );
        });

        it('1<1=false', () => {
          expect(new UInt32(Field.one).lt(new UInt32(Field.one))).toEqual(
            Bool(false)
          );
        });

        it('2<1=false', () => {
          expect(new UInt32(Field(2)).lt(new UInt32(Field.one))).toEqual(
            Bool(false)
          );
        });

        it('1000<100000=true', () => {
          expect(new UInt32(Field(1000)).lt(new UInt32(Field(100000)))).toEqual(
            Bool(true)
          );
        });

        it('100000<1000=false', () => {
          expect(new UInt32(Field(100000)).lt(new UInt32(Field(1000)))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT<MAXINT=false', () => {
          expect(UInt32.MAXINT().lt(UInt32.MAXINT())).toEqual(Bool(false));
        });
      });

      describe('lte', () => {
        it('1<=1=true', () => {
          expect(new UInt32(Field.one).lte(new UInt32(Field.one))).toEqual(
            Bool(true)
          );
        });

        it('2<=1=false', () => {
          expect(new UInt32(Field(2)).lte(new UInt32(Field.one))).toEqual(
            Bool(false)
          );
        });

        it('1000<=100000=true', () => {
          expect(
            new UInt32(Field(1000)).lte(new UInt32(Field(100000)))
          ).toEqual(Bool(true));
        });

        it('100000<=1000=false', () => {
          expect(
            new UInt32(Field(100000)).lte(new UInt32(Field(1000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(UInt32.MAXINT().lte(UInt32.MAXINT())).toEqual(Bool(true));
        });
      });

      describe('assertLte', () => {
        it('1<=1=true', () => {
          expect(() => {
            new UInt32(Field.one).assertLte(new UInt32(Field.one));
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            new UInt32(Field(2)).assertLte(new UInt32(Field.one));
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            new UInt32(Field(1000)).assertLte(new UInt32(Field(100000)));
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            new UInt32(Field(100000)).assertLte(new UInt32(Field(1000)));
          }).toThrow();
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(() => {
            UInt32.MAXINT().assertLte(UInt32.MAXINT());
          }).not.toThrow();
        });
      });

      describe('gt', () => {
        it('2>1=true', () => {
          expect(new UInt32(Field(2)).gt(new UInt32(Field.one))).toEqual(
            Bool(true)
          );
        });

        it('1>1=false', () => {
          expect(new UInt32(Field.one).gt(new UInt32(Field.one))).toEqual(
            Bool(false)
          );
        });

        it('1>2=false', () => {
          expect(new UInt32(Field.one).gt(new UInt32(Field(2)))).toEqual(
            Bool(false)
          );
        });

        it('100000>1000=true', () => {
          expect(new UInt32(Field(100000)).gt(new UInt32(Field(1000)))).toEqual(
            Bool(true)
          );
        });

        it('1000>100000=false', () => {
          expect(new UInt32(Field(1000)).gt(new UInt32(Field(100000)))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT>MAXINT=false', () => {
          expect(UInt32.MAXINT().gt(UInt32.MAXINT())).toEqual(Bool(false));
        });
      });

      describe('assertGt', () => {
        it('1>1=false', () => {
          expect(() => {
            new UInt32(Field.one).assertGt(new UInt32(Field.one));
          }).toThrow();
        });

        it('2>1=true', () => {
          expect(() => {
            new UInt32(Field(2)).assertGt(new UInt32(Field.one));
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            new UInt32(Field(1000)).assertGt(new UInt32(Field(100000)));
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            new UInt32(Field(100000)).assertGt(new UInt32(Field(1000)));
          }).not.toThrow();
        });

        it('MAXINT>MAXINT=false', () => {
          expect(() => {
            UInt32.MAXINT().assertGt(UInt32.MAXINT());
          }).toThrow();
        });
      });

      describe('gte', () => {
        it('2>=1=true', () => {
          expect(new UInt32(Field(2)).gte(new UInt32(Field.one))).toEqual(
            Bool(true)
          );
        });

        it('1>=1=true', () => {
          expect(new UInt32(Field.one).gte(new UInt32(Field.one))).toEqual(
            Bool(true)
          );
        });

        it('1>=2=false', () => {
          expect(new UInt32(Field.one).gte(new UInt32(Field(2)))).toEqual(
            Bool(false)
          );
        });

        it('100000>=1000=true', () => {
          expect(
            new UInt32(Field(100000)).gte(new UInt32(Field(1000)))
          ).toEqual(Bool(true));
        });

        it('1000>=100000=false', () => {
          expect(
            new UInt32(Field(1000)).gte(new UInt32(Field(100000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(UInt32.MAXINT().gte(UInt32.MAXINT())).toEqual(Bool(true));
        });
      });

      describe('assertGte', () => {
        it('1>=1=true', () => {
          expect(() => {
            new UInt32(Field.one).assertGte(new UInt32(Field.one));
          }).not.toThrow();
        });

        it('2>=1=true', () => {
          expect(() => {
            new UInt32(Field(2)).assertGte(new UInt32(Field.one));
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            new UInt32(Field(1000)).assertGte(new UInt32(Field(100000)));
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            new UInt32(Field(100000)).assertGte(new UInt32(Field(1000)));
          }).not.toThrow();
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(() => {
            UInt32.MAXINT().assertGte(UInt32.MAXINT());
          }).not.toThrow();
        });
      });

      describe('toString()', () => {
        it('should be the same as Field.zero', async () => {
          const x = new UInt32(Field.zero);
          const y = Field.zero;
          expect(x.toString()).toEqual(y.toString());
        });
        it('should be the same as 2^32-1', async () => {
          const x = new UInt32(Field(String(NUMBERMAX)));
          const y = Field(String(NUMBERMAX));
          expect(x.toString()).toEqual(y.toString());
        });
      });

      describe('check()', () => {
        it('should pass checking a MAXINT', () => {
          expect(() => {
            UInt32.check(UInt32.MAXINT());
          }).not.toThrow();
        });

        it('should throw checking over MAXINT', () => {
          const x = new UInt32(Field((1n << 32n).toString())); // This number is defined in UInt32.MAXINT()
          expect(() => {
            UInt32.check(x);
          }).toThrow();
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field.one', () => {
            const x = UInt32.fromNumber(1);
            expect(x.value).toEqual(new UInt32(Field.one).value);
          });

          it('should be the same as 2^53-1', () => {
            const x = UInt32.fromNumber(NUMBERMAX);
            expect(x.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field.one', () => {
            const x = UInt32.fromString('1');
            expect(x.value).toEqual(new UInt32(Field.one).value);
          });

          it('should be the same as 2^53-1', () => {
            const x = UInt32.fromString(String(NUMBERMAX));
            expect(x.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
      });
    });
  });
});
