import {
  shutdown,
  isReady,
  Int64,
  UInt64,
  UInt32,
  Field,
  Bool,
} from '../../dist/server';

describe('int', () => {
  beforeAll(async () => {
    await isReady;
  });

  afterAll(async () => {
    setTimeout(async () => {
      await shutdown();
    }, 1500);
  });

  const NUMBERMAX = 2 ** 53 - 1; //  JavaScript numbers can only safely store integers in the range -(2^53 − 1) to 2^53 − 1

  describe('Int64', () => {
    describe('toString', () => {
      it('should be the same as Field.zero', async () => {
        const int = new Int64(Field.zero);
        const field = Field.zero;
        expect(int.toString()).toEqual(field.toString());
      });

      // ERROR: field.toString() is 28948022309329048855892746252171976963363056481941560715954676764349967630336
      // it('should be the same as neg Field.one', async () => {
      //   const int = new Int64(Field.one.neg());
      //   const field = Field.one.neg();
      //   expect(int.toString()).toEqual(field.toString());
      // });

      it('should be the same as 2^53-1', async () => {
        const int = new Int64(Field(String(NUMBERMAX)));
        const field = Field(String(NUMBERMAX));
        expect(int.toString()).toEqual(field.toString());
      });
    });

    describe('zero', () => {
      it('should be the same as Field zero', async () => {
        expect(Int64.zero.value).toEqual(Field.zero);
      });
    });

    describe('fromUnsigned', () => {
      it('should be the same as UInt64.zero', async () => {
        expect(new Int64(Field.zero).value).toEqual(
          Int64.fromUnsigned(UInt64.zero).value
        );
      });

      it('should be the same as UInt64.MAXINT', async () => {
        expect(new Int64(Field(((1n << 64n) - 1n).toString())).value).toEqual(
          Int64.fromUnsigned(UInt64.MAXINT()).value
        );
      });
    });

    describe('uint64Value', () => {
      it('should equal Field.one', () => {
        const int = new Int64(Field.one);
        expect(int.uint64Value()).toEqual(Field.one);
      });

      it('should equal UInt64.MAXINT', () => {
        const int = new Int64(Field(((1n << 64n) - 1n).toString()));
        expect(int.uint64Value()).toEqual(UInt64.MAXINT().value);
      });
    });

    describe('neg', () => {
      // Expected: "-1" Received: "28948022309329048855892746252171976963363056481941560715954676764349967630336"
      // it('neg(1)=-1', () => {
      //   const int = new Int64(Field.one);
      //   expect(int.neg().value).toEqual('-1');
      // });
      // Expected: "-9007199254740991" Received: "28948022309329048855892746252171976963363056481941560715954667757150712889346"
      // it('neg(2^53-1)=-2^53-1', () => {
      //   const int = new Int64(Field(String(NUMBERMAX)));
      //   expect(int.neg().value).toEqual(`${-NUMBERMAX}`);
      // });
    });

    describe('add', () => {
      it('1+1=2', () => {
        expect(
          new Int64(Field.one).add(new Int64(Field.one)).toString()
        ).toEqual('2');
      });

      it('5000+5000=10000', () => {
        expect(
          new Int64(Field(5000)).add(new Int64(Field(5000))).toString()
        ).toEqual('10000');
      });

      it('(MAXINT/2+MAXINT/2) adds to MAXINT', () => {
        const value = Field((((1n << 64n) - 2n) / 2n).toString());
        expect(
          new Int64(value)
            .add(new Int64(value))
            .add(new Int64(Field.one))
            .toString()
        ).toEqual(UInt64.MAXINT().toString());
      });

      // ERROR: Does not throw - Int64 should be in the range [-2^63, 2^63 - 1]
      // it('should throw on overflow addition', () => {
      //   const value = Field(((1n << 64n) - 1n).toString());
      //   expect(() => {
      //     new Int64(value).add(new Int64(Field.one)).toString();
      //   }).toThrow();
      // });
    });

    describe('sub', () => {
      it('1-1=0', () => {
        expect(
          new Int64(Field.one).sub(new Int64(Field.one)).toString()
        ).toEqual('0');
      });

      it('10000-5000=5000', () => {
        expect(
          new Int64(Field(10000)).sub(new Int64(Field(5000))).toString()
        ).toEqual('5000');
      });

      it('0-1=-1', () => {
        expect(
          new Int64(Field.zero).sub(new Int64(Field.one)).toString()
        ).toEqual('-1');
      });

      // ERROR: Expected: -18446744073709552000 - Received: "-18446744073709551615"
      // it('(0-MAXINT) subs to -MAXINT', () => {
      //   expect(
      //     new Int64(Field.zero)
      //       .sub(Int64.fromUnsigned(UInt64.MAXINT()))
      //       .toString()
      //   ).toEqual(-UInt64.MAXINT().toString());
      // });
    });
    describe('toFields', () => {
      it('toFields(1) should be the same as Field.one', () => {
        expect(Int64.toFields(new Int64(Field.one))).toEqual([Field.one]);
      });

      it('toFields(2^53-1) should be the same as Field(2^53-1)', () => {
        expect(Int64.toFields(new Int64(Field(String(NUMBERMAX))))).toEqual([
          Field(String(NUMBERMAX)),
        ]);
      });
    });
    describe('ofFields', () => {
      it('ofFields(1) should be the same as Field.one', () => {
        expect(Int64.ofFields([Field.one])).toEqual(new Int64(Field.one));
      });

      it('ofFields(2^53-1) should be the same as Field(2^53-1)', () => {
        expect(Int64.ofFields([Field(String(NUMBERMAX))])).toEqual(
          new Int64(Field(String(NUMBERMAX)))
        );
      });
    });
  });

  describe('UInt64', () => {
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
        expect(new UInt64(Field(1000)).mul(1000).toString()).toEqual('1000000');
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
      // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967630336 to fit in 64 bits
      // it('1<2=true', () => {
      //   expect(new UInt64(Field.one).lt(new UInt64(Field(2)))).toEqual(
      //     Bool(true)
      //   );
      // });

      // This function can't be run outside of a checked computation.
      // it('1<1=false', () => {
      //   expect(new UInt64(Field.one).lt(new UInt64(Field.one))).toEqual(
      //     Bool(false)
      //   );
      // });

      it('2<1=false', () => {
        expect(new UInt64(Field(2)).lt(new UInt64(Field.one))).toEqual(
          Bool(false)
        );
      });

      // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967531337 to fit in 64 bits
      // it('1000<100000=true', () => {
      //   expect(
      //     new UInt64(Field(1000)).lt(new UInt64(Field(100000)))
      //   ).toEqual(Bool(true));
      // });

      it('100000<1000=false', () => {
        expect(new UInt64(Field(100000)).lt(new UInt64(Field(1000)))).toEqual(
          Bool(false)
        );
      });

      // This function can't be run outside of a checked computation.
      // it('MAXINT<MAXINT=false', () => {
      //   expect(UInt64.MAXINT().lt(UInt64.MAXINT())).toEqual(Bool(false));
      // });
    });

    describe('lte', () => {
      // ERROR: This function can't be run outside of a checked computation.
      // it('1<=1=true', () => {
      //   expect(new UInt64(Field.one).lte(new UInt64(Field.one))).toEqual(
      //     Bool(true)
      //   );
      // });

      it('2<=1=false', () => {
        expect(new UInt64(Field(2)).lte(new UInt64(Field.one))).toEqual(
          Bool(false)
        );
      });

      // ERROR: rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967531337 to fit in 64 bits
      // it('1000<=100000=true', () => {
      //   expect(
      //     new UInt64(Field(1000)).lte(new UInt64(Field(100000)))
      //   ).toEqual(Bool(true));
      // });

      it('100000<=1000=false', () => {
        expect(new UInt64(Field(100000)).lte(new UInt64(Field(1000)))).toEqual(
          Bool(false)
        );
      });

      // ERROR: This function can't be run outside of a checked computation.
      // it('MAXINT<=MAXINT=true', () => {
      //   expect(UInt64.MAXINT().lte(UInt64.MAXINT())).toEqual(Bool(true));
      // });
    });

    // ERROR: This function can't be run outside of a checked computation.
    // describe('assertLte', () => {
    //   it('1<=1=true', () => {
    //     expect(
    //       new UInt64(Field.one).assertLte(new UInt64(Field.one))
    //     ).not.toThrow();
    //   });

    //   it('2<=1=false', () => {
    //     expect(
    //       new UInt64(Field.one).assertLte(new UInt64(Field(2)))
    //     ).toThrow();
    //   });

    //   it('1000<=100000=true', () => {
    //     expect(
    //       new UInt64(Field(1000)).assertLte(new UInt64(Field(100000)))
    //     ).not.toThrow();
    //   });

    //   it('100000<=1000=false', () => {
    //     expect(
    //       new UInt64(Field(100000)).assertLte(new UInt64(Field(1000)))
    //     ).toThrow();
    //   });

    //   it('MAXINT<=MAXINT=true', () => {
    //     expect(UInt64.MAXINT().assertLte(UInt64.MAXINT())).not.toThrow();
    //   });
    // });

    describe('gt', () => {
      // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967630336 to fit in 64 bits
      // it('2>1=true', () => {
      //   expect(new UInt64(Field(2)).gt(new UInt64(Field.one))).toEqual(
      //     Bool(true)
      //   );
      // });

      // This function can't be run outside of a checked computation.
      // it('1>1=false', () => {
      //   expect(new UInt64(Field.one).gt(new UInt64(Field.one))).toEqual(
      //     Bool(false)
      //   );
      // });

      // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967630336 to fit in 64 bits
      // it('1>2=false', () => {
      //   expect(new UInt64(Field.one).lt(new UInt64(Field(2)))).toEqual(
      //     Bool(false)
      //   );
      // });

      // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967531337 to fit in 64 bits
      // it('100000>1000=true', () => {
      //   expect(
      //     new UInt64(Field(100000)).gt(new UInt64(Field(1000)))
      //   ).toEqual(Bool(true));
      // });

      it('1000>100000=false', () => {
        expect(new UInt64(Field(1000)).gt(new UInt64(Field(100000)))).toEqual(
          Bool(false)
        );
      });

      // This function can't be run outside of a checked computation.
      // it('MAXINT>MAXINT=false', () => {
      //   expect(UInt64.MAXINT().gt(UInt64.MAXINT())).toEqual(Bool(false));
      // });
    });

    // describe('assertGt', () => {
    //   // This function can't be run outside of a checked computation.
    //   it('1>1=false', () => {
    //     expect(new UInt64(Field.one).assertGt(new UInt64(Field.one))).toThrow();
    //   });
    //
    //   // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967630336 to fit in 64 bits
    //   it('2>1=true', () => {
    //     expect(
    //       new UInt64(Field(2)).assertGt(new UInt64(Field.one))
    //     ).not.toThrow();
    //   });

    //   // assert_equal: 0 != 1
    //   it('1000>100000=false', () => {
    //     expect(
    //       new UInt64(Field(1000)).assertGt(new UInt64(Field(100000)))
    //     ).toThrow();
    //   });

    //   // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967531337 to fit in 64 bits
    //   it('100000>1000=true', () => {
    //     expect(
    //       new UInt64(Field(100000)).assertGt(new UInt64(Field(1000)))
    //     ).not.toThrow();
    //   });

    //   // This function can't be run outside of a checked computation.
    //   it('MAXINT>MAXINT=false', () => {
    //     expect(UInt64.MAXINT().assertGt(UInt64.MAXINT())).toThrow();
    //   });
    // });

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

  describe('UInt32', () => {
    const NUMBERMAX = 2 ** 32 - 1; //  JavaScript numbers can only safely store integers in the range -(2^53 − 1) to 2^53 − 1

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
        expect(new UInt32(Field(1000)).mul(1000).toString()).toEqual('1000000');
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

      it('MAXINT%7=1', () => {
        expect(UInt32.MAXINT().mod(7).toString()).toEqual('3');
      });

      it('should throw on mod by zero', () => {
        expect(() => {
          UInt32.MAXINT().mod(0);
        }).toThrow();
      });
    });

    describe('lt', () => {
      // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967630336 to fit in 64 bits
      // it('1<2=true', () => {
      //   expect(new UInt32(Field.one).lt(new UInt32(Field(2)))).toEqual(
      //     Bool(true)
      //   );
      // });

      // This function can't be run outside of a checked computation.
      // it('1<1=false', () => {
      //   expect(new UInt32(Field.one).lt(new UInt32(Field.one))).toEqual(
      //     Bool(false)
      //   );
      // });

      it('2<1=false', () => {
        expect(new UInt32(Field(2)).lt(new UInt32(Field.one))).toEqual(
          Bool(false)
        );
      });

      // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967531337 to fit in 64 bits
      // it('1000<100000=true', () => {
      //   expect(
      //     new UInt32(Field(1000)).lt(new UInt32(Field(100000)))
      //   ).toEqual(Bool(true));
      // });

      it('100000<1000=false', () => {
        expect(new UInt32(Field(100000)).lt(new UInt32(Field(1000)))).toEqual(
          Bool(false)
        );
      });

      // This function can't be run outside of a checked computation.
      // it('MAXINT<MAXINT=false', () => {
      //   expect(UInt32.MAXINT().lt(UInt32.MAXINT())).toEqual(Bool(false));
      // });
    });

    describe('lte', () => {
      // ERROR: This function can't be run outside of a checked computation.
      // it('1<=1=true', () => {
      //   expect(new UInt32(Field.one).lte(new UInt32(Field.one))).toEqual(
      //     Bool(true)
      //   );
      // });

      it('2<=1=false', () => {
        expect(new UInt32(Field(2)).lte(new UInt32(Field.one))).toEqual(
          Bool(false)
        );
      });

      // ERROR: rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967531337 to fit in 64 bits
      // it('1000<=100000=true', () => {
      //   expect(
      //     new UInt32(Field(1000)).lte(new UInt32(Field(100000)))
      //   ).toEqual(Bool(true));
      // });

      it('100000<=1000=false', () => {
        expect(new UInt32(Field(100000)).lte(new UInt32(Field(1000)))).toEqual(
          Bool(false)
        );
      });

      // ERROR: This function can't be run outside of a checked computation.
      // it('MAXINT<=MAXINT=true', () => {
      //   expect(UInt32.MAXINT().lte(UInt32.MAXINT())).toEqual(Bool(true));
      // });
    });

    // // ERROR: This function can't be run outside of a checked computation.
    // describe('assertLte', () => {
    //   it('1<=1=true', () => {
    //     expect(
    //       new UInt32(Field.one).assertLte(new UInt32(Field.one))
    //     ).not.toThrow();
    //   });

    //   it('2<=1=false', () => {
    //     expect(
    //       new UInt32(Field.one).assertLte(new UInt32(Field(2)))
    //     ).toThrow();
    //   });

    //   it('1000<=100000=true', () => {
    //     expect(
    //       new UInt32(Field(1000)).assertLte(new UInt32(Field(100000)))
    //     ).not.toThrow();
    //   });

    //   it('100000<=1000=false', () => {
    //     expect(
    //       new UInt32(Field(100000)).assertLte(new UInt32(Field(1000)))
    //     ).toThrow();
    //   });

    //   it('MAXINT<=MAXINT=true', () => {
    //     expect(UInt32.MAXINT().assertLte(UInt32.MAXINT())).not.toThrow();
    //   });
    // });

    // describe('gt', () => {
    //   // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967630336 to fit in 64 bits
    //   it('2>1=true', () => {
    //     expect(new UInt32(Field(2)).gt(new UInt32(Field.one))).toEqual(
    //       Bool(true)
    //     );
    //   });

    //   // This function can't be run outside of a checked computation.
    //   it('1>1=false', () => {
    //     expect(new UInt32(Field.one).gt(new UInt32(Field.one))).toEqual(
    //       Bool(false)
    //     );
    //   });

    //   // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967630336 to fit in 64 bits
    //   it('1>2=false', () => {
    //     expect(new UInt32(Field.one).lt(new UInt32(Field(2)))).toEqual(
    //       Bool(false)
    //     );
    //   });

    //   // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967531337 to fit in 64 bits
    //   it('100000>1000=true', () => {
    //     expect(
    //       new UInt32(Field(100000)).gt(new UInt32(Field(1000)))
    //     ).toEqual(Bool(true));
    //   });

    //   it('1000>100000=false', () => {
    //     expect(
    //       new UInt32(Field(1000)).gt(new UInt32(Field(100000)))
    //     ).toEqual(Bool(false));
    //   });

    //   // This function can't be run outside of a checked computation.
    //   it('MAXINT>MAXINT=false', () => {
    //     expect(UInt32.MAXINT().gt(UInt32.MAXINT())).toEqual(Bool(false));
    //   });
    // });

    // describe('assertGt', () => {
    //   // This function can't be run outside of a checked computation.
    //   it('1>1=false', () => {
    //     expect(new UInt32(Field.one).assertGt(new UInt32(Field.one))).toThrow();
    //   });
    //   // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967630336 to fit in 64 bits
    //   it('2>1=true', () => {
    //     expect(
    //       new UInt32(Field(2)).assertGt(new UInt32(Field.one))
    //     ).not.toThrow();
    //   });

    //   // assert_equal: 0 != 1
    //   it('1000>100000=false', () => {
    //     expect(
    //       new UInt32(Field(1000)).assertGt(new UInt32(Field(100000)))
    //     ).toThrow();
    //   });

    //   // rangeCheckHelper: Expected 28948022309329048855892746252171976963363056481941560715954676764349967531337 to fit in 64 bits
    //   it('100000>1000=true', () => {
    //     expect(
    //       new UInt32(Field(100000)).assertGt(new UInt32(Field(1000)))
    //     ).not.toThrow();
    //   });

    //   // This function can't be run outside of a checked computation.
    //   it('MAXINT>MAXINT=false', () => {
    //     expect(UInt32.MAXINT().assertGt(UInt32.MAXINT())).toThrow();
    //   });
    // });

    describe('toString()', () => {
      it('should be the same as Field.zero', async () => {
        const uint = new UInt32(Field.zero);
        const field = Field.zero;
        expect(uint.toString()).toEqual(field.toString());
      });
      it('should be the same as 2^53-1', async () => {
        const uint = new UInt32(Field(String(NUMBERMAX)));
        const field = Field(String(NUMBERMAX));
        expect(uint.toString()).toEqual(field.toString());
      });
    });

    describe('check()', () => {
      it('should pass checking a MAXINT', () => {
        expect(() => {
          UInt32.check(UInt32.MAXINT());
        }).not.toThrow();
      });

      it('should throw checking over MAXINT', () => {
        const aboveMax = new UInt32(Field((1n << 32n).toString())); // This number is defined in UInt64.MAXINT()
        expect(() => {
          UInt32.check(aboveMax);
        }).toThrow();
      });
    });

    describe('from() ', () => {
      describe('fromNumber()', () => {
        it('should be the same as Field.one', () => {
          const uint = UInt32.fromNumber(1);
          expect(uint.value).toEqual(new UInt32(Field.one).value);
        });

        it('should be the same as 2^53-1', () => {
          const uint = UInt32.fromNumber(NUMBERMAX);
          expect(uint.value).toEqual(Field(String(NUMBERMAX)));
        });
      });
      describe('fromString()', () => {
        it('should be the same as Field.one', () => {
          const uint = UInt32.fromString('1');
          expect(uint.value).toEqual(new UInt32(Field.one).value);
        });

        it('should be the same as 2^53-1', () => {
          const uint = UInt32.fromString(String(NUMBERMAX));
          expect(uint.value).toEqual(Field(String(NUMBERMAX)));
        });
      });
    });
  });
});
