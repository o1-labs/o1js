/**
 * Simple VK Parity Test - Focus on the core VK parity blocker
 * 
 * Replaces complex test infrastructure with direct, actionable testing
 */

import { Field, ZkProgram, verify } from '../../../dist/node/index.js';
import { SimplePbtReporter, VkParityResult } from './simple-pbt-reporter.js';

export class SimpleVkParityTest {
  private reporter: SimplePbtReporter;

  constructor() {
    this.reporter = new SimplePbtReporter();
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Simple VK Parity Tests...');
    
    const results: VkParityResult[] = [];
    
    // Test 1: Basic field operation
    results.push(await this.testBasicFieldOperation());
    
    // Test 2: Simple constraint
    results.push(await this.testSimpleConstraint());
    
    // Test 3: Multiple constraints
    results.push(await this.testMultipleConstraints());
    
    // Test 4: Poseidon hash
    results.push(await this.testPoseidonHash());
    
    // Test 5: Conditional logic
    results.push(await this.testConditionalLogic());
    
    // Generate report
    await this.reporter.generateReport(results);
    
    // Exit with appropriate code
    const passing = results.filter(r => r.matches).length;
    process.exit(passing === results.length ? 0 : 1);
  }

  private async testBasicFieldOperation(): Promise<VkParityResult> {
    const testName = 'Basic Field Operation';
    const startTime = Date.now();
    
    try {
      // Import switchBackend function
      const { switchBackend } = await import('../../../dist/node/index.js');
      
      const program = ZkProgram({
        name: 'BasicField',
        publicInput: Field,
        methods: {
          add: {
            privateInputs: [Field],
            async method(publicInput: Field, privateInput: Field) {
              const sum = publicInput.add(privateInput);
              sum.assertEquals(Field(10)); // Simple constraint
            }
          }
        }
      });
      
      // Test with Snarky
      await switchBackend('snarky');
      const { verificationKey: snarkyVk } = await program.compile();
      const snarkyHash = this.hashVk(snarkyVk);
      
      // Test with Sparky
      await switchBackend('sparky');
      const { verificationKey: sparkyVk } = await program.compile();
      const sparkyHash = this.hashVk(sparkyVk);
      
      const duration = Date.now() - startTime;
      return {
        testName,
        snarkyVkHash: snarkyHash,
        sparkyVkHash: sparkyHash,
        matches: snarkyHash === sparkyHash,
        duration
      };
      
    } catch (error) {
      return {
        testName,
        snarkyVkHash: 'error',
        sparkyVkHash: 'error',
        matches: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  private async testSimpleConstraint(): Promise<VkParityResult> {
    const testName = 'Simple Constraint';
    const startTime = Date.now();
    
    try {
      const { switchBackend } = await import('../../../dist/node/index.js');
      
      const program = ZkProgram({
        name: 'SimpleConstraint',
        publicInput: Field,
        methods: {
          square: {
            privateInputs: [Field],
            async method(publicInput: Field, privateInput: Field) {
              const squared = privateInput.mul(privateInput);
              squared.assertEquals(publicInput);
            }
          }
        }
      });
      
      // Test with Snarky
      await switchBackend('snarky');
      const { verificationKey: snarkyVk } = await program.compile();
      const snarkyHash = this.hashVk(snarkyVk);
      
      // Test with Sparky
      await switchBackend('sparky');
      const { verificationKey: sparkyVk } = await program.compile();
      const sparkyHash = this.hashVk(sparkyVk);
      
      const duration = Date.now() - startTime;
      return {
        testName,
        snarkyVkHash: snarkyHash,
        sparkyVkHash: sparkyHash,
        matches: snarkyHash === sparkyHash,
        duration
      };
      
    } catch (error) {
      return {
        testName,
        snarkyVkHash: 'error',
        sparkyVkHash: 'error',
        matches: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  private async testMultipleConstraints(): Promise<VkParityResult> {
    const testName = 'Multiple Constraints';
    const startTime = Date.now();
    
    try {
      const { switchBackend } = await import('../../../dist/node/index.js');
      
      const program = ZkProgram({
        name: 'MultipleConstraints',
        publicInput: Field,
        methods: {
          complex: {
            privateInputs: [Field, Field],
            async method(publicInput: Field, a: Field, b: Field) {
              const sum = a.add(b);
              const product = a.mul(b);
              sum.assertEquals(publicInput);
              product.assertEquals(Field(12)); // Second constraint
            }
          }
        }
      });
      
      // Test with Snarky
      await switchBackend('snarky');
      const { verificationKey: snarkyVk } = await program.compile();
      const snarkyHash = this.hashVk(snarkyVk);
      
      // Test with Sparky
      await switchBackend('sparky');
      const { verificationKey: sparkyVk } = await program.compile();
      const sparkyHash = this.hashVk(sparkyVk);
      
      const duration = Date.now() - startTime;
      return {
        testName,
        snarkyVkHash: snarkyHash,
        sparkyVkHash: sparkyHash,
        matches: snarkyHash === sparkyHash,
        duration
      };
      
    } catch (error) {
      return {
        testName,
        snarkyVkHash: 'error',
        sparkyVkHash: 'error',
        matches: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  private async testPoseidonHash(): Promise<VkParityResult> {
    const testName = 'Poseidon Hash';
    const startTime = Date.now();
    
    try {
      const { switchBackend, Poseidon } = await import('../../../dist/node/index.js');
      
      const program = ZkProgram({
        name: 'PoseidonTest',
        publicInput: Field,
        methods: {
          hash: {
            privateInputs: [Field],
            async method(publicInput: Field, preimage: Field) {
              const hash = Poseidon.hash([preimage]);
              hash.assertEquals(publicInput);
            }
          }
        }
      });
      
      // Test with Snarky
      await switchBackend('snarky');
      const { verificationKey: snarkyVk } = await program.compile();
      const snarkyHash = this.hashVk(snarkyVk);
      
      // Test with Sparky
      await switchBackend('sparky');
      const { verificationKey: sparkyVk } = await program.compile();
      const sparkyHash = this.hashVk(sparkyVk);
      
      const duration = Date.now() - startTime;
      return {
        testName,
        snarkyVkHash: snarkyHash,
        sparkyVkHash: sparkyHash,
        matches: snarkyHash === sparkyHash,
        duration
      };
      
    } catch (error) {
      return {
        testName,
        snarkyVkHash: 'error',
        sparkyVkHash: 'error',
        matches: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  private async testConditionalLogic(): Promise<VkParityResult> {
    const testName = 'Conditional Logic';
    const startTime = Date.now();
    
    try {
      const { switchBackend, Provable } = await import('../../../dist/node/index.js');
      
      const program = ZkProgram({
        name: 'ConditionalTest',
        publicInput: Field,
        methods: {
          conditional: {
            privateInputs: [Field, Field],
            async method(publicInput: Field, condition: Field, value: Field) {
              const isZero = condition.equals(Field(0));
              const result = Provable.if(isZero, Field(0), value);
              result.assertEquals(publicInput);
            }
          }
        }
      });
      
      // Test with Snarky
      await switchBackend('snarky');
      const { verificationKey: snarkyVk } = await program.compile();
      const snarkyHash = this.hashVk(snarkyVk);
      
      // Test with Sparky
      await switchBackend('sparky');
      const { verificationKey: sparkyVk } = await program.compile();
      const sparkyHash = this.hashVk(sparkyVk);
      
      const duration = Date.now() - startTime;
      return {
        testName,
        snarkyVkHash: snarkyHash,
        sparkyVkHash: sparkyHash,
        matches: snarkyHash === sparkyHash,
        duration
      };
      
    } catch (error) {
      return {
        testName,
        snarkyVkHash: 'error',
        sparkyVkHash: 'error',
        matches: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  private hashVk(vk: any): string {
    try {
      // Simple hash of the verification key data
      const vkString = JSON.stringify(vk);
      let hash = 0;
      for (let i = 0; i < vkString.length; i++) {
        const char = vkString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    } catch (error) {
      return 'hash-error';
    }
  }
}

// CLI interface
if (require.main === module) {
  const test = new SimpleVkParityTest();
  test.runAllTests().catch(console.error);
}