#!/usr/bin/env node

import { Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testAddPattern() {
  console.log('Testing Add pattern detection in Sparky...\n');
  
  // Test with Snarky first
  console.log('Backend:', getCurrentBackend());
  
  // Create a simple addition constraint
  const a = Field(5);
  const b = Field(7);
  const c = Field(12);
  
  // This should create: a + b = c constraint
  a.add(b).assertEquals(c);
  
  console.log('✅ Snarky constraint created\n');
  
  // Switch to Sparky
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  // Create the same constraint
  const a2 = Field(5);
  const b2 = Field(7);
  const c2 = Field(12);
  
  // This should create: a + b = c constraint
  console.log('Creating a.add(b).assertEquals(c)...');
  a2.add(b2).assertEquals(c2);
  
  console.log('✅ Sparky constraint created');
  console.log('\nIf pattern matching works, both backends should generate the same constraint.');
}

testAddPattern().catch(console.error);