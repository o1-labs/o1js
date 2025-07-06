/**
 * Debug the Recursive Base VK hash issue
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

const RecursiveBase = ZkProgram({
  name: 'RecursiveBase',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    base: {
      privateInputs: [Field],
      async method(publicInput, privateInput) {
        return { publicOutput: publicInput.add(privateInput) };
      },
    },
  },
});

async function debugRecursiveBase() {
  console.log('🔍 Debugging Recursive Base VK hash issue...\n');
  
  // Test with Snarky
  console.log('📊 Snarky backend:');
  await switchBackend('snarky');
  
  const snarkyResult = await RecursiveBase.compile();
  console.log('Snarky VK hash (raw object):', snarkyResult.verificationKey.hash);
  console.log('Snarky VK hash (type):', typeof snarkyResult.verificationKey.hash);
  console.log('Snarky VK hash (structure):', JSON.stringify(snarkyResult.verificationKey.hash, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
  
  const snarkyAnalysis = await RecursiveBase.analyzeMethods();
  console.log('Snarky analysis:', snarkyAnalysis);
  
  // Test with Sparky
  console.log('\n📊 Sparky backend:');
  await switchBackend('sparky');
  
  const sparkyResult = await RecursiveBase.compile();
  console.log('Sparky VK hash (raw object):', sparkyResult.verificationKey.hash);
  console.log('Sparky VK hash (type):', typeof sparkyResult.verificationKey.hash);
  console.log('Sparky VK hash (structure):', JSON.stringify(sparkyResult.verificationKey.hash, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
  
  const sparkyAnalysis = await RecursiveBase.analyzeMethods();
  console.log('Sparky analysis:', sparkyAnalysis);
  
  // Check if the VK objects are actually identical
  console.log('\n🔍 Deep comparison:');
  console.log('VK objects identical:', JSON.stringify(snarkyResult.verificationKey.hash) === JSON.stringify(sparkyResult.verificationKey.hash));
  
  // Extract the actual hash values
  const snarkyHashValue = snarkyResult.verificationKey.hash.value[1][1].toString();
  const sparkyHashValue = sparkyResult.verificationKey.hash.value[1][1].toString();
  
  console.log('Snarky hash value:', snarkyHashValue);
  console.log('Sparky hash value:', sparkyHashValue);
  console.log('Hash values identical:', snarkyHashValue === sparkyHashValue);
  
  // Check if this is a default/fallback value
  console.log('\n🚨 Investigating if this is a default value:');
  console.log('Hash value length:', snarkyHashValue.length);
  console.log('Is suspiciously round number:', snarkyHashValue.match(/^12345|^11111|^00000|^99999/));
}

debugRecursiveBase().catch(console.error);