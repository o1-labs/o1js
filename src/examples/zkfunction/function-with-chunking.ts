import { Field, Cache, Gadgets, ZkFunction, UInt64, UInt32, Provable, Undefined, assert } from 'o1js';

const Chunking = ZkFunction({
  name: 'function-with-chunking',
  privateInputTypes: [],
  main: () => {
    // FIXME: this function runs forever in my local test @querolita
    let a = Provable.witness(Field, () => 10n);
    a.div(2).assertEquals(Field.from(5));  
  },
});

(async () => {
  console.log('compiling Chunking...');
  const { verificationKey } = await Chunking.compile();
  console.log('Chunking compiled!');

  console.log('analyzing Chunking...');
  let analysis = await Chunking.constraintSystem();
  console.log(analysis); // or analysis.summary() if you define one

  let proof = await Chunking.prove();
  console.log('Proof:', proof);

  let ok = await Chunking.verify(proof, verificationKey);
  console.log('Verified?', ok);
})();
