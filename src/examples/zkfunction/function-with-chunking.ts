import { Field, Cache, Bytes, Gadgets, ZkFunction, UInt64, UInt32, Provable, Undefined, assert } from 'o1js';

import { ZkProgram, Crypto, createEcdsa, createForeignCurve, Bool, Hash } from 'o1js';

class Bytes32 extends Bytes(32) {}

/*


const ChunkedProgram = ZkProgram({
  name: 'function-with-chunking',
  numChunks: 1,
  methods: {
    main: {
      privateInputs: [],
      async method() {
        Gadgets.SHA2.hash(256, Bytes.fromString('abc'));
      },
    },
  },
});

(async () => {
  console.log('ChunkedProgram...');
  console.log('compiling Chunking...');
  const { verificationKey } = await ChunkedProgram.compile();
  console.log('Chunking compiled!');

  console.log('analyzing Chunking...');
  let analysis = await ChunkedProgram.analyzeMethods();
  console.log(analysis);

  let { proof } = await ChunkedProgram.main();
  console.log('Proof:', proof);

  let ok = await ChunkedProgram.verify(proof);
  console.log('Verified?', ok);
})();
*/

// **************************************



const ChunkedFunction = ZkFunction({
  name: 'function-with-chunking',
  privateInputTypes: [],
  lazyMode: true,
  main: () => {
    Gadgets.SHA2.hash(256, Bytes.fromString('abc'));
  },
});



(async () => {
  console.log('ChunkedFunction...');
  console.log('compiling Chunking...');
  const { verificationKey } = await ChunkedFunction.compile();
  console.log('Chunking compiled!');

  console.log('analyzing Chunking...');
  let analysis = await ChunkedFunction.constraintSystem();
  console.log(analysis);

  let proof = await ChunkedFunction.prove();
  console.log('Proof:', proof);

  let ok = await ChunkedFunction.verify(proof, verificationKey);
  console.log('Verified?', ok);
})();

