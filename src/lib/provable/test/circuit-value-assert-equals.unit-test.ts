import { expect } from 'expect';
import { PrivateKey, PublicKey } from '../crypto/signature.js';
import { UInt32, UInt64 } from '../int.js';
import { Provable } from '../provable.js';

// `assertEquals()` on `CircuitValue` types (UInt32, UInt64, PublicKey, ...) accepts an
// optional error message, like `Field.assertEquals()` does.
// https://github.com/o1-labs/o1js/issues/2919

let a = PrivateKey.random().toPublicKey();
let b = PrivateKey.random().toPublicKey();

// constant values
expect(() => UInt64.from(1).assertEquals(UInt64.from(2), 'uint64 mismatch')).toThrow(
  'uint64 mismatch'
);
expect(() => UInt32.from(1).assertEquals(UInt32.from(2), 'uint32 mismatch')).toThrow(
  'uint32 mismatch'
);
expect(() => a.assertEquals(b, 'key mismatch')).toThrow('key mismatch');
UInt64.from(7).assertEquals(UInt64.from(7), 'unused');
a.assertEquals(a, 'unused');

// without a message, the error is unchanged
expect(() => UInt64.from(1).assertEquals(UInt64.from(2))).toThrow(
  /^Field\.assertEquals\(\): 1 != 2/
);

// witnessed values
await expect(
  Provable.runAndCheck(() => {
    Provable.witness(UInt64, () => 1n).assertEquals(UInt64.from(2), 'uint64 in circuit');
  })
).rejects.toThrow('uint64 in circuit');
await expect(
  Provable.runAndCheck(() => {
    Provable.witness(UInt32, () => 1n).assertEquals(UInt32.from(2), 'uint32 in circuit');
  })
).rejects.toThrow('uint32 in circuit');
await expect(
  Provable.runAndCheck(() => {
    Provable.witness(PublicKey, () => a).assertEquals(b, 'key in circuit');
  })
).rejects.toThrow('key in circuit');
await Provable.runAndCheck(() => {
  Provable.witness(UInt64, () => 5n).assertEquals(UInt64.from(5), 'unused');
});

// the message does not change the circuit
let plain = await Provable.constraintSystem(() => {
  Provable.witness(UInt64, () => 5n).assertEquals(UInt64.from(5));
});
let withMessage = await Provable.constraintSystem(() => {
  Provable.witness(UInt64, () => 5n).assertEquals(UInt64.from(5), 'msg');
});
expect(withMessage.digest).toEqual(plain.digest);

console.log('CircuitValue.assertEquals() error messages work! 🎉');
