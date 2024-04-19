import { Bool, Group, Scalar, Provable } from 'o1js';

describe('group', () => {
  let g = Group({ x: -1, y: 2 });

  describe('Inside circuit', () => {
    describe('group membership', () => {
      it('valid element does not throw', async () => {
        await Provable.runAndCheck(() => {
          Provable.witness(Group, () => ({ x: -1, y: 2 }));
        });
      });

      it('valid element does not throw', async () => {
        await Provable.runAndCheck(() => {
          Provable.witness(Group, () => Group.generator);
        });
      });

      it('Group.zero element does not throw', async () => {
        await Provable.runAndCheck(() => {
          Provable.witness(Group, () => Group.zero);
        });
      });

      it('invalid group element throws', async () => {
        await expect(
          Provable.runAndCheck(() => {
            Provable.witness(Group, () => Group({ x: 2, y: 2 }));
          })
        ).rejects.toThrow();
      });
    });

    describe('add', () => {
      it('g+g does not throw', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          const y = Provable.witness(Group, () => g);
          x.add(y);
        });
      });

      it('g+zero = g', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          const zero = Provable.witness(Group, () => Group.zero);
          x.add(zero).assertEquals(x);
        });
      });

      it('zero+g = g', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          const zero = Provable.witness(Group, () => Group.zero);
          zero.add(x).assertEquals(x);
        });
      });

      it('g+(-g) = zero', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          const zero = Provable.witness(Group, () => Group.zero);
          x.add(x.neg()).assertEquals(zero);
        });
      });

      it('(-g)+g = zero', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          const zero = Provable.witness(Group, () => Group.zero);
          x.neg().add(x).assertEquals(zero);
        });
      });

      it('zero + zero = zero', async () => {
        await Provable.runAndCheck(() => {
          const zero = Provable.witness(Group, () => Group.zero);
          zero.add(zero).assertEquals(zero);
        });
      });
    });

    describe('sub', () => {
      it('g-g does not throw', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          const y = Provable.witness(Group, () => g);
          x.sub(y);
        });
      });

      it('g-zero = g', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          const zero = Provable.witness(Group, () => Group.zero);
          x.sub(zero).assertEquals(x);
        });
      });

      it('zero - g = -g', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          const zero = Provable.witness(Group, () => Group.zero);
          zero.sub(x).assertEquals(x.neg());
        });
      });

      it('zero - zero = zero', async () => {
        await Provable.runAndCheck(() => {
          const zero = Provable.witness(Group, () => Group.zero);
          zero.sub(zero).assertEquals(zero);
        });
      });
    });

    describe('neg', () => {
      it('neg(g) not to throw', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          x.neg();
        });
      });

      it('neg(zero) = zero', async () => {
        await Provable.runAndCheck(() => {
          const zero = Provable.witness(Group, () => Group.zero);
          zero.neg().assertEquals(zero);
        });
      });
    });

    describe('scale', () => {
      it('scaling with random Scalar does not throw', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => g);
          x.scale(Scalar.random());
        });
      });

      it('x*g+y*g = (x+y)*g', async () => {
        await Provable.runAndCheck(() => {
          const x = Scalar.from(2);
          const y = Scalar.from(3);
          const left = g.scale(x).add(g.scale(y));
          const right = g.scale(x.add(y));
          left.assertEquals(right);
        });
      });

      it('x*(y*g) = (x*y)*g', async () => {
        await Provable.runAndCheck(() => {
          const x = Scalar.from(2);
          const y = Scalar.from(3);
          const left = g.scale(y).scale(x);
          const right = g.scale(y.mul(x));
          left.assertEquals(right);
        });
      });
    });

    describe('equals', () => {
      it('should equal true with same group', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => Group.generator);
          let isEqual = x.equals(Group.generator);
          Provable.asProver(() => {
            expect(isEqual.toBoolean()).toEqual(true);
          });
        });
      });

      it('should equal false with different group', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => Group.generator);
          let isEqual = x.equals(g);
          Provable.asProver(() => {
            expect(isEqual.toBoolean()).toEqual(false);
          });
        });
      });
    });

    describe('assertEquals', () => {
      it('should not throw with same group', async () => {
        await Provable.runAndCheck(() => {
          const x = Provable.witness(Group, () => Group.generator);
          x.assertEquals(Group.generator);
        });
      });

      it('should throw with different group', async () => {
        await expect(
          Provable.runAndCheck(() => {
            const x = Provable.witness(Group, () => Group.generator);
            x.assertEquals(g);
          })
        ).rejects.toThrow();
      });
    });

    describe('toJSON', () => {
      it('fromJSON(g.toJSON) should be the same as g', async () => {
        await Provable.runAndCheck(() => {
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
    it('add', async () => {
      await Provable.runAndCheck(() => {
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
