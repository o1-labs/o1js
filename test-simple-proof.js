#!/usr/bin/env node

import { Field, ZkProgram } from './dist/node/index.js';

const SimpleProgram = ZkProgram({
  name: 'SimpleTest',
  publicInput: Field,
  
  methods: {
    base: {
      privateInputs: [],
      async method(x) {
        x.assertEquals(x);
      },
    },
  },
});

async function runTest() {
  console.log('Simple proof test\n');
  
  console.log('Compiling...');
  await SimpleProgram.compile();
  
  console.log('Generating proof...');
  try {
    const { proof } = await SimpleProgram.base(Field(0));
    console.log('✅ Proof generated successfully');
    
    console.log('Verifying proof...');
    const isValid = await SimpleProgram.verify(proof);
    console.log(`✅ Proof is ${isValid ? 'valid' : 'invalid'}`);
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  }
}

runTest().catch(console.error);