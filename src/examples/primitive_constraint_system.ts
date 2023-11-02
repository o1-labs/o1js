import { Field, Group, Gadgets, Provable, Scalar } from 'o1js';

function mock(obj: { [K: string]: (...args: any) => void }, name: string) {
  let methodKeys = Object.keys(obj);

  return {
    analyzeMethods() {
      let cs: Record<
        string,
        {
          rows: number;
          digest: string;
        }
      > = {};
      for (let key of methodKeys) {
        let { rows, digest } = Provable.constraintSystem(obj[key]);
        cs[key] = {
          digest,
          rows,
        };
      }

      return cs;
    },
    async compile() {
      return {
        verificationKey: { data: '', hash: '' },
      };
    },
    name,
    digest: () => name,
  };
}

const GroupMock = {
  add() {
    let g1 = Provable.witness(Group, () => Group.generator);
    let g2 = Provable.witness(Group, () => Group.generator);
    g1.add(g2);
  },
  sub() {
    let g1 = Provable.witness(Group, () => Group.generator);
    let g2 = Provable.witness(Group, () => Group.generator);
    g1.sub(g2);
  },
  scale() {
    let g1 = Provable.witness(Group, () => Group.generator);
    let s = Provable.witness(Scalar, () => Scalar.from(5n));
    g1.scale(s);
  },
  equals() {
    let g1 = Provable.witness(Group, () => Group.generator);
    let g2 = Provable.witness(Group, () => Group.generator);
    g1.equals(g2).assertTrue();
    g1.equals(g2).assertFalse();
    g1.equals(g2).assertEquals(true);
    g1.equals(g2).assertEquals(false);
  },
  assertions() {
    let g1 = Provable.witness(Group, () => Group.generator);
    let g2 = Provable.witness(Group, () => Group.generator);
    g1.assertEquals(g2);
  },
};

const BitwiseMock = {
  rot() {
    let a = Provable.witness(Field, () => new Field(12));
    Gadgets.rotate(a, 2, 'left');
    Gadgets.rotate(a, 2, 'right');
    Gadgets.rotate(a, 4, 'left');
    Gadgets.rotate(a, 4, 'right');
  },
  xor() {
    let a = Provable.witness(Field, () => new Field(5n));
    let b = Provable.witness(Field, () => new Field(5n));
    Gadgets.xor(a, b, 16);
    Gadgets.xor(a, b, 32);
    Gadgets.xor(a, b, 48);
    Gadgets.xor(a, b, 64);
  },
  notUnchecked() {
    let a = Provable.witness(Field, () => new Field(5n));
    Gadgets.not(a, 16, false);
    Gadgets.not(a, 32, false);
    Gadgets.not(a, 48, false);
    Gadgets.not(a, 64, false);
  },
  notChecked() {
    let a = Provable.witness(Field, () => new Field(5n));
    Gadgets.not(a, 16, true);
    Gadgets.not(a, 32, true);
    Gadgets.not(a, 48, true);
    Gadgets.not(a, 64, true);
  },
  and() {
    let a = Provable.witness(Field, () => new Field(5n));
    let b = Provable.witness(Field, () => new Field(5n));
    Gadgets.and(a, b, 16);
    Gadgets.and(a, b, 32);
    Gadgets.and(a, b, 48);
    Gadgets.and(a, b, 64);
  },
};

export const GroupCS = mock(GroupMock, 'Group Primitive');
export const BitwiseCS = mock(BitwiseMock, 'Bitwise Primitive');
