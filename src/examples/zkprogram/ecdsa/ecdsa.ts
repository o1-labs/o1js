import { Gadgets, ZkProgram, Struct } from 'o1js';

export { ecdsaProgram };

let { ForeignField, Field3, Ecdsa } = Gadgets;

type PublicKey = { x: Gadgets.Field3; y: Gadgets.Field3 };
const PublicKey = Struct({ x: Field3.provable, y: Field3.provable });

const ecdsaProgram = ZkProgram({
  name: 'ecdsa',
  publicInput: PublicKey,

  methods: {
    verifyEcdsa: {
      privateInputs: [Ecdsa.Signature.provable, Field3.provable],
      method(
        publicKey: PublicKey,
        signature: Gadgets.Ecdsa.Signature,
        msgHash: Gadgets.Field3
      ) {
        // assert that private inputs are valid
        ForeignField.assertAlmostFieldElements(
          [signature.r, signature.s, msgHash],
          0n
        );

        Ecdsa.verify(Secp256k1, signature, msgHash, publicKey);
      },
    },
  },
});
