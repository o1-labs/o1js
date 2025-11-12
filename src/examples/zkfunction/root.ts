import { assert, Experimental, Field, Gadgets } from 'o1js';
const { ZkFunction } = Experimental;

/**
 * Public input: a field element x
 *
 * Prove:
 *   I know a value y < 2^64 that is a cube root of x.
 */
const main = ZkFunction({
  name: 'Main',
  publicInputType: Field,
  privateInputTypes: [Field],
  main: (x: Field, y: Field) => {
    Gadgets.rangeCheck64(y);
    let y3 = y.square().mul(y);
    y3.assertEquals(x);
  },
});

console.time('compile...');
const { verificationKey } = await main.compile();
console.timeEnd('compile...');

const x = Field(8);
const y = Field(2);

console.time('prove...');
const proof = await main.prove(x, y);
console.timeEnd('prove...');

console.time('verify...');
let ok = await main.verify(proof, verificationKey);
console.timeEnd('verify...');

assert(ok, 'proof should verify');

console.log('testing round trips');

/*
ok = await proofRoundTrip(proof).verify(verificationKey);
assert(ok, 'proof should verify');


console.log('verification key round trip...');

ok = await proof.verify(verificationKeyRoundTrip(verificationKey));

assert(ok, 'proof should verify');

function proofRoundTrip(proof: Experimental.KimchiProof): Experimental.KimchiProof {
  let json = proof.toJSON();
  console.log('proof json:', {
    proof: json.proof.slice(0, 10),
    publicInputFields: json.publicInputFields,
  });
  return Experimental.KimchiProof.fromJSON(json);
}

function verificationKeyRoundTrip(
  vk: Experimental.KimchiVerificationKey
): Experimental.KimchiVerificationKey {
  let json = vk.toString();
  console.log('vk string:', json.slice(0, 10));
  return Experimental.KimchiVerificationKey.fromString(json);
}
 */