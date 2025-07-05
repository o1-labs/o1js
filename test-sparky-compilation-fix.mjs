#!/usr/bin/env node

import { SmartContract, State, state, Field, method, switchBackend, declareMethods } from './dist/node/index.js';

async function test() {
  console.log('Switching to Sparky backend...');
  await switchBackend('sparky');
  
  class TestContract extends SmartContract {
    constructor(address) {
      super(address);
      this.value = State();
    }
    
    async increment() {
      const current = this.value.getAndRequireEquals();
      this.value.set(current.add(1));
    }
  }
  
  // Apply decorators
  state(Field)(TestContract.prototype, 'value');
  declareMethods(TestContract, { increment: [] });
  
  try {
    console.log('Starting compilation...');
    await TestContract.compile();
    console.log('✅ Compilation succeeded!');
  } catch (error) {
    console.error('❌ Compilation failed:', error);
  }
}

test().catch(console.error);