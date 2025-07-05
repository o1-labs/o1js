// Simple Comparison Test
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testSimpleComparison() {
  console.log('=== Simple Comparison Test ===');
  
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  try {
    const a = Field(5);
    const b = Field(10);
    
    console.log('Created fields:', a.toString(), b.toString());
    
    console.log('Testing lessThan...');
    const result = a.lessThan(b);
    console.log('Result:', result);
    console.log('Result type:', typeof result);
    console.log('Result toString:', result?.toString());
    
    return result;
  } catch (error) {
    console.log('Error:', error.message);
    return null;
  }
}

testSimpleComparison().catch(console.error);