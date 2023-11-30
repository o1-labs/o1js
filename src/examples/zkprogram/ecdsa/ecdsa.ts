import { Gadgets, ZkProgram, Struct, Crypto } from 'o1js';

export { ecdsaProgram, Point, Secp256k1 };

let { ForeignField, Field3, Ecdsa } = Gadgets;

// TODO expose this as part of Gadgets.Curve

class Point extends Struct({ x: Field3.provable, y: Field3.provable }) {
  // point from bigints
  static from({ x, y }: { x: bigint; y: bigint }) {
    return new Point({ x: Field3.from(x), y: Field3.from(y) });
  }
}

const Secp256k1 = Crypto.createCurve(Crypto.CurveParams.Secp256k1);

const ecdsaProgram = ZkProgram({
  name: 'ecdsa',
  publicInput: Point,

  methods: {
    verifyEcdsa: {
      privateInputs: [Ecdsa.Signature.provable, Field3.provable],
      method(
        publicKey: Point,
        signature: Gadgets.Ecdsa.Signature,
        msgHash: Gadgets.Field3
      ) {
        // assert that private inputs are valid
        ForeignField.assertAlmostFieldElements(
          [signature.r, signature.s, msgHash],
          Secp256k1.order
        );

        // verify signature
        Ecdsa.verify(Secp256k1, signature, msgHash, publicKey);
      },
    },
  },
});
