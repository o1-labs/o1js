import { switchBackend, Field, ZkProgram, Void } from './dist/node/index.js';
import fs from 'fs';

// Access internal constraint system operations from the wrapper
const wasm = await import('./dist/node/bindings/compiled/_node_bindings/plonk_wasm.cjs');

async function debugPermutationData() {
  console.log('Debugging Sparky Permutation Data\n');
  
  await switchBackend('sparky');
  
  console.log('1. Creating simple constraint system...');
  
  // Create a constraint system using the low-level API
  const sparky = globalThis.backendContext;
  if (!sparky) {
    console.error('❌ Backend context not available');
    return;
  }
  
  // Generate constraint system by running witness generation
  const cs = sparky.field.createConstraintSystem(() => {
    const x = sparky.field.exists(1, () => '1');
    const zero = sparky.field.constant('0');
    sparky.field.assertEqual(x, zero);
  });
  
  console.log('\n2. Getting constraint system JSON...');
  
  try {
    // Get the JSON representation
    const csJson = sparky.field.toJson(cs);
    const parsedCs = JSON.parse(csJson);
    
    console.log('\n3. Constraint System Analysis:');
    console.log(`   Total constraints: ${parsedCs.constraints.length}`);
    console.log(`   Total variables: ${parsedCs.variable_count}`);
    console.log(`   Public input size: ${parsedCs.public_input_size}`);
    
    console.log('\n4. Constraints:');
    parsedCs.constraints.forEach((constraint, idx) => {
      console.log(`   Constraint ${idx}:`, JSON.stringify(constraint, null, 2));
    });
    
    console.log('\n5. Permutation Data:');
    if (parsedCs.permutation) {
      console.log(`   Number of cycles: ${parsedCs.permutation.length}`);
      parsedCs.permutation.forEach((cycle, idx) => {
        console.log(`\n   Cycle ${idx}:`);
        console.log(`     Variables: ${cycle.variables.join(', ')}`);
        console.log(`     Positions: ${cycle.positions.length} positions`);
        cycle.positions.forEach(pos => {
          console.log(`       Wire (${pos.row}, ${pos.col})`);
        });
      });
    } else {
      console.log('   ❌ No permutation data found');
    }
    
    console.log('\n6. Wire to Variable Mapping:');
    if (parsedCs.wire_to_variable) {
      Object.entries(parsedCs.wire_to_variable).forEach(([key, value]) => {
        console.log(`   ${key} → Variable ${value}`);
      });
    }
    
    console.log('\n7. Permutation Mapping (wire position transitions):');
    if (parsedCs.permutation_mapping) {
      Object.entries(parsedCs.permutation_mapping).forEach(([from, to]) => {
        console.log(`   ${from} → ${to}`);
      });
    }
    
    // Save the full constraint system for analysis
    fs.writeFileSync('sparky-constraint-system.json', JSON.stringify(parsedCs, null, 2));
    console.log('\n8. Full constraint system saved to sparky-constraint-system.json');
    
  } catch (error) {
    console.error('Error getting constraint system JSON:', error);
  }
  
  // Test with the actual program
  console.log('\n9. Testing with actual ZkProgram...\n');
  
  const OneConstraintProgram = ZkProgram({
    name: 'OneConstraintProgram',
    publicInput: Field,
    publicOutput: Void,
    methods: {
      test: {
        privateInputs: [],
        async method(x) {
          x.assertEquals(Field(0));
        }
      }
    }
  });
  
  try {
    console.log('Compiling...');
    await OneConstraintProgram.compile();
    console.log('✅ Compilation successful');
    
    console.log('\nCreating proof with valid input...');
    const proof = await OneConstraintProgram.test(Field(0));
    console.log('✅ Proof created successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugPermutationData().catch(console.error);