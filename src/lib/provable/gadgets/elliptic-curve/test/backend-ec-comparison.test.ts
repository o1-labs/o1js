import { Field, Group, ZkProgram, Cache, switchBackend, getCurrentBackend, initializeBindings } from '../../../../../index.js';

// Helper to extract constraint info from VK
function extractConstraintInfo(vk: any) {
  try {
    const vkData = typeof vk.data === 'string' ? JSON.parse(vk.data) : vk.data;
    return {
      total: vkData.num_constraints || 0,
      publicInputSize: vkData.public_input_size || 0,
      gates: vkData.gates || {}
    };
  } catch {
    return { total: 0, publicInputSize: 0, gates: {} };
  }
}

describe('EC Operations Backend Comparison', () => {
  // Test program that uses all EC operations
  const ECOperationsProgram = ZkProgram({
    name: 'ECOperationsTest',
    publicInput: Field,
    
    methods: {
      testECAdd: {
        privateInputs: [],
        method(publicInput: Field) {
          const g = Group.generator;
          const doubled = g.add(g);  // Uses ecAdd
          const tripled = doubled.add(g);
          
          // Verify associativity: (g + g) + g = g + (g + g)
          const left = g.add(g).add(g);
          const right = g.add(g.add(g));
          left.assertEquals(right);
          
          publicInput.assertEquals(Field(1));
        }
      },
      
      testECScale: {
        privateInputs: [Field],
        method(publicInput: Field, scalar: Field) {
          const g = Group.generator;
          const scaled = g.scale(scalar);  // Uses ecScale
          
          // Test some scaling properties
          const doubled1 = g.scale(Field(2));
          const doubled2 = g.add(g);
          doubled1.assertEquals(doubled2);
          
          publicInput.assertEquals(Field(2));
        }
      },
      
      testECMultiOps: {
        privateInputs: [Field, Field],
        method(publicInput: Field, scalar1: Field, scalar2: Field) {
          const g = Group.generator;
          
          // Multiple operations that may trigger different EC gates
          const p1 = g.scale(scalar1);      // ecScale
          const p2 = g.scale(scalar2);      // ecScale  
          const sum = p1.add(p2);           // ecAdd
          const doubled = sum.add(sum);     // ecAdd (doubling case)
          
          // Test distributivity: k1*G + k2*G = (k1+k2)*G
          const total_scalar = scalar1.add(scalar2);
          const expected = g.scale(total_scalar);
          sum.assertEquals(expected);
          
          publicInput.assertEquals(Field(3));
        }
      }
    }
  });

  beforeAll(async () => {
    await initializeBindings();
    // Clear any existing cache
    Cache.FileSystem.cacheDirectory = './cache-vk-test';
  });

  it('should produce identical VKs for EC operations between backends', async () => {
    const results = {
      snarky: {} as any,
      sparky: {} as any,
      differences: [] as string[]
    };
    
    // Test with Snarky backend
    await switchBackend('snarky');
    expect(getCurrentBackend()).toBe('snarky');
    
    const startSnarky = Date.now();
    const snarkyCompiled = await ECOperationsProgram.compile();
    const snarkyTime = Date.now() - startSnarky;
    
    results.snarky = {
      verificationKey: snarkyCompiled.verificationKey,
      compilationTime: snarkyTime,
      constraintCounts: extractConstraintInfo(snarkyCompiled.verificationKey)
    };
    
    // Test with Sparky backend  
    await switchBackend('sparky');
    expect(getCurrentBackend()).toBe('sparky');
    
    const startSparky = Date.now();
    const sparkyCompiled = await ECOperationsProgram.compile();
    const sparkyTime = Date.now() - startSparky;
    
    results.sparky = {
      verificationKey: sparkyCompiled.verificationKey,
      compilationTime: sparkyTime,
      constraintCounts: extractConstraintInfo(sparkyCompiled.verificationKey)
    };
    
    // Compare the verification keys
    const snarkyVKStr = JSON.stringify(results.snarky.verificationKey);
    const sparkyVKStr = JSON.stringify(results.sparky.verificationKey);
    const identical = snarkyVKStr === sparkyVKStr;
    
    expect(identical).toBe(true);
    
    // Compare constraint counts
    expect(results.snarky.constraintCounts.total).toBe(results.sparky.constraintCounts.total);
    expect(results.snarky.constraintCounts.publicInputSize).toBe(results.sparky.constraintCounts.publicInputSize);
  });

  it('should produce equivalent proofs for EC operations', async () => {
    // Switch to Sparky for testing
    await switchBackend('sparky');
    
    const { verificationKey } = await ECOperationsProgram.compile();
    
    // Test ecAdd
    const proof1 = await ECOperationsProgram.testECAdd(Field(1));
    expect(await ECOperationsProgram.verify(proof1)).toBe(true);
    
    // Test ecScale
    const proof2 = await ECOperationsProgram.testECScale(Field(2), Field(42));
    expect(await ECOperationsProgram.verify(proof2)).toBe(true);
    
    // Test combined operations
    const proof3 = await ECOperationsProgram.testECMultiOps(Field(3), Field(10), Field(20));
    expect(await ECOperationsProgram.verify(proof3)).toBe(true);
  });

  it('should handle EC edge cases consistently across backends', async () => {
    const EdgeCaseProgram = ZkProgram({
      name: 'ECEdgeCases',
      publicInput: Field,
      
      methods: {
        testZeroScale: {
          privateInputs: [],
          method(publicInput: Field) {
            const g = Group.generator;
            const zero = g.scale(Field(0));
            zero.assertEquals(Group.zero);
            publicInput.assertEquals(Field(1));
          }
        },
        
        testLargeScale: {
          privateInputs: [],
          method(publicInput: Field) {
            const g = Group.generator;
            // Large scalar that should wrap around the curve order
            const largeScalar = Field(2).pow(250);
            const scaled = g.scale(largeScalar);
            // Just verify it doesn't throw
            publicInput.assertEquals(Field(1));
          }
        }
      }
    });

    // Test with both backends
    for (const backend of ['snarky', 'sparky']) {
      await switchBackend(backend);
      const { verificationKey } = await EdgeCaseProgram.compile();
      expect(verificationKey).toBeDefined();
      
      // Generate and verify proofs
      const proof1 = await EdgeCaseProgram.testZeroScale(Field(1));
      expect(await EdgeCaseProgram.verify(proof1)).toBe(true);
      
      const proof2 = await EdgeCaseProgram.testLargeScale(Field(1));
      expect(await EdgeCaseProgram.verify(proof2)).toBe(true);
    }
  });
});