#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { execSync } from 'child_process';

async function testSparkyStderr() {
  console.log('🔍 Testing Sparky to capture stderr\n');
  
  await switchBackend('sparky');
  
  const simpleCircuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    a.add(b).assertEquals(c);
  };
  
  // Capture stderr by running in a subprocess
  const script = `
    import { Field, Provable, switchBackend } from './dist/node/index.js';
    
    async function test() {
      await switchBackend('sparky');
      const simpleCircuit = () => {
        const a = Provable.witness(Field, () => Field(5));
        const b = Provable.witness(Field, () => Field(7));
        const c = Provable.witness(Field, () => Field(12));
        a.add(b).assertEquals(c);
      };
      const cs = await Provable.constraintSystem(simpleCircuit);
      console.log('Gates:', cs.gates.length);
    }
    test();
  `;
  
  try {
    const result = execSync(`node -e "${script}"`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('stdout:', result);
  } catch (e) {
    console.log('stdout:', e.stdout);
    console.log('stderr:', e.stderr);
  }
}

testSparkyStderr().catch(console.error);