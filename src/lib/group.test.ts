import {
  shutdown,
  isReady,
  Field,
  Bool,
  Circuit,
  Group,
  Scalar,
} from 'snarkyjs';

describe('group', () => {
  beforeAll(async () => {
    await isReady;
  });

  afterAll(async () => {
    setTimeout(async () => {
      await shutdown();
    }, 0);
  });

  describe('Inside circuit', () => {
    describe('add', () => {
      it('(1,1)+(1,1) does not throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(1, 1));
            const y = Circuit.witness(Group, () => new Group(1, 1));
            x.add(y);
          });
        }).not.toThrow();
      });

      it('(5000,5000)+(5000,5000) does not throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(5000, 5000));
            const y = Circuit.witness(Group, () => new Group(5000, 5000));
            x.add(y);
          });
        }).not.toThrow();
      });

      it('((2^64/2)+(2^64/2)) does not throw', () => {
        const v = Field(((1n << 64n) - 2n).toString());
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(v, v));
            const y = Circuit.witness(Group, () => new Group(v, v));
            x.add(y);
          });
        }).not.toThrow();
      });
    });

    describe('sub', () => {
      it('(1,1)-(1,1) does not throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(1, 1));
            const y = Circuit.witness(Group, () => new Group(1, 1));
            x.sub(y);
          });
        }).not.toThrow();
      });

      it('(5000,5000)-(5000,5000) does not throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(5000, 5000));
            const y = Circuit.witness(Group, () => new Group(5000, 5000));
            x.sub(y);
          });
        }).not.toThrow();
      });

      it('(0,0)-(1,1) does not throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(0, 0));
            const y = Circuit.witness(Group, () => new Group(1, 1));
            x.sub(y);
          });
        }).not.toThrow();
      });

      it('(1,1)-(-1,-1) does not throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(1, 1));
            const y = Circuit.witness(Group, () => new Group(-1, -1));
            x.sub(y);
          });
        }).not.toThrow();
      });
    });

    describe('neg', () => {
      it('neg(1,1) not to throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(1, 1));
            x.neg();
          });
        }).not.toThrow();
      });

      it('neg(-1,-1) does not throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(-1, -1));
            x.neg();
          });
        }).not.toThrow();
      });

      it('neg(0,0) does not throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(0, 0));
            x.neg();
          });
        }).not.toThrow();
      });
    });

    describe('scale', () => {
      it('scaling with random Scalar does not throw', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(1, 1));
            x.scale(Scalar.random());
          });
        }).not.toThrow();
      });

      it('x*g+y*g = (x+y)*g', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const g = new Group(1, 1);
            const x = Scalar.fromJSON(2)!;
            const y = Scalar.fromJSON(3)!;
            const left = g.scale(x).add(g.scale(y));
            const right = g.scale(x.add(y));
            left.assertEquals(right);
          });
        }).not.toThrow();
      });

      it('x*(y*g) = (x*y)*g', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const g = new Group(1, 1);
            const x = Scalar.fromJSON(2)!;
            const y = Scalar.fromJSON(3)!;
            const left = g.scale(y).scale(x);
            const right = g.scale(y.mul(x));
            left.assertEquals(right);
          });
        }).not.toThrow();
      });
    });

    describe('equals', () => {
      it('should equal true with same group', () => {
        Circuit.runAndCheck(() => {
          const x = Circuit.witness(Group, () => new Group(1, 1));
          expect(x.equals(new Group(1, 1))).toEqual(Bool(true));
        });
      });

      it('should equal false with different group', () => {
        Circuit.runAndCheck(() => {
          const x = Circuit.witness(Group, () => new Group(1, 1));
          expect(x.equals(new Group(0, 0))).toEqual(Bool(false));
        });
      });
    });

    describe('assertEquals', () => {
      it('should not throw with same group', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(1, 1));
            x.assertEquals(new Group(1, 1));
          });
        }).not.toThrow();
      });

      it('should throw with different group', () => {
        expect(() => {
          Circuit.runAndCheck(() => {
            const x = Circuit.witness(Group, () => new Group(1, 1));
            x.assertEquals(new Group(0, 0));
          });
        }).toThrow();
      });
    });

    describe('toJSON', () => {
      it("fromJSON('1','1') should be the same as Group(1,1)", () => {
        Circuit.runAndCheck(() => {
          const x = Circuit.witness(
            Group,
            () => Group.fromJSON({ x: 1, y: 1 })!
          );
          expect(x).toEqual(new Group(1, 1));
        });
      });
    });
  });

  describe('Outside circuit', () => {
    describe('neg', () => {
      it('neg(1,1) not to throw', () => {
        expect(() => {
          new Group(1, 1).neg();
        }).not.toThrow();
      });

      it('neg(-1,-1) does not throw', () => {
        expect(() => {
          new Group(-1, -1).neg();
        }).not.toThrow();
      });

      it('neg(0,0) does not throw', () => {
        expect(() => {
          new Group(0, 0).neg();
        }).not.toThrow();
      });
    });

    describe('add', () => {
      it('(1,1)+(1,1) does not throw', () => {
        expect(() => {
          const x = new Group(1, 1);
          const y = new Group(1, 1);
          x.add(y);
        }).not.toThrow();
      });

      it('(5000,5000)+(5000,5000) does not throw', () => {
        expect(() => {
          const x = new Group(5000, 5000);
          const y = new Group(5000, 5000);
          x.add(y);
        }).not.toThrow();
      });

      it('((2^64/2)+(2^64/2)) does not throw', () => {
        expect(() => {
          const v = Field(((1n << 64n) - 2n).toString());
          const x = new Group(v, v);
          const y = new Group(v, v);
          x.add(y);
        }).not.toThrow();
      });
    });

    describe('sub', () => {
      it('(1,1)-(1,1) does not throw', () => {
        expect(() => {
          const x = new Group(1, 1);
          const y = new Group(1, 1);
          x.sub(y);
        }).not.toThrow();
      });

      it('(5000,5000)-(5000,5000) does not throw', () => {
        expect(() => {
          const x = new Group(5000, 5000);
          const y = new Group(5000, 5000);
          x.sub(y);
        }).not.toThrow();
      });

      it('(0,0)-(1,1) does not throw', () => {
        expect(() => {
          const x = new Group(0, 0);
          const y = new Group(1, 1);
          x.sub(y);
        }).not.toThrow();
      });

      it('(1,1)-(-1,-1) does not throw', () => {
        expect(() => {
          const x = new Group(1, 1);
          const y = new Group(-1, -1);
          x.sub(y);
        }).not.toThrow();
      });
    });

    describe('scale', () => {
      it('scaling with random Scalar does not throw', () => {
        expect(() => {
          new Group(1, 1).scale(Scalar.random());
        }).not.toThrow();
      });

      it('x*g+y*g = (x+y)*g', () => {
        const g = new Group(1, 1);
        const x = Scalar.fromJSON(2)!;
        const y = Scalar.fromJSON(3)!;
        const left = g.scale(x).add(g.scale(y));
        const right = g.scale(x.add(y));
        expect(left).toEqual(right);
      });

      it('x*(y*g) = (x*y)*g', () => {
        const g = new Group(1, 1);
        const x = Scalar.fromJSON(2)!;
        const y = Scalar.fromJSON(3)!;
        const left = g.scale(y).scale(x);
        const right = g.scale(y.mul(x));
        expect(left).toEqual(right);
      });
    });

    describe('equals', () => {
      it('should equal true with same group', () => {
        const x = new Group(1, 1);
        expect(x.equals(new Group(1, 1))).toEqual(Bool(true));
      });

      it('should equal false with different group', () => {
        const x = new Group(1, 1);
        expect(x.equals(new Group(0, 0))).toEqual(Bool(false));
      });
    });

    describe('toJSON', () => {
      it("fromJSON('1','1') should be the same as Group(1,1)", () => {
        const x = Group.fromJSON({ x: 1, y: 1 });
        expect(x).toEqual(new Group(1, 1));
      });
    });
  });
});
