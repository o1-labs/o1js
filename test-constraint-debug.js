import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Simple program to debug constraint generation
const DebugProgram = ZkProgram({
  name: "DebugProgram",
  
  methods: {
    testMul: {
      privateInputs: [Field, Field],
      async method(a, b) {
        console.log('Test case: a.mul(b).assertEquals(Field(100))');
        console.log('This should generate R1CS(a,b,z) then Equal(z,100)');
        console.log('Snarky optimizes to R1CS(a,b,100) - one constraint');
        
        // This is the pattern that needs optimization
        const z = a.mul(b);
        z.assertEquals(Field(100));
      },
    },
  },
});

async function test() {
  // Enable Rust logging
  process.env.RUST_LOG = 'sparky_core=info';
  
  console.log('🔬 Testing Constraint Generation\n');
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log('Backend switched to Sparky');
  
  console.log('Compiling program...');
  const result = await DebugProgram.compile();
  console.log('Compilation complete');
}

test().catch(console.error);