import { Field, Group, Gadgets, Provable, Scalar, Hash, Bytes } from 'o1js';

export { GroupCS, BitwiseCS, HashCS };

const GroupCS = constraintSystem('Group Primitive', {
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
});

const BitwiseCS = constraintSystem('Bitwise Primitive', {
  rot() {
    let a = Provable.witness(Field, () => new Field(12));
    Gadgets.rangeCheck64(a); // `rotate()` doesn't do this
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
  leftShift() {
    let a = Provable.witness(Field, () => new Field(12));
    Gadgets.leftShift(a, 2);
    Gadgets.leftShift(a, 4);
  },
  rightShift() {
    let a = Provable.witness(Field, () => new Field(12));
    Gadgets.rightShift(a, 2);
    Gadgets.rightShift(a, 4);
  },
  and() {
    let a = Provable.witness(Field, () => new Field(5n));
    let b = Provable.witness(Field, () => new Field(5n));
    Gadgets.and(a, b, 16);
    Gadgets.and(a, b, 32);
    Gadgets.and(a, b, 48);
    Gadgets.and(a, b, 64);
  },
});

const Bytes32 = Bytes(32);
const bytes32 = Bytes32.from([]);

const HashCS = constraintSystem('Hashes', {
  SHA256() {
    let xs = Provable.witness(Bytes32.provable, () => bytes32);
    Hash.SHA3_256.hash(xs);
  },

  SHA384() {
    let xs = Provable.witness(Bytes32.provable, () => bytes32);
    Hash.SHA3_384.hash(xs);
  },

  SHA512() {
    let xs = Provable.witness(Bytes32.provable, () => bytes32);
    Hash.SHA3_512.hash(xs);
  },

  Keccak256() {
    let xs = Provable.witness(Bytes32.provable, () => bytes32);
    Hash.Keccak256.hash(xs);
  },

  Poseidon() {
    let xs = Array.from({ length: 32 }, (_, i) => i).map((x) =>
      Provable.witness(Field, () => Field(x))
    );
    Hash.Poseidon.hash(xs);
  },
});

// mock ZkProgram API for testing

function constraintSystem(
  name: string,
  obj: { [K: string]: (...args: any) => void }
) {
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
