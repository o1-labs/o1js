#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

// Create a script that runs the constraint test
const script = `
import { Field, Provable, switchBackend } from './dist/node/index.js';

async function test() {
  await switchBackend('sparky');
  
  const circuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    a.add(b).assertEquals(c);
  };
  
  const cs = await Provable.constraintSystem(circuit);
  console.log('Gates:', cs.gates.length);
  console.log('First gate coeffs:', cs.gates[0].coeffs);
}

test().catch(console.error);
`;

writeFileSync('temp-test.js', script);

// Run the script and capture stderr
const child = spawn('node', ['temp-test.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
});

child.on('close', (code) => {
  console.log('=== STDOUT ===');
  console.log(stdout);
  console.log('\n=== STDERR ===');
  console.log(stderr);
  
  // Look for pattern detection
  if (stderr.includes('Detected Add')) {
    console.log('\n✅ Add pattern was detected!');
  } else {
    console.log('\n❌ Add pattern was NOT detected!');
  }
  
  // Look for constraint conversion
  if (stderr.includes('Converting Equal constraint')) {
    console.log('✅ Equal constraint conversion found');
    // Extract the constraint details
    const matches = stderr.match(/Converting Equal constraint: (.+?) = (.+?)\n/);
    if (matches) {
      console.log('  Left side:', matches[1]);
      console.log('  Right side:', matches[2]);
    }
  }
});