import { ZkProgram, Field, Provable } from './dist/node/index.js';

// Program with simple addition
const AddProgram = ZkProgram({
  name: 'AddProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    add: {
      privateInputs: [],
      async method(x) {
        console.log('📍 Method called with:', x);
        console.log('📍 x type:', typeof x);
        console.log('📍 x constructor:', x?.constructor?.name);
        
        const one = Field(1);
        console.log('📍 Created Field(1):', one);
        
        const result = x.add(one);
        console.log('📍 Addition result:', result);
        console.log('📍 Result type:', typeof result);
        console.log('📍 Result constructor:', result?.constructor?.name);
        
        // Explicit return with publicOutput
        return { publicOutput: result };
      }
    }
  }
});

async function test() {
  console.log('🧪 Testing Simple Addition');
  
  try {
    console.log('\n📋 Compiling...');
    const { verificationKey } = await AddProgram.compile();
    console.log('✅ Compilation successful');
    
    console.log('\n🔨 Creating proof...');
    const input = Field(5);
    console.log('📍 Input value:', input);
    
    const result = await AddProgram.add(input);
    console.log('📍 Proof result:', result);
    console.log('📍 Result keys:', Object.keys(result));
    console.log('📍 Result.proof:', result.proof);
    console.log('📍 Result.proof.publicOutput:', result.proof?.publicOutput);
    
    if (result.proof?.publicOutput) {
      console.log('📍 PublicOutput toString:', result.proof.publicOutput.toString());
    }
    
    console.log('✅ Proof created');
    
    console.log('\n✓ Verifying proof...');
    const isValid = await AddProgram.verify(result.proof);
    console.log('✅ Proof verified:', isValid);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();