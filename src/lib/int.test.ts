import {
  isReady,
  Provable,
  shutdown,
  Int64,
  UInt64,
  UInt32,
  Field,
  Bool,
  Sign,
} from 'o1js';

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
      it('should be the same as Field(0)', async () => {
        const int = new Int64(UInt64.zero, Sign.one);
        const field = Field(0);
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
      it('should be the same as Field(0)', async () => {
        expect(Int64.zero.magnitude.value).toEqual(Field(0));
      });
    });

    describe('fromUnsigned', () => {
      it('should be the same as UInt64.zero', async () => {
        expect(new Int64(UInt64.zero, Sign.one)).toEqual(
          Int64.fromUnsigned(UInt64.zero)
        );
      });

      it('should be the same as UInt64.MAXINT', async () => {
        expect(Int64.from((1n << 64n) - 1n)).toEqual(
          Int64.fromUnsigned(UInt64.MAXINT())
        );
      });
    });

    describe('neg', () => {
      it('neg(1)=-1', () => {
        const int = Int64.one;
        expect(int.neg().toField()).toEqual(Field(-1));
      });
      it('neg(2^53-1)=-2^53-1', () => {
        const int = Int64.from(NUMBERMAX);
        expect(int.neg().toString()).toEqual(`${-NUMBERMAX}`);
      });
    });

    describe('add', () => {
      it('1+1=2', () => {
        expect(Int64.one.add(Int64.from('1')).toString()).toEqual('2');
      });

      it('5000+(-4000)=1000', () => {
        expect(
          Int64.from(5000)
            .add(Int64.fromField(Field(-4000)))
            .toString()
        ).toEqual('1000');
      });

      it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
        const value = ((1n << 64n) - 2n) / 2n;
        expect(
          Int64.from(value).add(Int64.from(value)).add(Int64.one).toString()
        ).toEqual(UInt64.MAXINT().toString());
      });

      it('should throw on overflow', () => {
        expect(() => {
          Int64.from(1n << 64n);
        }).toThrow();
        expect(() => {
          Int64.from(-(1n << 64n));
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
          Int64.from((1n << 64n) - 1n).add(Int64.zero);
        }).not.toThrow();
      });
    });

    describe('sub', () => {
      it('1-1=0', () => {
        expect(Int64.one.sub(Int64.from(1)).toString()).toEqual('0');
      });

      it('10000-5000=5000', () => {
        expect(
          Int64.fromField(Field(10000)).sub(Int64.from('5000')).toString()
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
      it('toFields(1) should be the same as [Field(1), Field(1)]', () => {
        expect(Int64.toFields(Int64.one)).toEqual([Field(1), Field(1)]);
      });

      it('toFields(2^53-1) should be the same as Field(2^53-1)', () => {
        expect(Int64.toFields(Int64.from(NUMBERMAX))).toEqual([
          Field(String(NUMBERMAX)),
          Field(1),
        ]);
      });
    });
    describe('fromFields', () => {
      it('fromFields([1, 1]) should be the same as Int64.one', () => {
        expect(Int64.fromFields([Field(1), Field(1)])).toEqual(Int64.one);
      });

      it('fromFields(2^53-1) should be the same as Field(2^53-1)', () => {
        expect(Int64.fromFields([Field(String(NUMBERMAX)), Field(1)])).toEqual(
          Int64.from(NUMBERMAX)
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
          .mul(UInt32.from(2))
          .mul(UInt64.from(2));
        expect(`${x}`).toBe('64');

        // 64 * (-64) === -64**2
        let y = Int64.from(-64);
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
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.add(y).assertEquals(new UInt64(Field(2)));
            });
          }).not.toThrow();
        });

        it('5000+5000=10000', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(5000)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(5000)));
              x.add(y).assertEquals(new UInt64(Field(10000)));
            });
          }).not.toThrow();
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const n = Field((((1n << 64n) - 2n) / 2n).toString());
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(n));
              const y = Provable.witness(UInt64, () => new UInt64(n));
              x.add(y).add(1).assertEquals(UInt64.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on overflow addition', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.add(y);
            });
          }).toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.sub(y).assertEquals(new UInt64(Field(0)));
            });
          }).not.toThrow();
        });

        it('10000-5000=5000', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt64,
                () => new UInt64(Field(10000))
              );
              const y = Provable.witness(UInt64, () => new UInt64(Field(5000)));
              x.sub(y).assertEquals(new UInt64(Field(5000)));
            });
          }).not.toThrow();
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(0)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.sub(y);
            });
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(2)));
              x.mul(y).assertEquals(new UInt64(Field(2)));
            });
          }).not.toThrow();
        });

        it('1x0=0', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(0)));
              x.mul(y).assertEquals(new UInt64(Field(0)));
            });
          }).not.toThrow();
        });

        it('1000x1000=1000000', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              x.mul(y).assertEquals(new UInt64(Field(1000000)));
            });
          }).not.toThrow();
        });

        it('MAXINTx1=MAXINT', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.mul(y).assertEquals(UInt64.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on overflow multiplication', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(Field(2)));
              x.mul(y);
            });
          }).toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(2)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.div(y).assertEquals(new UInt64(Field(2)));
            });
          }).not.toThrow();
        });

        it('0/1=0', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(0)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.div(y).assertEquals(new UInt64(Field(0)));
            });
          }).not.toThrow();
        });

        it('2000/1000=2', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(2000)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              x.div(y).assertEquals(new UInt64(Field(2)));
            });
          }).not.toThrow();
        });

        it('MAXINT/1=MAXINT', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.div(y).assertEquals(UInt64.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on division by zero', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(Field(0)));
              x.div(y);
            });
          }).toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.mod(y).assertEquals(new UInt64(Field(0)));
            });
          }).not.toThrow();
        });

        it('500%32=20', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(500)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(32)));
              x.mod(y).assertEquals(new UInt64(Field(20)));
            });
          }).not.toThrow();
        });

        it('MAXINT%7=1', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(Field(7)));
              x.mod(y).assertEquals(new UInt64(Field(1)));
            });
          }).not.toThrow();
        });

        it('should throw on mod by zero', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(Field(0)));
              x.mod(y).assertEquals(new UInt64(Field(1)));
            });
          }).toThrow();
        });
      });

      describe('assertLt', () => {
        it('1<2=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(2)));
              x.assertLessThan(y);
            });
          }).not.toThrow();
        });

        it('1<1=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.assertLessThan(y);
            });
          }).toThrow();
        });

        it('2<1=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(2)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.assertLessThan(y);
            });
          }).toThrow();
        });

        it('1000<100000=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Provable.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              x.assertLessThan(y);
            });
          }).not.toThrow();
        });

        it('100000<1000=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              const y = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              x.assertLessThan(y);
            });
          }).toThrow();
        });

        it('MAXINT<MAXINT=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => UInt64.MAXINT());
              x.assertLessThan(y);
            });
          }).toThrow();
        });
      });

      describe('assertLte', () => {
        it('1<=1=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.assertLessThanOrEqual(y);
            });
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(2)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.assertLessThanOrEqual(y);
            });
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Provable.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              x.assertLessThanOrEqual(y);
            });
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              const y = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              x.assertLessThanOrEqual(y);
            });
          }).toThrow();
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => UInt64.MAXINT());
              x.assertLessThanOrEqual(y);
            });
          }).not.toThrow();
        });
      });

      describe('assertGreaterThan', () => {
        it('2>1=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(2)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.assertGreaterThan(y);
            });
          }).not.toThrow();
        });

        it('1>1=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.assertGreaterThan(y);
            });
          }).toThrow();
        });

        it('1>2=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(2)));
              x.assertGreaterThan(y);
            });
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              const y = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              x.assertGreaterThan(y);
            });
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Provable.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              x.assertGreaterThan(y);
            });
          }).toThrow();
        });

        it('MAXINT>MAXINT=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => UInt64.MAXINT());
              x.assertGreaterThan(y);
            });
          }).toThrow();
        });
      });

      describe('assertGreaterThanOrEqual', () => {
        it('1<=1=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
              x.assertGreaterThanOrEqual(y);
            });
          }).not.toThrow();
        });

        it('1>=2=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1)));
              const y = Provable.witness(UInt64, () => new UInt64(Field(2)));
              x.assertGreaterThanOrEqual(y);
            });
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              const y = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              x.assertGreaterThanOrEqual(y);
            });
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => new UInt64(Field(1000)));
              const y = Provable.witness(
                UInt64,
                () => new UInt64(Field(100000))
              );
              x.assertGreaterThanOrEqual(y);
            });
          }).toThrow();
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => UInt64.MAXINT());
              x.assertGreaterThanOrEqual(y);
            });
          }).not.toThrow();
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field(1)', () => {
            expect(() => {
              Provable.runAndCheck(() => {
                const x = Provable.witness(UInt64, () => UInt64.from(1));
                const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
                x.assertEquals(y);
              });
            }).not.toThrow();
          });

          it('should be the same as 2^53-1', () => {
            expect(() => {
              Provable.runAndCheck(() => {
                const x = Provable.witness(UInt64, () =>
                  UInt64.from(NUMBERMAX)
                );
                const y = Provable.witness(
                  UInt64,
                  () => new UInt64(Field(String(NUMBERMAX)))
                );
                x.assertEquals(y);
              });
            }).not.toThrow();
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field(1)', () => {
            expect(() => {
              Provable.runAndCheck(() => {
                const x = Provable.witness(UInt64, () => UInt64.from('1'));
                const y = Provable.witness(UInt64, () => new UInt64(Field(1)));
                x.assertEquals(y);
              });
            }).not.toThrow();
          });

          it('should be the same as 2^53-1', () => {
            expect(() => {
              Provable.runAndCheck(() => {
                const x = Provable.witness(UInt64, () =>
                  UInt64.from(String(NUMBERMAX))
                );
                const y = Provable.witness(
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
          expect(new UInt64(Field(1)).add(1).toString()).toEqual('2');
        });

        it('5000+5000=10000', () => {
          expect(new UInt64(Field(5000)).add(5000).toString()).toEqual('10000');
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const value = Field((((1n << 64n) - 2n) / 2n).toString());
          expect(
            new UInt64(value)
              .add(new UInt64(value))
              .add(new UInt64(Field(1)))
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
          expect(new UInt64(Field(1)).sub(1).toString()).toEqual('0');
        });

        it('10000-5000=5000', () => {
          expect(new UInt64(Field(10000)).sub(5000).toString()).toEqual('5000');
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            UInt64.from(0).sub(1);
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(new UInt64(Field(1)).mul(2).toString()).toEqual('2');
        });

        it('1x0=0', () => {
          expect(new UInt64(Field(1)).mul(0).toString()).toEqual('0');
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
          expect(new UInt64(Field(0)).div(1).toString()).toEqual('0');
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
          expect(new UInt64(Field(1)).mod(1).toString()).toEqual('0');
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
          expect(new UInt64(Field(1)).lessThan(new UInt64(Field(2)))).toEqual(
            Bool(true)
          );
        });

        it('1<1=false', () => {
          expect(new UInt64(Field(1)).lessThan(new UInt64(Field(1)))).toEqual(
            Bool(false)
          );
        });

        it('2<1=false', () => {
          expect(new UInt64(Field(2)).lessThan(new UInt64(Field(1)))).toEqual(
            Bool(false)
          );
        });

        it('1000<100000=true', () => {
          expect(
            new UInt64(Field(1000)).lessThan(new UInt64(Field(100000)))
          ).toEqual(Bool(true));
        });

        it('100000<1000=false', () => {
          expect(
            new UInt64(Field(100000)).lessThan(new UInt64(Field(1000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT<MAXINT=false', () => {
          expect(UInt64.MAXINT().lessThan(UInt64.MAXINT())).toEqual(
            Bool(false)
          );
        });
      });

      describe('lte', () => {
        it('1<=1=true', () => {
          expect(
            new UInt64(Field(1)).lessThanOrEqual(new UInt64(Field(1)))
          ).toEqual(Bool(true));
        });

        it('2<=1=false', () => {
          expect(
            new UInt64(Field(2)).lessThanOrEqual(new UInt64(Field(1)))
          ).toEqual(Bool(false));
        });

        it('1000<=100000=true', () => {
          expect(
            new UInt64(Field(1000)).lessThanOrEqual(new UInt64(Field(100000)))
          ).toEqual(Bool(true));
        });

        it('100000<=1000=false', () => {
          expect(
            new UInt64(Field(100000)).lessThanOrEqual(new UInt64(Field(1000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(UInt64.MAXINT().lessThanOrEqual(UInt64.MAXINT())).toEqual(
            Bool(true)
          );
        });
      });

      describe('assertLessThanOrEqual', () => {
        it('1<=1=true', () => {
          expect(() => {
            new UInt64(Field(1)).assertLessThanOrEqual(new UInt64(Field(1)));
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            new UInt64(Field(2)).assertLessThanOrEqual(new UInt64(Field(1)));
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            new UInt64(Field(1000)).assertLessThanOrEqual(
              new UInt64(Field(100000))
            );
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            new UInt64(Field(100000)).assertLessThanOrEqual(
              new UInt64(Field(1000))
            );
          }).toThrow();
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(() => {
            UInt64.MAXINT().assertLessThanOrEqual(UInt64.MAXINT());
          }).not.toThrow();
        });
      });

      describe('greaterThan', () => {
        it('2>1=true', () => {
          expect(
            new UInt64(Field(2)).greaterThan(new UInt64(Field(1)))
          ).toEqual(Bool(true));
        });

        it('1>1=false', () => {
          expect(
            new UInt64(Field(1)).greaterThan(new UInt64(Field(1)))
          ).toEqual(Bool(false));
        });

        it('1>2=false', () => {
          expect(
            new UInt64(Field(1)).greaterThan(new UInt64(Field(2)))
          ).toEqual(Bool(false));
        });

        it('100000>1000=true', () => {
          expect(
            new UInt64(Field(100000)).greaterThan(new UInt64(Field(1000)))
          ).toEqual(Bool(true));
        });

        it('1000>100000=false', () => {
          expect(
            new UInt64(Field(1000)).greaterThan(new UInt64(Field(100000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT>MAXINT=false', () => {
          expect(UInt64.MAXINT().greaterThan(UInt64.MAXINT())).toEqual(
            Bool(false)
          );
        });
      });

      describe('greaterThanOrEqual', () => {
        it('2>=1=true', () => {
          expect(
            new UInt64(Field(2)).greaterThanOrEqual(new UInt64(Field(1)))
          ).toEqual(Bool(true));
        });

        it('1>=1=true', () => {
          expect(
            new UInt64(Field(1)).greaterThanOrEqual(new UInt64(Field(1)))
          ).toEqual(Bool(true));
        });

        it('1>=2=false', () => {
          expect(
            new UInt64(Field(1)).greaterThanOrEqual(new UInt64(Field(2)))
          ).toEqual(Bool(false));
        });

        it('100000>=1000=true', () => {
          expect(
            new UInt64(Field(100000)).greaterThanOrEqual(
              new UInt64(Field(1000))
            )
          ).toEqual(Bool(true));
        });

        it('1000>=100000=false', () => {
          expect(
            new UInt64(Field(1000)).greaterThanOrEqual(
              new UInt64(Field(100000))
            )
          ).toEqual(Bool(false));
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(UInt64.MAXINT().greaterThanOrEqual(UInt64.MAXINT())).toEqual(
            Bool(true)
          );
        });
      });

      describe('assertGreaterThan', () => {
        it('1>1=false', () => {
          expect(() => {
            new UInt64(Field(1)).assertGreaterThan(new UInt64(Field(1)));
          }).toThrow();
        });

        it('2>1=true', () => {
          expect(() => {
            new UInt64(Field(2)).assertGreaterThan(new UInt64(Field(1)));
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            new UInt64(Field(1000)).assertGreaterThan(
              new UInt64(Field(100000))
            );
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            new UInt64(Field(100000)).assertGreaterThan(
              new UInt64(Field(1000))
            );
          }).not.toThrow();
        });

        it('MAXINT>MAXINT=false', () => {
          expect(() => {
            UInt64.MAXINT().assertGreaterThan(UInt64.MAXINT());
          }).toThrow();
        });
      });

      describe('assertGreaterThanOrEqual', () => {
        it('1>=1=true', () => {
          expect(() => {
            new UInt64(Field(1)).assertGreaterThanOrEqual(new UInt64(Field(1)));
          }).not.toThrow();
        });

        it('2>=1=true', () => {
          expect(() => {
            new UInt64(Field(2)).assertGreaterThanOrEqual(new UInt64(Field(1)));
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            new UInt64(Field(1000)).assertGreaterThanOrEqual(
              new UInt64(Field(100000))
            );
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            new UInt64(Field(100000)).assertGreaterThanOrEqual(
              new UInt64(Field(1000))
            );
          }).not.toThrow();
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(() => {
            UInt64.MAXINT().assertGreaterThanOrEqual(UInt64.MAXINT());
          }).not.toThrow();
        });
      });

      describe('toString()', () => {
        it('should be the same as Field(0)', async () => {
          const uint64 = new UInt64(Field(0));
          const field = Field(0);
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
          it('should be the same as Field(1)', () => {
            const uint = UInt64.from(1);
            expect(uint.value).toEqual(new UInt64(Field(1)).value);
          });

          it('should be the same as 2^53-1', () => {
            const uint = UInt64.from(NUMBERMAX);
            expect(uint.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field(1)', () => {
            const uint = UInt64.from('1');
            expect(uint.value).toEqual(new UInt64(Field(1)).value);
          });

          it('should be the same as 2^53-1', () => {
            const uint = UInt64.from(String(NUMBERMAX));
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
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.add(y).assertEquals(new UInt32(Field(2)));
            });
          }).not.toThrow();
        });

        it('5000+5000=10000', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(5000)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(5000)));
              x.add(y).assertEquals(new UInt32(Field(10000)));
            });
          }).not.toThrow();
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const n = Field((((1n << 32n) - 2n) / 2n).toString());
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(n));
              const y = Provable.witness(UInt32, () => new UInt32(n));
              x.add(y).add(1).assertEquals(UInt32.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on overflow addition', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.add(y);
            });
          }).toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.sub(y).assertEquals(new UInt32(Field(0)));
            });
          }).not.toThrow();
        });

        it('10000-5000=5000', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt32,
                () => new UInt32(Field(10000))
              );
              const y = Provable.witness(UInt32, () => new UInt32(Field(5000)));
              x.sub(y).assertEquals(new UInt32(Field(5000)));
            });
          }).not.toThrow();
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(0)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.sub(y);
            });
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(2)));
              x.mul(y).assertEquals(new UInt32(Field(2)));
            });
          }).not.toThrow();
        });

        it('1x0=0', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(0)));
              x.mul(y).assertEquals(new UInt32(Field(0)));
            });
          }).not.toThrow();
        });

        it('1000x1000=1000000', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              x.mul(y).assertEquals(new UInt32(Field(1000000)));
            });
          }).not.toThrow();
        });

        it('MAXINTx1=MAXINT', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.mul(y).assertEquals(UInt32.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on overflow multiplication', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(Field(2)));
              x.mul(y);
            });
          }).toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(2)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.div(y).assertEquals(new UInt32(Field(2)));
            });
          }).not.toThrow();
        });

        it('0/1=0', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(0)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.div(y).assertEquals(new UInt32(Field(0)));
            });
          }).not.toThrow();
        });

        it('2000/1000=2', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(2000)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              x.div(y).assertEquals(new UInt32(Field(2)));
            });
          }).not.toThrow();
        });

        it('MAXINT/1=MAXINT', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.div(y).assertEquals(UInt32.MAXINT());
            });
          }).not.toThrow();
        });

        it('should throw on division by zero', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(Field(0)));
              x.div(y);
            });
          }).toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.mod(y).assertEquals(new UInt32(Field(0)));
            });
          }).not.toThrow();
        });

        it('500%32=20', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(500)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(32)));
              x.mod(y).assertEquals(new UInt32(Field(20)));
            });
          }).not.toThrow();
        });

        it('MAXINT%7=3', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(Field(7)));
              x.mod(y).assertEquals(new UInt32(Field(3)));
            });
          }).not.toThrow();
        });

        it('should throw on mod by zero', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(Field(0)));
              x.mod(y).assertEquals(new UInt32(Field(1)));
            });
          }).toThrow();
        });
      });

      describe('assertLt', () => {
        it('1<2=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(2)));
              x.assertLessThan(y);
            });
          }).not.toThrow();
        });

        it('1<1=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.assertLessThan(y);
            });
          }).toThrow();
        });

        it('2<1=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(2)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.assertLessThan(y);
            });
          }).toThrow();
        });

        it('1000<100000=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Provable.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              x.assertLessThan(y);
            });
          }).not.toThrow();
        });

        it('100000<1000=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              const y = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              x.assertLessThan(y);
            });
          }).toThrow();
        });

        it('MAXINT<MAXINT=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => UInt32.MAXINT());
              x.assertLessThan(y);
            });
          }).toThrow();
        });
      });

      describe('assertLessThanOrEqual', () => {
        it('1<=1=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.assertLessThanOrEqual(y);
            });
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(2)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.assertLessThanOrEqual(y);
            });
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Provable.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              x.assertLessThanOrEqual(y);
            });
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              const y = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              x.assertLessThanOrEqual(y);
            });
          }).toThrow();
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => UInt32.MAXINT());
              x.assertLessThanOrEqual(y);
            });
          }).not.toThrow();
        });
      });

      describe('assertGreaterThan', () => {
        it('2>1=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(2)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.assertGreaterThan(y);
            });
          }).not.toThrow();
        });

        it('1>1=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.assertGreaterThan(y);
            });
          }).toThrow();
        });

        it('1>2=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(2)));
              x.assertGreaterThan(y);
            });
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              const y = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              x.assertGreaterThan(y);
            });
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Provable.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              x.assertGreaterThan(y);
            });
          }).toThrow();
        });

        it('MAXINT>MAXINT=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => UInt32.MAXINT());
              x.assertGreaterThan(y);
            });
          }).toThrow();
        });
      });

      describe('assertGreaterThanOrEqual', () => {
        it('1<=1=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
              x.assertGreaterThanOrEqual(y);
            });
          }).not.toThrow();
        });

        it('1>=2=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1)));
              const y = Provable.witness(UInt32, () => new UInt32(Field(2)));
              x.assertGreaterThanOrEqual(y);
            });
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              const y = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              x.assertGreaterThanOrEqual(y);
            });
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => new UInt32(Field(1000)));
              const y = Provable.witness(
                UInt32,
                () => new UInt32(Field(100000))
              );
              x.assertGreaterThanOrEqual(y);
            });
          }).toThrow();
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => UInt32.MAXINT());
              x.assertGreaterThanOrEqual(y);
            });
          }).not.toThrow();
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field(1)', () => {
            expect(() => {
              Provable.runAndCheck(() => {
                const x = Provable.witness(UInt32, () => UInt32.from(1));
                const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
                x.assertEquals(y);
              });
            }).not.toThrow();
          });

          it('should be the same as 2^53-1', () => {
            expect(() => {
              Provable.runAndCheck(() => {
                const x = Provable.witness(UInt32, () =>
                  UInt32.from(NUMBERMAX)
                );
                const y = Provable.witness(
                  UInt32,
                  () => new UInt32(Field(String(NUMBERMAX)))
                );
                x.assertEquals(y);
              });
            }).not.toThrow();
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field(1)', () => {
            expect(() => {
              Provable.runAndCheck(() => {
                const x = Provable.witness(UInt32, () => UInt32.from('1'));
                const y = Provable.witness(UInt32, () => new UInt32(Field(1)));
                x.assertEquals(y);
              });
            }).not.toThrow();
          });

          it('should be the same as 2^53-1', () => {
            expect(() => {
              Provable.runAndCheck(() => {
                const x = Provable.witness(UInt32, () =>
                  UInt32.from(String(NUMBERMAX))
                );
                const y = Provable.witness(
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
          expect(new UInt32(Field(1)).add(1).toString()).toEqual('2');
        });

        it('5000+5000=10000', () => {
          expect(new UInt32(Field(5000)).add(5000).toString()).toEqual('10000');
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const value = Field((((1n << 32n) - 2n) / 2n).toString());
          expect(
            new UInt32(value)
              .add(new UInt32(value))
              .add(new UInt32(Field(1)))
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
          expect(new UInt32(Field(1)).sub(1).toString()).toEqual('0');
        });

        it('10000-5000=5000', () => {
          expect(new UInt32(Field(10000)).sub(5000).toString()).toEqual('5000');
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            UInt32.from(0).sub(1);
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(new UInt32(Field(1)).mul(2).toString()).toEqual('2');
        });

        it('1x0=0', () => {
          expect(new UInt32(Field(1)).mul(0).toString()).toEqual('0');
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
          expect(new UInt32(Field(0)).div(1).toString()).toEqual('0');
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
          expect(new UInt32(Field(1)).mod(1).toString()).toEqual('0');
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

      describe('lessThan', () => {
        it('1<2=true', () => {
          expect(new UInt32(Field(1)).lessThan(new UInt32(Field(2)))).toEqual(
            Bool(true)
          );
        });

        it('1<1=false', () => {
          expect(new UInt32(Field(1)).lessThan(new UInt32(Field(1)))).toEqual(
            Bool(false)
          );
        });

        it('2<1=false', () => {
          expect(new UInt32(Field(2)).lessThan(new UInt32(Field(1)))).toEqual(
            Bool(false)
          );
        });

        it('1000<100000=true', () => {
          expect(
            new UInt32(Field(1000)).lessThan(new UInt32(Field(100000)))
          ).toEqual(Bool(true));
        });

        it('100000<1000=false', () => {
          expect(
            new UInt32(Field(100000)).lessThan(new UInt32(Field(1000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT<MAXINT=false', () => {
          expect(UInt32.MAXINT().lessThan(UInt32.MAXINT())).toEqual(
            Bool(false)
          );
        });
      });

      describe('lessThanOrEqual', () => {
        it('1<=1=true', () => {
          expect(
            new UInt32(Field(1)).lessThanOrEqual(new UInt32(Field(1)))
          ).toEqual(Bool(true));
        });

        it('2<=1=false', () => {
          expect(
            new UInt32(Field(2)).lessThanOrEqual(new UInt32(Field(1)))
          ).toEqual(Bool(false));
        });

        it('1000<=100000=true', () => {
          expect(
            new UInt32(Field(1000)).lessThanOrEqual(new UInt32(Field(100000)))
          ).toEqual(Bool(true));
        });

        it('100000<=1000=false', () => {
          expect(
            new UInt32(Field(100000)).lessThanOrEqual(new UInt32(Field(1000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(UInt32.MAXINT().lessThanOrEqual(UInt32.MAXINT())).toEqual(
            Bool(true)
          );
        });
      });

      describe('assertLessThanOrEqual', () => {
        it('1<=1=true', () => {
          expect(() => {
            new UInt32(Field(1)).assertLessThanOrEqual(new UInt32(Field(1)));
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            new UInt32(Field(2)).assertLessThanOrEqual(new UInt32(Field(1)));
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            new UInt32(Field(1000)).assertLessThanOrEqual(
              new UInt32(Field(100000))
            );
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            new UInt32(Field(100000)).assertLessThanOrEqual(
              new UInt32(Field(1000))
            );
          }).toThrow();
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(() => {
            UInt32.MAXINT().assertLessThanOrEqual(UInt32.MAXINT());
          }).not.toThrow();
        });
      });

      describe('greaterThan', () => {
        it('2>1=true', () => {
          expect(
            new UInt32(Field(2)).greaterThan(new UInt32(Field(1)))
          ).toEqual(Bool(true));
        });

        it('1>1=false', () => {
          expect(
            new UInt32(Field(1)).greaterThan(new UInt32(Field(1)))
          ).toEqual(Bool(false));
        });

        it('1>2=false', () => {
          expect(
            new UInt32(Field(1)).greaterThan(new UInt32(Field(2)))
          ).toEqual(Bool(false));
        });

        it('100000>1000=true', () => {
          expect(
            new UInt32(Field(100000)).greaterThan(new UInt32(Field(1000)))
          ).toEqual(Bool(true));
        });

        it('1000>100000=false', () => {
          expect(
            new UInt32(Field(1000)).greaterThan(new UInt32(Field(100000)))
          ).toEqual(Bool(false));
        });

        it('MAXINT>MAXINT=false', () => {
          expect(UInt32.MAXINT().greaterThan(UInt32.MAXINT())).toEqual(
            Bool(false)
          );
        });
      });

      describe('assertGreaterThan', () => {
        it('1>1=false', () => {
          expect(() => {
            new UInt32(Field(1)).assertGreaterThan(new UInt32(Field(1)));
          }).toThrow();
        });

        it('2>1=true', () => {
          expect(() => {
            new UInt32(Field(2)).assertGreaterThan(new UInt32(Field(1)));
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            new UInt32(Field(1000)).assertGreaterThan(
              new UInt32(Field(100000))
            );
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            new UInt32(Field(100000)).assertGreaterThan(
              new UInt32(Field(1000))
            );
          }).not.toThrow();
        });

        it('MAXINT>MAXINT=false', () => {
          expect(() => {
            UInt32.MAXINT().assertGreaterThan(UInt32.MAXINT());
          }).toThrow();
        });
      });

      describe('greaterThanOrEqual', () => {
        it('2>=1=true', () => {
          expect(
            new UInt32(Field(2)).greaterThanOrEqual(new UInt32(Field(1)))
          ).toEqual(Bool(true));
        });

        it('1>=1=true', () => {
          expect(
            new UInt32(Field(1)).greaterThanOrEqual(new UInt32(Field(1)))
          ).toEqual(Bool(true));
        });

        it('1>=2=false', () => {
          expect(
            new UInt32(Field(1)).greaterThanOrEqual(new UInt32(Field(2)))
          ).toEqual(Bool(false));
        });

        it('100000>=1000=true', () => {
          expect(
            new UInt32(Field(100000)).greaterThanOrEqual(
              new UInt32(Field(1000))
            )
          ).toEqual(Bool(true));
        });

        it('1000>=100000=false', () => {
          expect(
            new UInt32(Field(1000)).greaterThanOrEqual(
              new UInt32(Field(100000))
            )
          ).toEqual(Bool(false));
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(UInt32.MAXINT().greaterThanOrEqual(UInt32.MAXINT())).toEqual(
            Bool(true)
          );
        });
      });

      describe('assertGreaterThanOrEqual', () => {
        it('1>=1=true', () => {
          expect(() => {
            new UInt32(Field(1)).assertGreaterThanOrEqual(new UInt32(Field(1)));
          }).not.toThrow();
        });

        it('2>=1=true', () => {
          expect(() => {
            new UInt32(Field(2)).assertGreaterThanOrEqual(new UInt32(Field(1)));
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            new UInt32(Field(1000)).assertGreaterThanOrEqual(
              new UInt32(Field(100000))
            );
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            new UInt32(Field(100000)).assertGreaterThanOrEqual(
              new UInt32(Field(1000))
            );
          }).not.toThrow();
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(() => {
            UInt32.MAXINT().assertGreaterThanOrEqual(UInt32.MAXINT());
          }).not.toThrow();
        });
      });

      describe('toString()', () => {
        it('should be the same as Field(0)', async () => {
          const x = new UInt32(Field(0));
          const y = Field(0);
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
          it('should be the same as Field(1)', () => {
            const x = UInt32.from(1);
            expect(x.value).toEqual(new UInt32(Field(1)).value);
          });

          it('should be the same as 2^53-1', () => {
            const x = UInt32.from(NUMBERMAX);
            expect(x.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field(1)', () => {
            const x = UInt32.from('1');
            expect(x.value).toEqual(new UInt32(Field(1)).value);
          });

          it('should be the same as 2^53-1', () => {
            const x = UInt32.from(String(NUMBERMAX));
            expect(x.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
      });
    });
  });
});
