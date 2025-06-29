import { Field, Group, ZkProgram } from '../../../../../index.js';

describe('EC Add Constraint Generation', () => {
  it('should generate constraints for basic Group operations', async () => {
    const ECConstraintTest = ZkProgram({
      name: 'ECConstraintTest',
      publicInput: Field,
      
      methods: {
        testBasicGroupOps: {
          privateInputs: [],
          method(publicInput: Field) {
            // Use Group operations that should trigger ecAdd
            const g = Group.generator;
            
            // Basic operations that should use ecAdd internally
            const double_g = g.add(g);        // 2G
            const triple_g = double_g.add(g); // 3G
            const quad_g = triple_g.add(g);   // 4G
            
            // Test some group properties (these create constraints)
            // Associativity: (g + g) + g = g + (g + g)
            const left = g.add(g).add(g);
            const right = g.add(g.add(g));
            left.assertEquals(right);
            
            // Identity: g + 0 = g
            const identity_test = g.add(Group.zero);
            identity_test.assertEquals(g);
            
            // Basic field assertion to make the method valid
            publicInput.assertEquals(Field(1));
          }
        }
      }
    });

    // Test compilation (constraint generation)
    const startTime = Date.now();
    const { verificationKey } = await ECConstraintTest.compile();
    const endTime = Date.now();
    
    expect(verificationKey).toBeDefined();
    expect(verificationKey.data).toBeTruthy();
    expect(verificationKey.hash).toBeTruthy();
    
    // Compilation should complete in reasonable time
    expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
  });

  it('should handle point at infinity in constraints', async () => {
    const InfinityTest = ZkProgram({
      name: 'InfinityTest',
      publicInput: Field,
      
      methods: {
        testInfinity: {
          privateInputs: [],
          method(publicInput: Field) {
            const g = Group.generator;
            const zero = Group.zero;
            
            // g + 0 = g
            const sum1 = g.add(zero);
            sum1.assertEquals(g);
            
            // 0 + g = g
            const sum2 = zero.add(g);
            sum2.assertEquals(g);
            
            // 0 + 0 = 0
            const sum3 = zero.add(zero);
            sum3.assertEquals(zero);
            
            publicInput.assertEquals(Field(1));
          }
        }
      }
    });

    const { verificationKey } = await InfinityTest.compile();
    expect(verificationKey).toBeDefined();
  });

  it('should generate constraints for complex Group expressions', async () => {
    const ComplexTest = ZkProgram({
      name: 'ComplexGroupTest',
      publicInput: Field,
      
      methods: {
        testComplex: {
          privateInputs: [Field],
          method(publicInput: Field, scalar: Field) {
            const g = Group.generator;
            
            // Combination of add and scale operations
            const p1 = g.scale(scalar);
            const p2 = g.add(g);
            const p3 = p1.add(p2);
            
            // Test commutativity: p1 + p2 = p2 + p1
            const sum1 = p1.add(p2);
            const sum2 = p2.add(p1);
            sum1.assertEquals(sum2);
            
            publicInput.assertEquals(Field(1));
          }
        }
      }
    });

    const { verificationKey } = await ComplexTest.compile();
    expect(verificationKey).toBeDefined();
  });
});