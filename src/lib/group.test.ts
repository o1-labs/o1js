import {
  shutdown,
  isReady,
  Field,
  Bool,
  Circuit,
  Group,
  Scalar,
  Provable,
} from 'snarkyjs';

describe('group', () => {
  let g = Group({
    x: -1,
    y: 2,
  });
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
      it('g+g does not throw', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => g);
            const y = Provable.witness(Group, () => g);
            x.add(y);
          });
        }).not.toThrow();
      });
    });

    describe('sub', () => {
      it('g-g does not throw', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(Group, () => g);
              const y = Provable.witness(Group, () => g);
              x.sub(y);
            });
          });
        }).not.toThrow();
      });
    });

    describe('neg', () => {
      it('neg(g) not to throw', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => g);
            x.neg();
          });
        }).not.toThrow();
      });
    });

    describe('scale', () => {
      it('scaling with random Scalar does not throw', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => g);
            x.scale(Scalar.random());
          });
        }).not.toThrow();
      });

      it('x*g+y*g = (x+y)*g', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Scalar.from(2);
            const y = Scalar.from(3);
            const left = g.scale(x).add(g.scale(y));
            const right = g.scale(x.add(y));
            left.assertEquals(right);
          });
        }).not.toThrow();
      });

      it('x*(y*g) = (x*y)*g', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Scalar.from(2);
            const y = Scalar.from(3);
            const left = g.scale(y).scale(x);
            const right = g.scale(y.mul(x));
            left.assertEquals(right);
          });
        }).not.toThrow();
      });
    });

    describe('equals', () => {
      it('should equal true with same group', () => {
        Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => Group.generator);
          let isEqual = x.equals(Group.generator);
          Provable.asProver(() => {
            expect(isEqual.toBoolean()).toEqual(true);
          });
        });
      });

      it('should equal false with different group', () => {
        Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => Group.generator);
          let isEqual = x.equals(g);
          Provable.asProver(() => {
            expect(isEqual.toBoolean()).toEqual(false);
          });
        });
      });
    });

    describe('assertEquals', () => {
      it('should not throw with same group', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => Group.generator);
            x.assertEquals(Group.generator);
          });
        }).not.toThrow();
      });

      it('should throw with different group', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => Group.generator);
            x.assertEquals(g);
          });
        }).toThrow();
      });
    });

    describe('toJSON', () => {
      it('fromJSON(g.toJSON) should be the same as g', () => {
        Provable.runAndCheck(() => {
          const x = Provable.witness(
            Group,
            () => Group.fromJSON(Group.generator.toJSON())!
          );
          Provable.asProver(() => {
            expect(x.equals(Group.generator).toBoolean()).toEqual(true);
          });
        });
      });
    });
  });

  describe('Outside circuit', () => {
    describe('neg', () => {
      it('neg not to throw', () => {
        expect(() => {
          g.neg();
        }).not.toThrow();
      });
    });

    describe('add', () => {
      it('(-1,2)+(-1,2) does not throw', () => {
        expect(() => {
          g.add(g);
        }).not.toThrow();
      });
    });

    describe('sub', () => {
      it('generator-(-1,2) does not throw', () => {
        expect(() => {
          Group.generator.sub(g);
        }).not.toThrow();
      });
    });

    describe('scale', () => {
      it('scaling with random Scalar does not throw', () => {
        expect(() => {
          g.scale(Scalar.random());
        }).not.toThrow();
      });

      it('x*g+y*g = (x+y)*g', () => {
        const x = Scalar.from(2);
        const y = Scalar.from(3);
        const left = g.scale(x).add(g.scale(y));
        const right = g.scale(x.add(y));
        expect(left).toEqual(right);
      });

      it('x*(y*g) = (x*y)*g', () => {
        const x = Scalar.from(2);
        const y = Scalar.from(3);
        const left = g.scale(y).scale(x);
        const right = g.scale(y.mul(x));
        expect(left).toEqual(right);
      });
    });

    describe('equals', () => {
      it('should equal true with same group', () => {
        expect(g.equals(g)).toEqual(Bool(true));
      });

      it('should equal false with different group', () => {
        expect(g.equals(Group.generator)).toEqual(Bool(false));
      });
    });

    describe('toJSON', () => {
      it("fromJSON('1','1') should be the same as Group(1,1)", () => {
        const x = Group.fromJSON({ x: -1, y: 2 });
        expect(x).toEqual(g);
      });
    });
  });

  describe('Variable/Constant circuit equality ', () => {
    it('add', () => {
      Provable.runAndCheck(() => {
        let y = Provable.witness(Group, () => g).add(
          Provable.witness(Group, () => Group.generator)
        );
        let z = g.add(Group.generator);
        y.assertEquals(z);
      });
    });
    it('sub', () => {
      let y = Provable.witness(Group, () => g).sub(
        Provable.witness(Group, () => Group.generator)
      );
      let z = g.sub(Group.generator);
      y.assertEquals(z);
    });
    it('sub', () => {
      let y = Provable.witness(Group, () => g).assertEquals(
        Provable.witness(Group, () => g)
      );
      let z = g.assertEquals(g);
    });
  });
});
