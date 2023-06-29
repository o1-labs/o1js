import { Field, Provable, Hash, UInt8 } from 'snarkyjs';

function equals(a: UInt8[], b: UInt8[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++)
    if (a[i].value.toConstant() === b[i].value.toConstant()) return false;

  return true;
}

function checkDigestHexConversion(digest: UInt8[]) {
  console.log('Checking hex->digest, digest->hex matches');
  Provable.asProver(() => {
    const hex = UInt8.toHex(digest);
    const expected = UInt8.fromHex(hex);
    if (equals(digest, expected)) {
      console.log('✅ Digest matches');
    } else {
      Provable.log(`hex: ${hex}\ndigest: ${digest}\nexpected:${expected}`);
      console.log('❌ Digest does not match');
    }
  });
}

console.log('Running SHA224 test');
Provable.runAndCheck(() => {
  let digest = Hash.SHA224.hash([new UInt8(1), new UInt8(2), new UInt8(3)]);
  checkDigestHexConversion(digest);
});

console.log('Running SHA256 test');
Provable.runAndCheck(() => {
  let digest = Hash.SHA256.hash([new UInt8(1), new UInt8(2), new UInt8(3)]);
  checkDigestHexConversion(digest);
});

console.log('Running SHA384 test');
Provable.runAndCheck(() => {
  let digest = Hash.SHA384.hash([new UInt8(1), new UInt8(2), new UInt8(3)]);
  checkDigestHexConversion(digest);
});

// TODO: This test fails
console.log('Running SHA512 test');
Provable.runAndCheck(() => {
  let digest = Hash.SHA512.hash([new UInt8(1), new UInt8(2), new UInt8(3)]);
  checkDigestHexConversion(digest);
});

console.log('Running keccak hash test');
Provable.runAndCheck(() => {
  let digest = Hash.Keccak256.hash([new UInt8(1), new UInt8(2), new UInt8(3)]);
  checkDigestHexConversion(digest);
});

console.log('Running Poseidon test');
Provable.runAndCheck(() => {
  let digest = Hash.Poseidon.hash([Field(1), Field(2), Field(3)]);
  Provable.log(digest);
});

console.log('Running default hash test');
Provable.runAndCheck(() => {
  let digest = Hash.hash([Field(1), Field(2), Field(3)]);
  Provable.log(digest);
});
