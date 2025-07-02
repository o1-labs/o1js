#!/usr/bin/env node

import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Minimal program to trace constraint flow
const MinimalProgram = ZkProgram({
  name: 'MinimalProgram',
  publicInput: undefined,
  methods: {
    simple: {
      privateInputs: [Field, Field],
      async method(a, b) {
        console.log('METHOD: Entering simple method');
        console.log('METHOD: a is constant?', a.isConstant());
        console.log('METHOD: b is constant?', b.isConstant());
        console.log('METHOD: About to multiply');
        let c = a.mul(b);
        console.log('METHOD: Multiplication done, c is constant?', c.isConstant());
        return c;
      }
    }
  }
});

async function traceConstraintFlow() {
  console.log('=== Tracing Constraint Flow ===\n');
  
  await switchBackend('sparky');
  
  console.log('MAIN: Starting compilation...\n');
  
  try {
    const { verificationKey } = await MinimalProgram.compile();
    console.log('\nMAIN: Compilation complete');
    console.log('MAIN: VK hash:', verificationKey.hash.toString());
  } catch (error) {
    console.error('MAIN: Compilation failed:', error.message);
  }
  
  console.log('\n=== Flow Analysis ===');
  console.log('1. Look for "Gate calls before entering context" - should be 0');
  console.log('2. Look for "gates.generic called" - shows when constraints are added');
  console.log('3. Look for "About to get constraint system" - shows when OCaml queries');
  console.log('4. Check if gate calls happen between entering context and getting constraints');
}

traceConstraintFlow().catch(console.error);