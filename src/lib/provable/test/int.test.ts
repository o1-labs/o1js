import {
  Provable,
  Int64,
  UInt64,
  UInt32,
  UInt8,
  Field,
  Bool,
  Sign,
} from 'o1js';

describe('int', () => {
  const NUMBERMAX = 2 ** 53 - 1; //  JavaScript numbers can only safely store integers in the range -(2^53 − 1) to 2^53 − 1

  describe('Int64', () => {
    describe('toString', () => {
      it('should be the same as Field(0)', async () => {
        const int = Int64.create(UInt64.zero, Sign.one);
        const field = Field(0);
        expect(int.toString()).toEqual(field.toString());
      });

      it('should be -1', async () => {
        const int = Int64.create(UInt64.one).neg();
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
        expect(Int64.create(UInt64.zero, Sign.one)).toEqual(
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
          Int64.from(100).mul(UInt64.from(1n << 100n));
        }).toThrow();
      });

      // TODO - should we make these throw?
      // These are edge cases, where one of two inputs is out of the Int64 range,
      // but the result of an operation with a proper Int64 moves it into the range.
      // They would only get caught if we'd also check the range in the Int64 / UInt64 constructors,
      // which breaks out current practice of having a dumb constructor that only stores variables
      it.skip('operations should throw on overflow of any input', () => {
        expect(() => {
          Int64.create(new UInt64(1n << 64n)).sub(1);
        }).toThrow();
        expect(() => {
          Int64.create(new UInt64(-(1n << 64n))).add(5);
        }).toThrow();
        expect(() => {
          Int64.from(20).sub(new UInt64((1n << 64n) + 10n));
        }).toThrow();
        expect(() => {
          Int64.from(6).add(new UInt64(-(1n << 64n) - 5n));
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
        it('1+1=2', async () => {
          await Provable.runAndCheck(() => {
            const x = Provable.witness(UInt64, () => new UInt64(1));
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.add(y).assertEquals(new UInt64(2));
          });
        });

        it('5000+5000=10000', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(5000));
            const y = Provable.witness(UInt64, () => new UInt64(5000));
            x.add(y).assertEquals(new UInt64(10000));
          });
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', async () => {
          const n = ((1n << 64n) - 2n) / 2n;
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(n));
            const y = Provable.witness(UInt64, () => new UInt64(n));
            x.add(y).add(1).assertEquals(UInt64.MAXINT());
          });
        });

        it('should throw on overflow addition', async () => {
          await expect(
            Provable.runAndCheck(() => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(1));
              x.add(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1));
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.sub(y).assertEquals(new UInt64(0));
          });
        });

        it('10000-5000=5000', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(10000));
            const y = Provable.witness(UInt64, () => new UInt64(5000));
            x.sub(y).assertEquals(new UInt64(5000));
          });
        });

        it('should throw on sub if results in negative number', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(0));
              const y = Provable.witness(UInt64, () => new UInt64(1));
              x.sub(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1));
            const y = Provable.witness(UInt64, () => new UInt64(2));
            x.mul(y).assertEquals(new UInt64(2));
          });
        });

        it('1x0=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1));
            const y = Provable.witness(UInt64, () => new UInt64(0));
            x.mul(y).assertEquals(new UInt64(0));
          });
        });

        it('1000x1000=1000000', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1000));
            const y = Provable.witness(UInt64, () => new UInt64(1000));
            x.mul(y).assertEquals(new UInt64(1000000));
          });
        });

        it('MAXINTx1=MAXINT', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => UInt64.MAXINT());
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.mul(y).assertEquals(UInt64.MAXINT());
          });
        });

        it('should throw on overflow multiplication', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(2));
              x.mul(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(2));
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.div(y).assertEquals(new UInt64(2));
          });
        });

        it('0/1=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(0));
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.div(y).assertEquals(new UInt64(0));
          });
        });

        it('2000/1000=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(2000));
            const y = Provable.witness(UInt64, () => new UInt64(1000));
            x.div(y).assertEquals(new UInt64(2));
          });
        });

        it('MAXINT/1=MAXINT', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => UInt64.MAXINT());
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.div(y).assertEquals(UInt64.MAXINT());
          });
        });

        it('should throw on division by zero', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(0));
              x.div(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1));
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.mod(y).assertEquals(new UInt64(0));
          });
        });

        it('500%32=20', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(500));
            const y = Provable.witness(UInt64, () => new UInt64(32));
            x.mod(y).assertEquals(new UInt64(20));
          });
        });

        it('MAXINT%7=1', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => UInt64.MAXINT());
            const y = Provable.witness(UInt64, () => new UInt64(7));
            x.mod(y).assertEquals(new UInt64(1));
          });
        });

        it('should throw on mod by zero', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => new UInt64(0));
              x.mod(y).assertEquals(new UInt64(1));
            })
          ).rejects.toThrow();
        });
      });

      describe('assertLt', () => {
        it('1<2=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1));
            const y = Provable.witness(UInt64, () => new UInt64(2));
            x.assertLessThan(y);
          });
        });

        it('1<1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(1));
              const y = Provable.witness(UInt64, () => new UInt64(1));
              x.assertLessThan(y);
            })
          ).rejects.toThrow();
        });

        it('2<1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(2));
              const y = Provable.witness(UInt64, () => new UInt64(1));
              x.assertLessThan(y);
            })
          ).rejects.toThrow();
        });

        it('1000<100000=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1000));
            const y = Provable.witness(UInt64, () => new UInt64(100000));
            x.assertLessThan(y);
          });
        });

        it('100000<1000=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(100000));
              const y = Provable.witness(UInt64, () => new UInt64(1000));
              x.assertLessThan(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT<MAXINT=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => UInt64.MAXINT());
              x.assertLessThan(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('assertLte', () => {
        it('1<=1=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1));
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.assertLessThanOrEqual(y);
          });
        });

        it('2<=1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(2));
              const y = Provable.witness(UInt64, () => new UInt64(1));
              x.assertLessThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('1000<=100000=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1000));
            const y = Provable.witness(UInt64, () => new UInt64(100000));
            x.assertLessThanOrEqual(y);
          });
        });

        it('100000<=1000=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(100000));
              const y = Provable.witness(UInt64, () => new UInt64(1000));
              x.assertLessThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT<=MAXINT=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => UInt64.MAXINT());
            const y = Provable.witness(UInt64, () => UInt64.MAXINT());
            x.assertLessThanOrEqual(y);
          });
        });
      });

      describe('assertGreaterThan', () => {
        it('2>1=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(2));
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.assertGreaterThan(y);
          });
        });

        it('1>1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(1));
              const y = Provable.witness(UInt64, () => new UInt64(1));
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });

        it('1>2=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(1));
              const y = Provable.witness(UInt64, () => new UInt64(2));
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });

        it('100000>1000=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(100000));
            const y = Provable.witness(UInt64, () => new UInt64(1000));
            x.assertGreaterThan(y);
          });
        });

        it('1000>100000=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(1000));
              const y = Provable.witness(UInt64, () => new UInt64(100000));
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT>MAXINT=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => UInt64.MAXINT());
              const y = Provable.witness(UInt64, () => UInt64.MAXINT());
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('assertGreaterThanOrEqual', () => {
        it('1<=1=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(1));
            const y = Provable.witness(UInt64, () => new UInt64(1));
            x.assertGreaterThanOrEqual(y);
          });
        });

        it('1>=2=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(1));
              const y = Provable.witness(UInt64, () => new UInt64(2));
              x.assertGreaterThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('100000>=1000=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => new UInt64(100000));
            const y = Provable.witness(UInt64, () => new UInt64(1000));
            x.assertGreaterThanOrEqual(y);
          });
        });

        it('1000>=100000=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => new UInt64(1000));
              const y = Provable.witness(UInt64, () => new UInt64(100000));
              x.assertGreaterThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT>=MAXINT=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt64, () => UInt64.MAXINT());
            const y = Provable.witness(UInt64, () => UInt64.MAXINT());
            x.assertGreaterThanOrEqual(y);
          });
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field(1)', async () => {
            await Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => UInt64.from(1));
              const y = Provable.witness(UInt64, () => new UInt64(1));
              x.assertEquals(y);
            });
          });

          it('should be the same as 2^53-1', async () => {
            await Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => UInt64.from(NUMBERMAX));
              const y = Provable.witness(
                UInt64,
                () => new UInt64(String(NUMBERMAX))
              );
              x.assertEquals(y);
            });
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field(1)', async () => {
            await Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () => UInt64.from('1'));
              const y = Provable.witness(UInt64, () => new UInt64(1));
              x.assertEquals(y);
            });
          });

          it('should be the same as 2^53-1', async () => {
            await Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt64, () =>
                UInt64.from(String(NUMBERMAX))
              );
              const y = Provable.witness(
                UInt64,
                () => new UInt64(String(NUMBERMAX))
              );
              x.assertEquals(y);
            });
          });
        });
      });
    });

    describe('Outside of circuit', () => {
      describe('add', () => {
        it('1+1=2', () => {
          expect(new UInt64(1).add(1).toString()).toEqual('2');
        });

        it('5000+5000=10000', () => {
          expect(new UInt64(5000).add(5000).toString()).toEqual('10000');
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const value = ((1n << 64n) - 2n) / 2n;
          expect(
            new UInt64(value)
              .add(new UInt64(value))
              .add(new UInt64(1))
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
          expect(new UInt64(1).sub(1).toString()).toEqual('0');
        });

        it('10000-5000=5000', () => {
          expect(new UInt64(10000).sub(5000).toString()).toEqual('5000');
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            UInt64.from(0).sub(1);
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(new UInt64(1).mul(2).toString()).toEqual('2');
        });

        it('1x0=0', () => {
          expect(new UInt64(1).mul(0).toString()).toEqual('0');
        });

        it('1000x1000=1000000', () => {
          expect(new UInt64(1000).mul(1000).toString()).toEqual('1000000');
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
          expect(new UInt64(2).div(1).toString()).toEqual('2');
        });

        it('0/1=0', () => {
          expect(new UInt64(0).div(1).toString()).toEqual('0');
        });

        it('2000/1000=2', () => {
          expect(new UInt64(2000).div(1000).toString()).toEqual('2');
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
          expect(new UInt64(1).mod(1).toString()).toEqual('0');
        });

        it('500%32=20', () => {
          expect(new UInt64(500).mod(32).toString()).toEqual('20');
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
          expect(new UInt64(1).lessThan(new UInt64(2))).toEqual(Bool(true));
        });

        it('1<1=false', () => {
          expect(new UInt64(1).lessThan(new UInt64(1))).toEqual(Bool(false));
        });

        it('2<1=false', () => {
          expect(new UInt64(2).lessThan(new UInt64(1))).toEqual(Bool(false));
        });

        it('1000<100000=true', () => {
          expect(new UInt64(1000).lessThan(new UInt64(100000))).toEqual(
            Bool(true)
          );
        });

        it('100000<1000=false', () => {
          expect(new UInt64(100000).lessThan(new UInt64(1000))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT<MAXINT=false', () => {
          expect(UInt64.MAXINT().lessThan(UInt64.MAXINT())).toEqual(
            Bool(false)
          );
        });
      });

      describe('lte', () => {
        it('1<=1=true', () => {
          expect(new UInt64(1).lessThanOrEqual(new UInt64(1))).toEqual(
            Bool(true)
          );
        });

        it('2<=1=false', () => {
          expect(new UInt64(2).lessThanOrEqual(new UInt64(1))).toEqual(
            Bool(false)
          );
        });

        it('1000<=100000=true', () => {
          expect(new UInt64(1000).lessThanOrEqual(new UInt64(100000))).toEqual(
            Bool(true)
          );
        });

        it('100000<=1000=false', () => {
          expect(new UInt64(100000).lessThanOrEqual(new UInt64(1000))).toEqual(
            Bool(false)
          );
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
            new UInt64(1).assertLessThanOrEqual(new UInt64(1));
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            new UInt64(2).assertLessThanOrEqual(new UInt64(1));
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            new UInt64(1000).assertLessThanOrEqual(new UInt64(100000));
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            new UInt64(100000).assertLessThanOrEqual(new UInt64(1000));
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
          expect(new UInt64(2).greaterThan(new UInt64(1))).toEqual(Bool(true));
        });

        it('1>1=false', () => {
          expect(new UInt64(1).greaterThan(new UInt64(1))).toEqual(Bool(false));
        });

        it('1>2=false', () => {
          expect(new UInt64(1).greaterThan(new UInt64(2))).toEqual(Bool(false));
        });

        it('100000>1000=true', () => {
          expect(new UInt64(100000).greaterThan(new UInt64(1000))).toEqual(
            Bool(true)
          );
        });

        it('1000>100000=false', () => {
          expect(new UInt64(1000).greaterThan(new UInt64(100000))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT>MAXINT=false', () => {
          expect(UInt64.MAXINT().greaterThan(UInt64.MAXINT())).toEqual(
            Bool(false)
          );
        });
      });

      describe('greaterThanOrEqual', () => {
        it('2>=1=true', () => {
          expect(new UInt64(2).greaterThanOrEqual(new UInt64(1))).toEqual(
            Bool(true)
          );
        });

        it('1>=1=true', () => {
          expect(new UInt64(1).greaterThanOrEqual(new UInt64(1))).toEqual(
            Bool(true)
          );
        });

        it('1>=2=false', () => {
          expect(new UInt64(1).greaterThanOrEqual(new UInt64(2))).toEqual(
            Bool(false)
          );
        });

        it('100000>=1000=true', () => {
          expect(
            new UInt64(100000).greaterThanOrEqual(new UInt64(1000))
          ).toEqual(Bool(true));
        });

        it('1000>=100000=false', () => {
          expect(
            new UInt64(1000).greaterThanOrEqual(new UInt64(100000))
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
            new UInt64(1).assertGreaterThan(new UInt64(1));
          }).toThrow();
        });

        it('2>1=true', () => {
          expect(() => {
            new UInt64(2).assertGreaterThan(new UInt64(1));
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            new UInt64(1000).assertGreaterThan(new UInt64(100000));
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            new UInt64(100000).assertGreaterThan(new UInt64(1000));
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
            new UInt64(1).assertGreaterThanOrEqual(new UInt64(1));
          }).not.toThrow();
        });

        it('2>=1=true', () => {
          expect(() => {
            new UInt64(2).assertGreaterThanOrEqual(new UInt64(1));
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            new UInt64(1000).assertGreaterThanOrEqual(new UInt64(100000));
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            new UInt64(100000).assertGreaterThanOrEqual(new UInt64(1000));
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
          const uint64 = new UInt64(0);
          const field = Field(0);
          expect(uint64.toString()).toEqual(field.toString());
        });
        it('should be the same as 2^53-1', async () => {
          const uint64 = new UInt64(String(NUMBERMAX));
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
          const aboveMax = new UInt64(1);
          aboveMax.value = Field(1n << 64n);
          expect(() => {
            UInt64.check(aboveMax);
          }).toThrow();
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field(1)', () => {
            const uint = UInt64.from(1);
            expect(uint.value).toEqual(new UInt64(1).value);
          });

          it('should be the same as 2^53-1', () => {
            const uint = UInt64.from(NUMBERMAX);
            expect(uint.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field(1)', () => {
            const uint = UInt64.from('1');
            expect(uint.value).toEqual(new UInt64(1).value);
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
        it('1+1=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.add(y).assertEquals(new UInt32(2));
          });
        });

        it('5000+5000=10000', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(5000));
            const y = Provable.witness(UInt32, () => new UInt32(5000));
            x.add(y).assertEquals(new UInt32(10000));
          });
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', async () => {
          const n = ((1n << 32n) - 2n) / 2n;
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(n));
            const y = Provable.witness(UInt32, () => new UInt32(n));
            x.add(y).add(1).assertEquals(UInt32.MAXINT());
          });
        });

        it('should throw on overflow addition', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(1));
              x.add(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.sub(y).assertEquals(new UInt32(0));
          });
        });

        it('10000-5000=5000', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(10000));
            const y = Provable.witness(UInt32, () => new UInt32(5000));
            x.sub(y).assertEquals(new UInt32(5000));
          });
        });

        it('should throw on sub if results in negative number', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => new UInt32(0));
              const y = Provable.witness(UInt32, () => new UInt32(1));
              x.sub(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1));
            const y = Provable.witness(UInt32, () => new UInt32(2));
            x.mul(y).assertEquals(new UInt32(2));
          });
        });

        it('1x0=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1));
            const y = Provable.witness(UInt32, () => new UInt32(0));
            x.mul(y).assertEquals(new UInt32(0));
          });
        });

        it('1000x1000=1000000', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1000));
            const y = Provable.witness(UInt32, () => new UInt32(1000));
            x.mul(y).assertEquals(new UInt32(1000000));
          });
        });

        it('MAXINTx1=MAXINT', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => UInt32.MAXINT());
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.mul(y).assertEquals(UInt32.MAXINT());
          });
        });

        it('should throw on overflow multiplication', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(2));
              x.mul(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(2));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.div(y).assertEquals(new UInt32(2));
          });
        });

        it('0/1=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(0));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.div(y).assertEquals(new UInt32(0));
          });
        });

        it('2000/1000=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(2000));
            const y = Provable.witness(UInt32, () => new UInt32(1000));
            x.div(y).assertEquals(new UInt32(2));
          });
        });

        it('MAXINT/1=MAXINT', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => UInt32.MAXINT());
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.div(y).assertEquals(UInt32.MAXINT());
          });
        });

        it('should throw on division by zero', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(0));
              x.div(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.mod(y).assertEquals(new UInt32(0));
          });
        });

        it('500%32=20', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(500));
            const y = Provable.witness(UInt32, () => new UInt32(32));
            x.mod(y).assertEquals(new UInt32(20));
          });
        });

        it('MAXINT%7=3', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => UInt32.MAXINT());
            const y = Provable.witness(UInt32, () => new UInt32(7));
            x.mod(y).assertEquals(new UInt32(3));
          });
        });

        it('should throw on mod by zero', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => new UInt32(0));
              x.mod(y).assertEquals(new UInt32(1));
            })
          ).rejects.toThrow();
        });
      });

      describe('assertLt', () => {
        it('1<2=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1));
            const y = Provable.witness(UInt32, () => new UInt32(2));
            x.assertLessThan(y);
          });
        });

        it('1<1=false', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.assertLessThan(y);
          }).catch(() => {});
        });

        it('2<1=false', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(2));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.assertLessThan(y);
          }).catch(() => {});
        });

        it('1000<100000=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1000));
            const y = Provable.witness(UInt32, () => new UInt32(100000));
            x.assertLessThan(y);
          });
        });

        it('100000<1000=false', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(100000));
            const y = Provable.witness(UInt32, () => new UInt32(1000));
            x.assertLessThan(y);
          }).catch(() => {});
        });

        it('MAXINT<MAXINT=false', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => UInt32.MAXINT());
            const y = Provable.witness(UInt32, () => UInt32.MAXINT());
            x.assertLessThan(y);
          }).catch(() => {});
        });
      });

      describe('assertLessThanOrEqual', () => {
        it('1<=1=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.assertLessThanOrEqual(y);
          });
        });

        it('2<=1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => new UInt32(2));
              const y = Provable.witness(UInt32, () => new UInt32(1));
              x.assertLessThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('1000<=100000=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1000));
            const y = Provable.witness(UInt32, () => new UInt32(100000));
            x.assertLessThanOrEqual(y);
          });
        });

        it('100000<=1000=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => new UInt32(100000));
              const y = Provable.witness(UInt32, () => new UInt32(1000));
              x.assertLessThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT<=MAXINT=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => UInt32.MAXINT());
            const y = Provable.witness(UInt32, () => UInt32.MAXINT());
            x.assertLessThanOrEqual(y);
          });
        });
      });

      describe('assertGreaterThan', () => {
        it('2>1=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(2));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.assertGreaterThan(y);
          });
        });

        it('1>1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => new UInt32(1));
              const y = Provable.witness(UInt32, () => new UInt32(1));
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });

        it('1>2=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => new UInt32(1));
              const y = Provable.witness(UInt32, () => new UInt32(2));
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });

        it('100000>1000=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(100000));
            const y = Provable.witness(UInt32, () => new UInt32(1000));
            x.assertGreaterThan(y);
          });
        });

        it('1000>100000=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => new UInt32(1000));
              const y = Provable.witness(UInt32, () => new UInt32(100000));
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT>MAXINT=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => UInt32.MAXINT());
              const y = Provable.witness(UInt32, () => UInt32.MAXINT());
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('assertGreaterThanOrEqual', () => {
        it('1<=1=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(1));
            const y = Provable.witness(UInt32, () => new UInt32(1));
            x.assertGreaterThanOrEqual(y);
          });
        });

        it('1>=2=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => new UInt32(1));
              const y = Provable.witness(UInt32, () => new UInt32(2));
              x.assertGreaterThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('100000>=1000=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => new UInt32(100000));
            const y = Provable.witness(UInt32, () => new UInt32(1000));
            x.assertGreaterThanOrEqual(y);
          });
        });

        it('1000>=100000=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => new UInt32(1000));
              const y = Provable.witness(UInt32, () => new UInt32(100000));
              x.assertGreaterThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT>=MAXINT=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt32, () => UInt32.MAXINT());
            const y = Provable.witness(UInt32, () => UInt32.MAXINT());
            x.assertGreaterThanOrEqual(y);
          });
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field(1)', async () => {
            await Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => UInt32.from(1));
              const y = Provable.witness(UInt32, () => new UInt32(1));
              x.assertEquals(y);
            });
          });

          it('should be the same as 2^53-1', async () => {
            await Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => UInt32.from(NUMBERMAX));
              const y = Provable.witness(
                UInt32,
                () => new UInt32(String(NUMBERMAX))
              );
              x.assertEquals(y);
            });
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field(1)', async () => {
            await Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () => UInt32.from('1'));
              const y = Provable.witness(UInt32, () => new UInt32(1));
              x.assertEquals(y);
            });
          });

          it('should be the same as 2^53-1', async () => {
            await Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt32, () =>
                UInt32.from(String(NUMBERMAX))
              );
              const y = Provable.witness(
                UInt32,
                () => new UInt32(String(NUMBERMAX))
              );
              x.assertEquals(y);
            });
          });
        });
      });
    });

    describe('Outside of circuit', () => {
      describe('add', () => {
        it('1+1=2', () => {
          expect(new UInt32(1).add(1).toString()).toEqual('2');
        });

        it('5000+5000=10000', () => {
          expect(new UInt32(5000).add(5000).toString()).toEqual('10000');
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const value = ((1n << 32n) - 2n) / 2n;
          expect(
            new UInt32(value)
              .add(new UInt32(value))
              .add(new UInt32(1))
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
          expect(new UInt32(1).sub(1).toString()).toEqual('0');
        });

        it('10000-5000=5000', () => {
          expect(new UInt32(10000).sub(5000).toString()).toEqual('5000');
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            UInt32.from(0).sub(1);
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(new UInt32(1).mul(2).toString()).toEqual('2');
        });

        it('1x0=0', () => {
          expect(new UInt32(1).mul(0).toString()).toEqual('0');
        });

        it('1000x1000=1000000', () => {
          expect(new UInt32(1000).mul(1000).toString()).toEqual('1000000');
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
          expect(new UInt32(2).div(1).toString()).toEqual('2');
        });

        it('0/1=0', () => {
          expect(new UInt32(0).div(1).toString()).toEqual('0');
        });

        it('2000/1000=2', () => {
          expect(new UInt32(2000).div(1000).toString()).toEqual('2');
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
          expect(new UInt32(1).mod(1).toString()).toEqual('0');
        });

        it('500%32=20', () => {
          expect(new UInt32(500).mod(32).toString()).toEqual('20');
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
          expect(new UInt32(1).lessThan(new UInt32(2))).toEqual(Bool(true));
        });

        it('1<1=false', () => {
          expect(new UInt32(1).lessThan(new UInt32(1))).toEqual(Bool(false));
        });

        it('2<1=false', () => {
          expect(new UInt32(2).lessThan(new UInt32(1))).toEqual(Bool(false));
        });

        it('1000<100000=true', () => {
          expect(new UInt32(1000).lessThan(new UInt32(100000))).toEqual(
            Bool(true)
          );
        });

        it('100000<1000=false', () => {
          expect(new UInt32(100000).lessThan(new UInt32(1000))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT<MAXINT=false', () => {
          expect(UInt32.MAXINT().lessThan(UInt32.MAXINT())).toEqual(
            Bool(false)
          );
        });
      });

      describe('lessThanOrEqual', () => {
        it('1<=1=true', () => {
          expect(new UInt32(1).lessThanOrEqual(new UInt32(1))).toEqual(
            Bool(true)
          );
        });

        it('2<=1=false', () => {
          expect(new UInt32(2).lessThanOrEqual(new UInt32(1))).toEqual(
            Bool(false)
          );
        });

        it('1000<=100000=true', () => {
          expect(new UInt32(1000).lessThanOrEqual(new UInt32(100000))).toEqual(
            Bool(true)
          );
        });

        it('100000<=1000=false', () => {
          expect(new UInt32(100000).lessThanOrEqual(new UInt32(1000))).toEqual(
            Bool(false)
          );
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
            new UInt32(1).assertLessThanOrEqual(new UInt32(1));
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            new UInt32(2).assertLessThanOrEqual(new UInt32(1));
          }).toThrow();
        });

        it('1000<=100000=true', () => {
          expect(() => {
            new UInt32(1000).assertLessThanOrEqual(new UInt32(100000));
          }).not.toThrow();
        });

        it('100000<=1000=false', () => {
          expect(() => {
            new UInt32(100000).assertLessThanOrEqual(new UInt32(1000));
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
          expect(new UInt32(2).greaterThan(new UInt32(1))).toEqual(Bool(true));
        });

        it('1>1=false', () => {
          expect(new UInt32(1).greaterThan(new UInt32(1))).toEqual(Bool(false));
        });

        it('1>2=false', () => {
          expect(new UInt32(1).greaterThan(new UInt32(2))).toEqual(Bool(false));
        });

        it('100000>1000=true', () => {
          expect(new UInt32(100000).greaterThan(new UInt32(1000))).toEqual(
            Bool(true)
          );
        });

        it('1000>100000=false', () => {
          expect(new UInt32(1000).greaterThan(new UInt32(100000))).toEqual(
            Bool(false)
          );
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
            new UInt32(1).assertGreaterThan(new UInt32(1));
          }).toThrow();
        });

        it('2>1=true', () => {
          expect(() => {
            new UInt32(2).assertGreaterThan(new UInt32(1));
          }).not.toThrow();
        });

        it('1000>100000=false', () => {
          expect(() => {
            new UInt32(1000).assertGreaterThan(new UInt32(100000));
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            new UInt32(100000).assertGreaterThan(new UInt32(1000));
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
          expect(new UInt32(2).greaterThanOrEqual(new UInt32(1))).toEqual(
            Bool(true)
          );
        });

        it('1>=1=true', () => {
          expect(new UInt32(1).greaterThanOrEqual(new UInt32(1))).toEqual(
            Bool(true)
          );
        });

        it('1>=2=false', () => {
          expect(new UInt32(1).greaterThanOrEqual(new UInt32(2))).toEqual(
            Bool(false)
          );
        });

        it('100000>=1000=true', () => {
          expect(
            new UInt32(100000).greaterThanOrEqual(new UInt32(1000))
          ).toEqual(Bool(true));
        });

        it('1000>=100000=false', () => {
          expect(
            new UInt32(1000).greaterThanOrEqual(new UInt32(100000))
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
            new UInt32(1).assertGreaterThanOrEqual(new UInt32(1));
          }).not.toThrow();
        });

        it('2>=1=true', () => {
          expect(() => {
            new UInt32(2).assertGreaterThanOrEqual(new UInt32(1));
          }).not.toThrow();
        });

        it('1000>=100000=false', () => {
          expect(() => {
            new UInt32(1000).assertGreaterThanOrEqual(new UInt32(100000));
          }).toThrow();
        });

        it('100000>=1000=true', () => {
          expect(() => {
            new UInt32(100000).assertGreaterThanOrEqual(new UInt32(1000));
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
          const x = new UInt32(0);
          const y = Field(0);
          expect(x.toString()).toEqual(y.toString());
        });
        it('should be the same as 2^32-1', async () => {
          const x = new UInt32(String(NUMBERMAX));
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
          const aboveMax = new UInt32(1);
          aboveMax.value = Field(1n << 32n);
          expect(() => {
            UInt32.check(aboveMax);
          }).toThrow();
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field(1)', () => {
            const x = UInt32.from(1);
            expect(x.value).toEqual(new UInt32(1).value);
          });

          it('should be the same as 2^53-1', () => {
            const x = UInt32.from(NUMBERMAX);
            expect(x.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
        describe('fromString()', () => {
          it('should be the same as Field(1)', () => {
            const x = UInt32.from('1');
            expect(x.value).toEqual(new UInt32(1).value);
          });

          it('should be the same as 2^53-1', () => {
            const x = UInt32.from(String(NUMBERMAX));
            expect(x.value).toEqual(Field(String(NUMBERMAX)));
          });
        });
      });
    });
  });

  describe('UInt8', () => {
    const NUMBERMAX = UInt8.MAXINT().value;

    describe('Inside circuit', () => {
      describe('add', () => {
        it('1+1=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(1));
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.add(y).assertEquals(2);
          });
        });

        it('100+100=200', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(100));
            const y = Provable.witness(UInt8, () => new UInt8(100));
            x.add(y).assertEquals(new UInt8(200));
          });
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', async () => {
          const n = ((1n << 8n) - 2n) / 2n;
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(n));
            const y = Provable.witness(UInt8, () => new UInt8(n));
            x.add(y).add(1).assertEquals(UInt8.MAXINT());
          });
        });

        it('should throw on overflow addition', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => UInt8.MAXINT());
              const y = Provable.witness(UInt8, () => new UInt8(1));
              x.add(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(1));
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.sub(y).assertEquals(new UInt8(0));
          });
        });

        it('100-50=50', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(100));
            const y = Provable.witness(UInt8, () => new UInt8(50));
            x.sub(y).assertEquals(new UInt8(50));
          });
        });

        it('should throw on sub if results in negative number', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(0));
              const y = Provable.witness(UInt8, () => new UInt8(1));
              x.sub(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(1));
            const y = Provable.witness(UInt8, () => new UInt8(2));
            x.mul(y).assertEquals(new UInt8(2));
          });
        });

        it('1x0=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(1));
            const y = Provable.witness(UInt8, () => new UInt8(0));
            x.mul(y).assertEquals(new UInt8(0));
          });
        });

        it('12x20=240', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(12));
            const y = Provable.witness(UInt8, () => new UInt8(20));
            x.mul(y).assertEquals(new UInt8(240));
          });
        });

        it('MAXINTx1=MAXINT', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => UInt8.MAXINT());
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.mul(y).assertEquals(UInt8.MAXINT());
          });
        });

        it('should throw on overflow multiplication', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => UInt8.MAXINT());
              const y = Provable.witness(UInt8, () => new UInt8(2));
              x.mul(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(2));
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.div(y).assertEquals(new UInt8(2));
          });
        });

        it('0/1=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(0));
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.div(y).assertEquals(new UInt8(0));
          });
        });

        it('20/10=2', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(20));
            const y = Provable.witness(UInt8, () => new UInt8(10));
            x.div(y).assertEquals(new UInt8(2));
          });
        });

        it('MAXINT/1=MAXINT', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => UInt8.MAXINT());
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.div(y).assertEquals(UInt8.MAXINT());
          });
        });

        it('should throw on division by zero', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => UInt8.MAXINT());
              const y = Provable.witness(UInt8, () => new UInt8(0));
              x.div(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(1));
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.mod(y).assertEquals(new UInt8(0));
          });
        });

        it('50%32=18', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(50));
            const y = Provable.witness(UInt8, () => new UInt8(32));
            x.mod(y).assertEquals(new UInt8(18));
          });
        });

        it('MAXINT%7=3', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => UInt8.MAXINT());
            const y = Provable.witness(UInt8, () => new UInt8(7));
            x.mod(y).assertEquals(new UInt8(3));
          });
        });

        it('should throw on mod by zero', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => UInt8.MAXINT());
              const y = Provable.witness(UInt8, () => new UInt8(0));
              x.mod(y).assertEquals(new UInt8(1));
            })
          ).rejects.toThrow();
        });
      });

      describe('assertLt', () => {
        it('1<2=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(1));
            const y = Provable.witness(UInt8, () => new UInt8(2));
            x.assertLessThan(y);
          });
        });

        it('1<1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(1));
              const y = Provable.witness(UInt8, () => new UInt8(1));
              x.assertLessThan(y);
            })
          ).rejects.toThrow();
        });

        it('2<1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(2));
              const y = Provable.witness(UInt8, () => new UInt8(1));
              x.assertLessThan(y);
            })
          ).rejects.toThrow();
        });

        it('10<100=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(10));
            const y = Provable.witness(UInt8, () => new UInt8(100));
            x.assertLessThan(y);
          });
        });

        it('100<10=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(100));
              const y = Provable.witness(UInt8, () => new UInt8(10));
              x.assertLessThan(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT<MAXINT=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => UInt8.MAXINT());
              const y = Provable.witness(UInt8, () => UInt8.MAXINT());
              x.assertLessThan(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('assertLessThanOrEqual', () => {
        it('1<=1=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(1));
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.assertLessThanOrEqual(y);
          });
        });

        it('2<=1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(2));
              const y = Provable.witness(UInt8, () => new UInt8(1));
              x.assertLessThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('10<=100=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(10));
            const y = Provable.witness(UInt8, () => new UInt8(100));
            x.assertLessThanOrEqual(y);
          });
        });

        it('100<=10=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(100));
              const y = Provable.witness(UInt8, () => new UInt8(10));
              x.assertLessThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT<=MAXINT=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => UInt8.MAXINT());
            const y = Provable.witness(UInt8, () => UInt8.MAXINT());
            x.assertLessThanOrEqual(y);
          });
        });
      });

      describe('assertGreaterThan', () => {
        it('2>1=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(2));
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.assertGreaterThan(y);
          });
        });

        it('1>1=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(1));
              const y = Provable.witness(UInt8, () => new UInt8(1));
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });

        it('1>2=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(1));
              const y = Provable.witness(UInt8, () => new UInt8(2));
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });

        it('100>10=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(100));
            const y = Provable.witness(UInt8, () => new UInt8(10));
            x.assertGreaterThan(y);
          });
        });

        it('10>100=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(1000));
              const y = Provable.witness(UInt8, () => new UInt8(100000));
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT>MAXINT=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => UInt8.MAXINT());
              const y = Provable.witness(UInt8, () => UInt8.MAXINT());
              x.assertGreaterThan(y);
            })
          ).rejects.toThrow();
        });
      });

      describe('assertGreaterThanOrEqual', () => {
        it('1<=1=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(1));
            const y = Provable.witness(UInt8, () => new UInt8(1));
            x.assertGreaterThanOrEqual(y);
          });
        });

        it('1>=2=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(1));
              const y = Provable.witness(UInt8, () => new UInt8(2));
              x.assertGreaterThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('100>=10=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => new UInt8(100));
            const y = Provable.witness(UInt8, () => new UInt8(10));
            x.assertGreaterThanOrEqual(y);
          });
        });

        it('10>=100=false', async () => {
          await expect(
            Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => new UInt8(10));
              const y = Provable.witness(UInt8, () => new UInt8(100));
              x.assertGreaterThanOrEqual(y);
            })
          ).rejects.toThrow();
        });

        it('MAXINT>=MAXINT=true', async () => {
          await Provable.runAndCheck(async () => {
            const x = Provable.witness(UInt8, () => UInt8.MAXINT());
            const y = Provable.witness(UInt8, () => UInt8.MAXINT());
            x.assertGreaterThanOrEqual(y);
          });
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field(1)', async () => {
            await Provable.runAndCheck(async () => {
              const x = Provable.witness(UInt8, () => UInt8.from(1));
              const y = Provable.witness(UInt8, () => new UInt8(1));
              x.assertEquals(y);
            });
          });
        });
      });
    });

    describe('Outside of circuit', () => {
      describe('add', () => {
        it('1+1=2', () => {
          expect(new UInt8(1).add(1).toString()).toEqual('2');
        });

        it('50+50=100', () => {
          expect(new UInt8(50).add(50).toString()).toEqual('100');
        });

        it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
          const value = ((1n << 8n) - 2n) / 2n;
          expect(
            new UInt8(value).add(new UInt8(value)).add(new UInt8(1)).toString()
          ).toEqual(UInt8.MAXINT().toString());
        });

        it('should throw on overflow addition', () => {
          expect(() => {
            UInt8.MAXINT().add(1);
          }).toThrow();
        });
      });

      describe('sub', () => {
        it('1-1=0', () => {
          expect(new UInt8(1).sub(1).toString()).toEqual('0');
        });

        it('100-50=50', () => {
          expect(new UInt8(100).sub(50).toString()).toEqual('50');
        });

        it('should throw on sub if results in negative number', () => {
          expect(() => {
            UInt8.from(0).sub(1);
          }).toThrow();
        });
      });

      describe('mul', () => {
        it('1x2=2', () => {
          expect(new UInt8(1).mul(2).toString()).toEqual('2');
        });

        it('1x0=0', () => {
          expect(new UInt8(1).mul(0).toString()).toEqual('0');
        });

        it('12x20=240', () => {
          expect(new UInt8(12).mul(20).toString()).toEqual('240');
        });

        it('MAXINTx1=MAXINT', () => {
          expect(UInt8.MAXINT().mul(1).toString()).toEqual(
            UInt8.MAXINT().toString()
          );
        });

        it('should throw on overflow multiplication', () => {
          expect(() => {
            UInt8.MAXINT().mul(2);
          }).toThrow();
        });
      });

      describe('div', () => {
        it('2/1=2', () => {
          expect(new UInt8(2).div(1).toString()).toEqual('2');
        });

        it('0/1=0', () => {
          expect(new UInt8(0).div(1).toString()).toEqual('0');
        });

        it('20/10=2', () => {
          expect(new UInt8(20).div(10).toString()).toEqual('2');
        });

        it('MAXINT/1=MAXINT', () => {
          expect(UInt8.MAXINT().div(1).toString()).toEqual(
            UInt8.MAXINT().toString()
          );
        });

        it('should throw on division by zero', () => {
          expect(() => {
            UInt8.MAXINT().div(0);
          }).toThrow();
        });
      });

      describe('mod', () => {
        it('1%1=0', () => {
          expect(new UInt8(1).mod(1).toString()).toEqual('0');
        });

        it('50%32=18', () => {
          expect(new UInt8(50).mod(32).toString()).toEqual('18');
        });

        it('MAXINT%7=3', () => {
          expect(UInt8.MAXINT().mod(7).toString()).toEqual('3');
        });

        it('should throw on mod by zero', () => {
          expect(() => {
            UInt8.MAXINT().mod(0);
          }).toThrow();
        });
      });

      describe('lessThan', () => {
        it('1<2=true', () => {
          expect(new UInt8(1).lessThan(new UInt8(2))).toEqual(Bool(true));
        });

        it('1<1=false', () => {
          expect(new UInt8(1).lessThan(new UInt8(1))).toEqual(Bool(false));
        });

        it('2<1=false', () => {
          expect(new UInt8(2).lessThan(new UInt8(1))).toEqual(Bool(false));
        });

        it('10<100=true', () => {
          expect(new UInt8(10).lessThan(new UInt8(100))).toEqual(Bool(true));
        });

        it('100<10=false', () => {
          expect(new UInt8(100).lessThan(new UInt8(10))).toEqual(Bool(false));
        });

        it('MAXINT<MAXINT=false', () => {
          expect(UInt8.MAXINT().lessThan(UInt8.MAXINT())).toEqual(Bool(false));
        });
      });

      describe('lessThanOrEqual', () => {
        it('1<=1=true', () => {
          expect(new UInt8(1).lessThanOrEqual(new UInt8(1))).toEqual(
            Bool(true)
          );
        });

        it('2<=1=false', () => {
          expect(new UInt8(2).lessThanOrEqual(new UInt8(1))).toEqual(
            Bool(false)
          );
        });

        it('10<=100=true', () => {
          expect(new UInt8(10).lessThanOrEqual(new UInt8(100))).toEqual(
            Bool(true)
          );
        });

        it('100<=10=false', () => {
          expect(new UInt8(100).lessThanOrEqual(new UInt8(10))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(UInt8.MAXINT().lessThanOrEqual(UInt8.MAXINT())).toEqual(
            Bool(true)
          );
        });
      });

      describe('assertLessThanOrEqual', () => {
        it('1<=1=true', () => {
          expect(() => {
            new UInt8(1).assertLessThanOrEqual(new UInt8(1));
          }).not.toThrow();
        });

        it('2<=1=false', () => {
          expect(() => {
            new UInt8(2).assertLessThanOrEqual(new UInt8(1));
          }).toThrow();
        });

        it('10<=100=true', () => {
          expect(() => {
            new UInt8(10).assertLessThanOrEqual(new UInt8(100));
          }).not.toThrow();
        });

        it('100<=10=false', () => {
          expect(() => {
            new UInt8(100).assertLessThanOrEqual(new UInt8(10));
          }).toThrow();
        });

        it('MAXINT<=MAXINT=true', () => {
          expect(() => {
            UInt8.MAXINT().assertLessThanOrEqual(UInt8.MAXINT());
          }).not.toThrow();
        });
      });

      describe('greaterThan', () => {
        it('2>1=true', () => {
          expect(new UInt8(2).greaterThan(new UInt8(1))).toEqual(Bool(true));
        });

        it('1>1=false', () => {
          expect(new UInt8(1).greaterThan(new UInt8(1))).toEqual(Bool(false));
        });

        it('1>2=false', () => {
          expect(new UInt8(1).greaterThan(new UInt8(2))).toEqual(Bool(false));
        });

        it('100>10=true', () => {
          expect(new UInt8(100).greaterThan(new UInt8(10))).toEqual(Bool(true));
        });

        it('10>100=false', () => {
          expect(new UInt8(10).greaterThan(new UInt8(100))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT>MAXINT=false', () => {
          expect(UInt8.MAXINT().greaterThan(UInt8.MAXINT())).toEqual(
            Bool(false)
          );
        });
      });

      describe('assertGreaterThan', () => {
        it('1>1=false', () => {
          expect(() => {
            new UInt8(1).assertGreaterThan(new UInt8(1));
          }).toThrow();
        });

        it('2>1=true', () => {
          expect(() => {
            new UInt8(2).assertGreaterThan(new UInt8(1));
          }).not.toThrow();
        });

        it('10>100=false', () => {
          expect(() => {
            new UInt8(10).assertGreaterThan(new UInt8(100));
          }).toThrow();
        });

        it('100000>1000=true', () => {
          expect(() => {
            new UInt8(100).assertGreaterThan(new UInt8(10));
          }).not.toThrow();
        });

        it('MAXINT>MAXINT=false', () => {
          expect(() => {
            UInt8.MAXINT().assertGreaterThan(UInt8.MAXINT());
          }).toThrow();
        });
      });

      describe('greaterThanOrEqual', () => {
        it('2>=1=true', () => {
          expect(new UInt8(2).greaterThanOrEqual(new UInt8(1))).toEqual(
            Bool(true)
          );
        });

        it('1>=1=true', () => {
          expect(new UInt8(1).greaterThanOrEqual(new UInt8(1))).toEqual(
            Bool(true)
          );
        });

        it('1>=2=false', () => {
          expect(new UInt8(1).greaterThanOrEqual(new UInt8(2))).toEqual(
            Bool(false)
          );
        });

        it('100>=10=true', () => {
          expect(new UInt8(100).greaterThanOrEqual(new UInt8(10))).toEqual(
            Bool(true)
          );
        });

        it('10>=100=false', () => {
          expect(new UInt8(10).greaterThanOrEqual(new UInt8(100))).toEqual(
            Bool(false)
          );
        });

        it('MAXINT>=MAXINT=true', () => {
          expect(UInt8.MAXINT().greaterThanOrEqual(UInt8.MAXINT())).toEqual(
            Bool(true)
          );
        });
      });

      describe('assertGreaterThanOrEqual', () => {
        it('1>=1=true', () => {
          expect(() => {
            new UInt8(1).assertGreaterThanOrEqual(new UInt8(1));
          }).not.toThrow();
        });

        it('2>=1=true', () => {
          expect(() => {
            new UInt8(2).assertGreaterThanOrEqual(new UInt8(1));
          }).not.toThrow();
        });

        it('10>=100=false', () => {
          expect(() => {
            new UInt8(10).assertGreaterThanOrEqual(new UInt8(100));
          }).toThrow();
        });

        it('100>=10=true', () => {
          expect(() => {
            new UInt8(100).assertGreaterThanOrEqual(new UInt8(10));
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
          const x = new UInt8(0);
          const y = Field(0);
          expect(x.toString()).toEqual(y.toString());
        });
        it('should be the same as 2^8-1', async () => {
          const x = new UInt8(NUMBERMAX.toBigInt());
          const y = Field(String(NUMBERMAX));
          expect(x.toString()).toEqual(y.toString());
        });
      });

      describe('check()', () => {
        it('should pass checking a MAXINT', () => {
          expect(() => {
            UInt8.check(UInt8.MAXINT());
          }).not.toThrow();
        });

        it('should throw checking over MAXINT', () => {
          const x = UInt8.MAXINT();
          expect(() => {
            UInt8.check(x.add(1));
          }).toThrow();
        });
      });

      describe('from() ', () => {
        describe('fromNumber()', () => {
          it('should be the same as Field(1)', () => {
            const x = UInt8.from(1);
            expect(x.value).toEqual(Field(1));
          });

          it('should be the same as 2^53-1', () => {
            const x = UInt8.from(NUMBERMAX);
            expect(x.value).toEqual(NUMBERMAX);
          });
        });
      });
    });
  });
});
