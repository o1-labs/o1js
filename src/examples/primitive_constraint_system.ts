import { Field, Group, Provable, Scalar, Hash, UInt8 } from 'snarkyjs';

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

const HashMock = {
  SHA224() {
    let xs = Array.from({ length: 32 }, (_, i) => i).map((x) =>
      Provable.witness(UInt8, () => UInt8.from(x))
    );
    Hash.SHA224.hash(xs);
  },

  SHA256() {
    let xs = Array.from({ length: 32 }, (_, i) => i).map((x) =>
      Provable.witness(UInt8, () => UInt8.from(x))
    );
    Hash.SHA256.hash(xs);
  },

  SHA384() {
    let xs = Array.from({ length: 32 }, (_, i) => i).map((x) =>
      Provable.witness(UInt8, () => UInt8.from(x))
    );
    Hash.SHA384.hash(xs);
  },

  SHA512() {
    let xs = Array.from({ length: 32 }, (_, i) => i).map((x) =>
      Provable.witness(UInt8, () => UInt8.from(x))
    );
    Hash.SHA512.hash(xs);
  },

  Keccak256() {
    let xs = Array.from({ length: 32 }, (_, i) => i).map((x) =>
      Provable.witness(UInt8, () => UInt8.from(x))
    );
    Hash.Keccak256.hash(xs);
  },

  Poseidon() {
    let xs = Array.from({ length: 32 }, (_, i) => i).map((x) =>
      Provable.witness(Field, () => Field(x))
    );
    Hash.Poseidon.hash(xs);
  },
};

export const GroupCS = mock(GroupMock, 'Group Primitive');
export const HashCS = mock(HashMock, 'SHA Primitive');
