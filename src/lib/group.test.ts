import { Bool, Group, Scalar, Provable } from 'o1js';

describe('group', () => {
  let g = Group({
    x: -1,
    y: 2,
  });

  describe('Inside circuit', () => {
    describe('group membership', () => {
      it('valid element does not throw', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            Provable.witness(Group, () => g);
          });
        }).not.toThrow();
      });

      it('valid element does not throw', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            Provable.witness(Group, () => Group.generator);
          });
        }).not.toThrow();
      });

      it('Group.zero element does not throw', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            Provable.witness(Group, () => Group.zero);
          });
        }).not.toThrow();
      });

      it('invalid group element throws', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            Provable.witness(Group, () => Group({ x: 2, y: 2 }));
          });
        }).toThrow();
      });
    });

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

      it('g+zero = g', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => g);
            const zero = Provable.witness(Group, () => Group.zero);
            x.add(zero).assertEquals(x);
          });
        }).not.toThrow();
      });

      it('zero+g = g', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => g);
            const zero = Provable.witness(Group, () => Group.zero);
            zero.add(x).assertEquals(x);
          });
        }).not.toThrow();
      });

      it('g+(-g) = zero', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => g);
            const zero = Provable.witness(Group, () => Group.zero);
            x.add(x.neg()).assertEquals(zero);
          });
        }).not.toThrow();
      });

      it('(-g)+g = zero', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => g);
            const zero = Provable.witness(Group, () => Group.zero);
            x.neg().add(x).assertEquals(zero);
          });
        }).not.toThrow();
      });

      it('zero + zero = zero', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const zero = Provable.witness(Group, () => Group.zero);
            zero.add(zero).assertEquals(zero);
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

      it('g-zero = g', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => g);
            const zero = Provable.witness(Group, () => Group.zero);
            x.sub(zero).assertEquals(x);
          });
        }).not.toThrow();
      });

      it('zero - g = -g', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => g);
            const zero = Provable.witness(Group, () => Group.zero);
            zero.sub(x).assertEquals(x.neg());
          });
        }).not.toThrow();
      });

      it('zero - zero = zero', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const zero = Provable.witness(Group, () => Group.zero);
            zero.sub(zero).assertEquals(zero);
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

      it('neg(zero) = zero', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            const zero = Provable.witness(Group, () => Group.zero);
            zero.neg().assertEquals(zero);
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

      it('zero.neg = zero', () => {
        expect(() => {
          const zero = Group.zero;
          zero.neg().assertEquals(zero);
        }).not.toThrow();
      });
    });

    describe('add', () => {
      it('(-1,2)+(-1,2) does not throw', () => {
        expect(() => {
          g.add(g);
        }).not.toThrow();
      });

      it('g + zero = g', () => {
        expect(() => {
          const zero = Group.zero;
          g.add(zero).assertEquals(g);
        }).not.toThrow();
      });

      it('zero + g = g', () => {
        expect(() => {
          const zero = Group.zero;
          zero.add(g).assertEquals(g);
        }).not.toThrow();
      });

      it('g + (-g) = zero', () => {
        expect(() => {
          const zero = Group.zero;
          g.add(g.neg()).assertEquals(zero);
        }).not.toThrow();
      });

      it('(-g) + g = zero', () => {
        expect(() => {
          const zero = Group.zero;
          g.neg().add(g).assertEquals(zero);
        }).not.toThrow();
      });

      it('zero + zero = zero', () => {
        expect(() => {
          const zero = Group.zero;
          zero.add(zero).assertEquals(zero);
        }).not.toThrow();
      });
    });

    describe('sub', () => {
      it('generator-(-1,2) does not throw', () => {
        expect(() => {
          Group.generator.sub(g);
        }).not.toThrow();
      });

      it('g - zero = g', () => {
        expect(() => {
          const zero = Group.zero;
          g.sub(zero).assertEquals(g);
        }).not.toThrow();
      });

      it('zero - g = -g', () => {
        expect(() => {
          const zero = Group.zero;
          zero.sub(g).assertEquals(g.neg());
        }).not.toThrow();
      });

      it('zero - zero = -zero', () => {
        expect(() => {
          const zero = Group.zero;
          zero.sub(zero).assertEquals(zero);
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
      g.assertEquals(g);
    });
  });
});
