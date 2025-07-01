/**
 * VK Edge Cases Test Suite
 * Tests specific edge cases and constraint patterns that might reveal VK differences
 */

import { 
  Field, 
  Bool,
  Group,
  Scalar,
  Poseidon,
  ZkProgram, 
  Provable,
  UInt64,
  UInt32,
  switchBackend,
  Circuit,
  Gadgets
} from 'o1js';

describe('VK Edge Cases', () => {
  
  beforeAll(async () => {
    // Ensure we start with a clean state
    await switchBackend('snarky');
  });

  async function compareConstraintSystems(name: string, fn: () => void) {
    console.log(`\n${name}:`);
    
    // Get Snarky constraint system
    await switchBackend('snarky');
    const snarkyCs = await Circuit.constraintSystem(fn);
    console.log(`  Snarky: ${snarkyCs.gates.length} gates`);
    
    // Get Sparky constraint system  
    await switchBackend('sparky');
    const sparkyCs = await Circuit.constraintSystem(fn);
    console.log(`  Sparky: ${sparkyCs.gates.length} gates`);
    
    // Compare
    const match = JSON.stringify(snarkyCs) === JSON.stringify(sparkyCs);
    console.log(`  Match: ${match ? '✅' : '❌'}`);
    
    if (!match) {
      // Find first difference
      const snarkyGates = snarkyCs.gates;
      const sparkyGates = sparkyCs.gates;
      
      if (snarkyGates.length !== sparkyGates.length) {
        console.log(`  Gate count differs: ${snarkyGates.length} vs ${sparkyGates.length}`);
      }
      
      for (let i = 0; i < Math.min(snarkyGates.length, sparkyGates.length); i++) {
        if (JSON.stringify(snarkyGates[i]) !== JSON.stringify(sparkyGates[i])) {
          console.log(`  First difference at gate ${i}:`);
          console.log(`    Snarky: ${JSON.stringify(snarkyGates[i]).substring(0, 100)}...`);
          console.log(`    Sparky: ${JSON.stringify(sparkyGates[i]).substring(0, 100)}...`);
          break;
        }
      }
    }
    
    await switchBackend('snarky'); // Reset
    return { snarkyCs, sparkyCs, match };
  }

  describe('Empty and Minimal Circuits', () => {
    it('should handle empty circuit', async () => {
      await compareConstraintSystems('Empty circuit', () => {
        // No constraints at all
      });
    });

    it('should handle single constant', async () => {
      await compareConstraintSystems('Single constant', () => {
        const x = Field(42);
        x.assertEquals(Field(42));
      });
    });

    it('should handle single witness', async () => {
      await compareConstraintSystems('Single witness', () => {
        const x = Provable.witness(Field, () => Field(42));
        x.assertEquals(x);
      });
    });
  });

  describe('Constraint Reduction Patterns', () => {
    it('should handle linear combination reduction', async () => {
      await compareConstraintSystems('Linear combination', () => {
        const x = Provable.witness(Field, () => Field(1));
        // This should reduce to 6*x
        const result = x.add(x).add(x).add(x).add(x).add(x);
        result.assertEquals(Field(6));
      });
    });

    it('should handle nested additions', async () => {
      await compareConstraintSystems('Nested additions', () => {
        const x = Provable.witness(Field, () => Field(1));
        const y = Provable.witness(Field, () => Field(2));
        // Complex nested structure
        const a = x.add(y);
        const b = a.add(x);
        const c = b.add(y);
        const d = c.add(a);
        d.assertEquals(Field(10)); // 2x + 2y + (x + y) = 3x + 3y = 3*1 + 3*2 = 9
      });
    });

    it('should handle scale operations', async () => {
      await compareConstraintSystems('Scale operations', () => {
        const x = Provable.witness(Field, () => Field(1));
        // Different ways to scale
        const a = x.mul(Field(5));
        const b = x.add(x).add(x).add(x).add(x); // Should reduce to same as a
        a.assertEquals(b);
      });
    });
  });

  describe('Boolean Constraint Patterns', () => {
    it('should handle boolean to field conversion', async () => {
      await compareConstraintSystems('Boolean to field', () => {
        const b = Provable.witness(Bool, () => Bool(true));
        const f = b.toField();
        f.mul(f).assertEquals(f); // b^2 = b for booleans
      });
    });

    it('should handle complex boolean logic', async () => {
      await compareConstraintSystems('Complex boolean', () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const c = Provable.witness(Bool, () => Bool(true));
        
        const result = a.and(b).or(c.and(a.not()));
        result.assertEquals(Bool(false));
      });
    });
  });

  describe('Edge Case Values', () => {
    it('should handle field max value', async () => {
      await compareConstraintSystems('Field max', () => {
        const max = Field.ORDER - 1n;
        const x = Provable.witness(Field, () => Field(max));
        x.add(Field(1)).assertEquals(Field(0)); // Should wrap around
      });
    });

    it('should handle zero operations', async () => {
      await compareConstraintSystems('Zero operations', () => {
        const zero = Field(0);
        const x = Provable.witness(Field, () => Field(42));
        
        x.mul(zero).assertEquals(zero);
        x.add(zero).assertEquals(x);
        zero.div(x).assertEquals(zero);
      });
    });
  });

  describe('Witness Generation Patterns', () => {
    it('should handle conditional witness creation', async () => {
      await compareConstraintSystems('Conditional witness', () => {
        const condition = Provable.witness(Bool, () => Bool(true));
        const x = Provable.witness(Field, () => Field(10));
        const y = Provable.witness(Field, () => Field(20));
        
        const result = Provable.if(condition, x, y);
        result.assertEquals(Field(10));
      });
    });

    it('should handle array of witnesses', async () => {
      await compareConstraintSystems('Witness array', () => {
        const arr = Provable.witness(Provable.Array(Field, 5), () => 
          [Field(1), Field(2), Field(3), Field(4), Field(5)]
        );
        
        let sum = Field(0);
        for (const elem of arr) {
          sum = sum.add(elem);
        }
        sum.assertEquals(Field(15));
      });
    });
  });

  describe('Range Check Patterns', () => {
    it('should handle UInt64 operations', async () => {
      await compareConstraintSystems('UInt64', () => {
        const x = Provable.witness(UInt64, () => UInt64.from(42));
        const y = Provable.witness(UInt64, () => UInt64.from(58));
        
        const sum = x.add(y);
        sum.assertEquals(UInt64.from(100));
      });
    });

    it('should handle UInt32 operations', async () => {
      await compareConstraintSystems('UInt32', () => {
        const x = Provable.witness(UInt32, () => UInt32.from(1000));
        const y = Provable.witness(UInt32, () => UInt32.from(2000));
        
        const sum = x.add(y);
        sum.assertEquals(UInt32.from(3000));
      });
    });
  });

  describe('Hash Function Patterns', () => {
    it('should handle single field hash', async () => {
      await compareConstraintSystems('Single hash', () => {
        const x = Provable.witness(Field, () => Field(42));
        const hash = Poseidon.hash([x]);
        hash.assertEquals(hash); // Just checking constraint generation
      });
    });

    it('should handle multi-field hash', async () => {
      await compareConstraintSystems('Multi hash', () => {
        const fields = Provable.witness(Provable.Array(Field, 10), () => 
          Array.from({ length: 10 }, (_, i) => Field(i))
        );
        
        const hash = Poseidon.hash(fields);
        hash.assertEquals(hash);
      });
    });
  });

  describe('EC Operation Patterns', () => {
    it('should handle group identity', async () => {
      await compareConstraintSystems('Group identity', () => {
        const g = Provable.witness(Group, () => Group.generator);
        const identity = g.sub(g);
        identity.assertEquals(Group.zero);
      });
    });

    it('should handle scalar multiplication', async () => {
      await compareConstraintSystems('Scalar mul', () => {
        const g = Provable.witness(Group, () => Group.generator);
        const s = Provable.witness(Scalar, () => Scalar.from(42));
        
        const result = g.scale(s);
        result.assertEquals(result); // Just checking constraint generation
      });
    });
  });

  describe('Complex Gadgets', () => {
    it('should handle bit decomposition', async () => {
      await compareConstraintSystems('Bit decomposition', () => {
        const x = Provable.witness(Field, () => Field(42));
        const bits = Gadgets.toBits(x, 8);
        
        // Reconstruct from bits
        let reconstructed = Field(0);
        let power = Field(1);
        for (const bit of bits) {
          reconstructed = reconstructed.add(bit.toField().mul(power));
          power = power.mul(Field(2));
        }
        reconstructed.assertEquals(x);
      });
    });
  });

  describe('Constraint System Analysis', () => {
    it('should generate detailed constraint comparison', async () => {
      const SimpleProgram = ZkProgram({
        name: 'ConstraintAnalysis',
        publicInput: Field,
        methods: {
          simple: {
            privateInputs: [Field],
            async method(pub, x) {
              x.mul(2).assertEquals(pub);
            }
          }
        }
      });

      console.log('\nDetailed constraint system comparison:');
      
      // Compile with both backends
      await switchBackend('snarky');
      await SimpleProgram.compile();
      const snarkyCs = await SimpleProgram.analyzeMethods();
      
      await switchBackend('sparky');
      await SimpleProgram.compile();
      const sparkyCs = await SimpleProgram.analyzeMethods();
      
      console.log('Snarky constraint system:', JSON.stringify(snarkyCs, null, 2));
      console.log('Sparky constraint system:', JSON.stringify(sparkyCs, null, 2));
      
      await switchBackend('snarky');
    });
  });
});