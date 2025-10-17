import { ZkProgram } from 'o1js';
import { Bigint2048, rsaVerify65537 } from './rsa.js';

export const rsaZkProgram = ZkProgram({
  name: 'rsa-verify',

  methods: {
    verifyRsa65537: {
      privateInputs: [Bigint2048, Bigint2048, Bigint2048],

      async method(message: Bigint2048, signature: Bigint2048, modulus: Bigint2048) {
        rsaVerify65537(message, signature, modulus);
      },
    },
  },
});
