/**
 * DEVIOUS BACKEND PROPERTIES - RED TEAM EDITION
 * 
 * These properties implement evil, malicious tests designed to break Sparky
 * in every conceivable way. They test edge cases, resource exhaustion, state
 * corruption, timing attacks, and other devious scenarios.
 */

import fc from 'fast-check';
import type { IAsyncProperty } from 'fast-check';
import { Field, Poseidon, ZkProgram, Provable, verify, switchBackend, getCurrentBackend } from '../../../../dist/node/index.js';
import { deviousGenerators } from '../generators/DeviousFieldGenerators.js';

/**
 * Evil test result tracking
 */
interface DeviousTestResult {
  attackVector: string;
  snarkyBehavior: 'success' | 'error' | 'timeout' | 'crash' | 'memory_leak';
  sparkyBehavior: 'success' | 'error' | 'timeout' | 'crash' | 'memory_leak';
  behaviorMatch: boolean;
  snarkyTime: number;
  sparkyTime: number;
  snarkyMemory?: number;
  sparkyMemory?: number;
  snarkyError?: string;
  sparkyError?: string;
  evilnessLevel: 'mild' | 'moderate' | 'severe' | 'apocalyptic';
}

/**
 * Devious backend property tester with evil intent
 */
export class DeviousBackendProperties {

  /**
   * Execute operation with both backends and compare maliciously
   */
  private async compareBackendsEvilly<T>(
    operation: () => Promise<T> | T,
    attackVector: string,
    evilnessLevel: 'mild' | 'moderate' | 'severe' | 'apocalyptic' = 'moderate',
    timeout: number = 30000
  ): Promise<DeviousTestResult> {
    
    const startMemory = process.memoryUsage();
    let snarkyBehavior: DeviousTestResult['snarkyBehavior'] = 'success';
    let sparkyBehavior: DeviousTestResult['sparkyBehavior'] = 'success';
    let snarkyResult: any, sparkyResult: any;
    let snarkyTime: number, sparkyTime: number;
    let snarkyError: string | undefined, sparkyError: string | undefined;

    // Test with Snarky (with evil monitoring)
    await switchBackend('snarky');
    const snarkyStartTime = performance.now();
    const snarkyStartMem = process.memoryUsage();
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_EVIL')), timeout)
      );
      snarkyResult = await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg === 'TIMEOUT_EVIL') {
        snarkyBehavior = 'timeout';
      } else if (errorMsg.includes('memory') || errorMsg.includes('heap')) {
        snarkyBehavior = 'memory_leak';
      } else if (errorMsg.includes('crash') || errorMsg.includes('segfault')) {
        snarkyBehavior = 'crash';
      } else {
        snarkyBehavior = 'error';
      }
      snarkyError = errorMsg;
    }
    
    snarkyTime = performance.now() - snarkyStartTime;
    const snarkyEndMem = process.memoryUsage();
    const snarkyMemoryDelta = snarkyEndMem.heapUsed - snarkyStartMem.heapUsed;

    // Test with Sparky (with even more evil monitoring)
    await switchBackend('sparky');
    const sparkyStartTime = performance.now();
    const sparkyStartMem = process.memoryUsage();
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_EVIL')), timeout)
      );
      sparkyResult = await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg === 'TIMEOUT_EVIL') {
        sparkyBehavior = 'timeout';
      } else if (errorMsg.includes('memory') || errorMsg.includes('heap')) {
        sparkyBehavior = 'memory_leak';
      } else if (errorMsg.includes('crash') || errorMsg.includes('segfault')) {
        sparkyBehavior = 'crash';
      } else {
        sparkyBehavior = 'error';
      }
      sparkyError = errorMsg;
    }
    
    sparkyTime = performance.now() - sparkyStartTime;
    const sparkyEndMem = process.memoryUsage();
    const sparkyMemoryDelta = sparkyEndMem.heapUsed - sparkyStartMem.heapUsed;

    // Evil behavior comparison
    const behaviorMatch = this.evilBehaviorMatch(
      snarkyBehavior, sparkyBehavior, 
      snarkyResult, sparkyResult,
      snarkyError, sparkyError
    );

    return {
      attackVector,
      snarkyBehavior,
      sparkyBehavior,
      behaviorMatch,
      snarkyTime,
      sparkyTime,
      snarkyMemory: snarkyMemoryDelta,
      sparkyMemory: sparkyMemoryDelta,
      snarkyError,
      sparkyError,
      evilnessLevel
    };
  }

  /**
   * Evil behavior matching logic
   */
  private evilBehaviorMatch(
    snarkyBehavior: string, sparkyBehavior: string,
    snarkyResult: any, sparkyResult: any,
    snarkyError?: string, sparkyError?: string
  ): boolean {
    // Both must behave the same way
    if (snarkyBehavior !== sparkyBehavior) return false;
    
    // If both succeeded, results must match
    if (snarkyBehavior === 'success' && sparkyBehavior === 'success') {
      if (typeof snarkyResult === 'object' && snarkyResult?.toString) {
        return snarkyResult.toString() === sparkyResult.toString();
      }
      return snarkyResult === sparkyResult;
    }
    
    // If both errored, error types should be similar (we're lenient on exact message)
    if (snarkyBehavior === 'error' && sparkyBehavior === 'error') {
      return true; // Both errored, which is consistent
    }
    
    return true; // Other cases (timeout, crash, memory_leak) are consistent if both do the same
  }

  /**
   * EVIL PROPERTY 1: Memory Exhaustion Attacks
   */
  memoryExhaustionAttack(): IAsyncProperty<any> {
    return fc.asyncProperty(
      deviousGenerators.memory.recursiveBomb(),
      async ({ depth, pattern }) => {
        const result = await this.compareBackendsEvilly(
          async () => {
            let accumulator = pattern[0];
            
            // Create deep recursive computation designed to exhaust memory
            for (let i = 0; i < Math.min(depth, 500); i++) {
              for (const field of pattern) {
                accumulator = accumulator.add(field.mul(Field(i)));
                accumulator = accumulator.square();
                
                // Force garbage collection pressure
                if (i % 10 === 0) {
                  const waste = new Array(1000).fill(Field(i));
                  waste.push(accumulator);
                }
              }
            }
            
            return accumulator;
          },
          'memory_exhaustion',
          'severe',
          60000 // Longer timeout for this evil test
        );

        if (!result.behaviorMatch) {
          throw new Error(
            `Memory exhaustion attack exposed backend difference!\n` +
            `Depth: ${depth}, Pattern length: ${pattern.length}\n` +
            `Snarky: ${result.snarkyBehavior} (${result.snarkyTime}ms, ${result.snarkyMemory}B)\n` +
            `Sparky: ${result.sparkyBehavior} (${result.sparkyTime}ms, ${result.sparkyMemory}B)\n` +
            `Snarky error: ${result.snarkyError}\n` +
            `Sparky error: ${result.sparkyError}`
          );
        }

        return true;
      }
    );
  }

  /**
   * EVIL PROPERTY 2: Division by Zero Chaos
   */
  divisionByZeroChaos(): IAsyncProperty<any> {
    return fc.asyncProperty(
      deviousGenerators.numerical.divisionTraps(),
      async ({ dividend, divisor, context }) => {
        const result = await this.compareBackendsEvilly(
          async () => {
            switch (context) {
              case 'direct':
                return dividend.div(divisor);
              case 'inverse':
                return dividend.mul(divisor.inv());
              case 'fraction':
                return dividend.div(divisor.add(Field(0))); // Extra evil: 0 + 0
              case 'circuit':
                // Create a circuit that does division by zero
                const program = ZkProgram({
                  name: `EvilDivision_${Date.now()}`,
                  publicInput: Field,
                  methods: {
                    evilDivide: {
                      privateInputs: [Field],
                      async method(publicInput: Field, privateInput: Field) {
                        const result = publicInput.div(privateInput); // privateInput will be zero
                        result.assertEquals(Field(0)); // This should fail
                      }
                    }
                  }
                });
                
                const { verificationKey } = await program.compile();
                return verificationKey.hash;
              case 'nested':
                // Nested division by zero
                return dividend.div(Field(1).sub(Field(1))); // 1 - 1 = 0
              default:
                return dividend.div(divisor);
            }
          },
          'division_by_zero_chaos',
          'apocalyptic'
        );

        // For division by zero, we actually expect both to error
        if (result.snarkyBehavior === 'success' || result.sparkyBehavior === 'success') {
          throw new Error(
            `Division by zero should have failed but didn't!\n` +
            `Context: ${context}\n` +
            `Snarky: ${result.snarkyBehavior}\n` +
            `Sparky: ${result.sparkyBehavior}`
          );
        }

        if (!result.behaviorMatch) {
          throw new Error(
            `Division by zero handling inconsistent!\n` +
            `Context: ${context}\n` +
            `Snarky: ${result.snarkyBehavior} - ${result.snarkyError}\n` +
            `Sparky: ${result.sparkyBehavior} - ${result.sparkyError}`
          );
        }

        return true;
      }
    );
  }

  /**
   * EVIL PROPERTY 3: Backend Switching Chaos
   */
  backendSwitchingChaos(): IAsyncProperty<any> {
    return fc.asyncProperty(
      deviousGenerators.state.backendChaos(),
      async ({ switches, operations, timing }) => {
        let evilResults: any[] = [];
        let errors: string[] = [];
        
        try {
          for (let i = 0; i < Math.min(switches.length, 20); i++) {
            // Rapid switching
            await switchBackend(switches[i]);
            
            // Wait for evil timing
            if (timing[i % timing.length] > 0) {
              await new Promise(resolve => setTimeout(resolve, timing[i % timing.length]));
            }
            
            // Perform operation in potentially inconsistent state
            const operation = operations[i % operations.length];
            const currentBackend = getCurrentBackend();
            
            if (currentBackend !== switches[i]) {
              errors.push(`Backend switch failed: expected ${switches[i]}, got ${currentBackend}`);
            }
            
            // Execute evil operation
            switch (operation) {
              case 'add':
                evilResults.push(Field(666).add(Field(i)));
                break;
              case 'mul':
                evilResults.push(Field(13).mul(Field(i + 1)));
                break;
              case 'hash':
                evilResults.push(Poseidon.hash([Field(i), Field(42)]));
                break;
              case 'circuit':
                // Try to compile a circuit during rapid switching
                const program = ZkProgram({
                  name: `ChaosCircuit_${i}_${Date.now()}`,
                  publicInput: Field,
                  methods: {
                    chaos: {
                      privateInputs: [Field],
                      async method(publicInput: Field, privateInput: Field) {
                        publicInput.assertEquals(privateInput.add(Field(i)));
                      }
                    }
                  }
                });
                
                try {
                  await program.compile();
                  evilResults.push('circuit_compiled');
                } catch (e) {
                  errors.push(`Circuit compilation failed: ${e}`);
                }
                break;
              default:
                evilResults.push(Field(i).square());
            }
          }
        } catch (error) {
          errors.push(`Chaos test failed: ${(error as Error).message}`);
        }

        // Check if we caused any inconsistencies
        if (errors.length > switches.length * 0.5) {
          throw new Error(
            `Backend switching chaos caused too many errors (${errors.length}/${switches.length}):\n` +
            errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...' : '')
          );
        }

        return true;
      }
    );
  }

  /**
   * EVIL PROPERTY 4: Hash Collision Attempts
   */
  hashCollisionAttack(): IAsyncProperty<any> {
    return fc.asyncProperty(
      deviousGenerators.crypto.hashAttacks(),
      async ({ inputs, attackType, rounds }) => {
        const result = await this.compareBackendsEvilly(
          async () => {
            let evilHashes: Field[] = [];
            
            switch (attackType) {
              case 'collision':
                // Try to find inputs that produce the same hash
                for (let i = 0; i < Math.min(rounds, 100); i++) {
                  const modifiedInputs = inputs.map((field, idx) => 
                    idx === 0 ? field.add(Field(i)) : field
                  );
                  evilHashes.push(Poseidon.hash(modifiedInputs));
                }
                break;
                
              case 'preimage':
                // Try to reverse a hash (should be impossible)
                const targetHash = Poseidon.hash(inputs);
                for (let i = 0; i < Math.min(rounds, 50); i++) {
                  const guess = inputs.map(field => field.add(Field(i)));
                  const guessHash = Poseidon.hash(guess);
                  if (guessHash.toString() === targetHash.toString()) {
                    throw new Error('Found preimage! This should not happen!');
                  }
                  evilHashes.push(guessHash);
                }
                break;
                
              case 'length_extension':
                // Try length extension attacks
                for (let i = 1; i <= Math.min(rounds, 20); i++) {
                  const extendedInputs = [...inputs, Field(i)];
                  evilHashes.push(Poseidon.hash(extendedInputs));
                }
                break;
                
              case 'multicollision':
                // Try to find multiple collisions
                const baseHash = Poseidon.hash(inputs);
                for (let i = 0; i < Math.min(rounds, 50); i++) {
                  const variant = [Field(i), ...inputs];
                  evilHashes.push(Poseidon.hash(variant));
                }
                break;
                
              case 'differential':
                // Differential analysis
                for (let i = 0; i < Math.min(rounds, 50); i++) {
                  const diff = inputs.map((field, idx) => 
                    idx === i % inputs.length ? field.add(Field(1)) : field
                  );
                  evilHashes.push(Poseidon.hash(diff));
                }
                break;
            }
            
            return evilHashes.length > 0 ? evilHashes[0] : Field(0);
          },
          'hash_collision_attack',
          'severe'
        );

        if (!result.behaviorMatch) {
          throw new Error(
            `Hash attack exposed backend difference!\n` +
            `Attack: ${attackType}, Rounds: ${rounds}\n` +
            `Snarky: ${result.snarkyBehavior}\n` +
            `Sparky: ${result.sparkyBehavior}`
          );
        }

        return true;
      }
    );
  }

  /**
   * EVIL PROPERTY 5: Circuit Malformation Attack
   */
  circuitMalformationAttack(): IAsyncProperty<any> {
    return fc.asyncProperty(
      deviousGenerators.circuit.malformedCircuits(),
      async ({ circuitType, malformationType, complexity, inputs }) => {
        const result = await this.compareBackendsEvilly(
          async () => {
            const programName = `Evil_${circuitType}_${malformationType}_${Date.now()}`;
            
            switch (circuitType) {
              case 'recursive_loop':
                // Try to create infinite recursion in circuit
                const recursiveProgram = ZkProgram({
                  name: programName,
                  publicInput: Field,
                  methods: {
                    recurse: {
                      privateInputs: [Field],
                      async method(publicInput: Field, privateInput: Field) {
                        // This should create a problematic recursive constraint
                        for (let i = 0; i < Math.min(complexity, 1000); i++) {
                          privateInput = privateInput.add(publicInput);
                          privateInput = privateInput.mul(privateInput); // Squaring in loop
                        }
                        privateInput.assertEquals(publicInput);
                      }
                    }
                  }
                });
                return (await recursiveProgram.compile()).verificationKey.hash;
                
              case 'infinite_constraint':
                // Try to generate too many constraints
                const constraintProgram = ZkProgram({
                  name: programName,
                  publicInput: Field,
                  methods: {
                    explode: {
                      privateInputs: inputs,
                      async method(publicInput: Field, ...privateInputs: Field[]) {
                        let result = publicInput;
                        for (let i = 0; i < Math.min(complexity, 5000); i++) {
                          for (const input of privateInputs) {
                            result = result.add(input.mul(Field(i)));
                            result = result.square(); // Exponential constraint growth
                          }
                        }
                        result.assertEquals(Field(0)); // Likely unsatisfiable
                      }
                    }
                  }
                });
                return (await constraintProgram.compile()).verificationKey.hash;
                
              case 'circular_dependency':
                // Try to create circular constraints
                const circularProgram = ZkProgram({
                  name: programName,
                  publicInput: Field,
                  methods: {
                    circular: {
                      privateInputs: [Field, Field],
                      async method(publicInput: Field, a: Field, b: Field) {
                        // Create circular dependency: a depends on b, b depends on a
                        const aResult = a.add(b);
                        const bResult = b.add(aResult);
                        aResult.assertEquals(bResult.sub(Field(1)));
                        bResult.assertEquals(aResult.add(Field(1)));
                        publicInput.assertEquals(aResult.add(bResult));
                      }
                    }
                  }
                });
                return (await circularProgram.compile()).verificationKey.hash;
                
              default:
                throw new Error(`Unknown circuit type: ${circuitType}`);
            }
          },
          'circuit_malformation_attack',
          'apocalyptic',
          120000 // Very long timeout for complex circuits
        );

        if (!result.behaviorMatch) {
          throw new Error(
            `Circuit malformation attack exposed backend difference!\n` +
            `Type: ${circuitType}, Malformation: ${malformationType}\n` +
            `Complexity: ${complexity}, Inputs: ${inputs.length}\n` +
            `Snarky: ${result.snarkyBehavior} (${result.snarkyTime}ms)\n` +
            `Sparky: ${result.sparkyBehavior} (${result.sparkyTime}ms)`
          );
        }

        return true;
      }
    );
  }

  /**
   * EVIL PROPERTY 6: Performance Asymmetry Attack
   */
  performanceAsymmetryAttack(): IAsyncProperty<any> {
    return fc.asyncProperty(
      deviousGenerators.performance.asymmetricOperations(),
      async ({ operation, parameters, expectedSlowBackend, degreeOfSlowness }) => {
        const result = await this.compareBackendsEvilly(
          async () => {
            switch (operation) {
              case 'repeated_inversion':
                let invResult = parameters[0];
                for (let i = 0; i < Math.min(parameters.length, 100); i++) {
                  if (!parameters[i].equals(Field(0)).toBoolean()) {
                    invResult = invResult.add(parameters[i].inv());
                  }
                }
                return invResult;
                
              case 'deep_multiplication_chain':
                let mulResult = Field(1);
                for (const param of parameters.slice(0, 200)) {
                  mulResult = mulResult.mul(param.add(Field(1))); // Avoid zero
                }
                return mulResult;
                
              case 'massive_poseidon_tree':
                let hashResult = parameters[0];
                for (let i = 1; i < Math.min(parameters.length, 50); i += 2) {
                  const chunk = parameters.slice(i, i + 2);
                  hashResult = Poseidon.hash([hashResult, ...chunk]);
                }
                return hashResult;
                
              default:
                return parameters.reduce((acc, param) => acc.add(param), Field(0));
            }
          },
          'performance_asymmetry_attack',
          'severe',
          degreeOfSlowness * 1000 // Timeout based on expected slowness
        );

        // Check for extreme performance differences
        const performanceRatio = Math.max(result.snarkyTime, result.sparkyTime) / 
                                Math.min(result.snarkyTime, result.sparkyTime);
        
        if (performanceRatio > degreeOfSlowness) {
          console.warn(
            `⚠️  EXTREME PERFORMANCE DIFFERENCE DETECTED!\n` +
            `Operation: ${operation}\n` +
            `Performance ratio: ${performanceRatio.toFixed(2)}x\n` +
            `Snarky: ${result.snarkyTime.toFixed(2)}ms\n` +
            `Sparky: ${result.sparkyTime.toFixed(2)}ms\n` +
            `Expected slow backend: ${expectedSlowBackend}`
          );
        }

        if (!result.behaviorMatch) {
          throw new Error(
            `Performance asymmetry attack exposed backend difference!\n` +
            `Operation: ${operation}\n` +
            `Performance ratio: ${performanceRatio.toFixed(2)}x\n` +
            `Snarky: ${result.snarkyBehavior} (${result.snarkyTime}ms)\n` +
            `Sparky: ${result.sparkyBehavior} (${result.sparkyTime}ms)`
          );
        }

        return true;
      }
    );
  }

  /**
   * EVIL PROPERTY 7: Chaos Monkey Ultimate Test
   */
  chaosMonkeyUltimate(): IAsyncProperty<any> {
    return fc.asyncProperty(
      deviousGenerators.combined.chaosMonkey(),
      async ({ operations, values, timings, switches, corruptions }) => {
        let chaosResults: any[] = [];
        let errors: string[] = [];
        
        try {
          for (let i = 0; i < Math.min(operations.length, 50); i++) {
            // Random backend switch
            if (i % 5 === 0 && i / 5 < switches.length) {
              await switchBackend(switches[Math.floor(i / 5)]);
            }
            
            // Random timing
            if (timings[i % timings.length] > 0) {
              await new Promise(resolve => 
                setTimeout(resolve, Math.min(timings[i % timings.length], 100))
              );
            }
            
            // Random corruption attempt
            if (i % 10 === 0 && i / 10 < corruptions.length) {
              const corruption = corruptions[Math.floor(i / 10)];
              // Simulate corruption (in practice this would be more complex)
              if (corruption === 'memory') {
                // Force garbage collection pressure
                const waste = new Array(1000).fill(values[i % values.length]);
              }
            }
            
            // Random evil operation
            const operation = operations[i];
            const value1 = values[i % values.length];
            const value2 = values[(i + 1) % values.length];
            
            try {
              switch (operation) {
                case 'add':
                  chaosResults.push(value1.add(value2));
                  break;
                case 'mul':
                  chaosResults.push(value1.mul(value2));
                  break;
                case 'div':
                  if (!value2.equals(Field(0)).toBoolean()) {
                    chaosResults.push(value1.div(value2));
                  }
                  break;
                case 'inv':
                  if (!value1.equals(Field(0)).toBoolean()) {
                    chaosResults.push(value1.inv());
                  }
                  break;
                case 'hash':
                  chaosResults.push(Poseidon.hash([value1, value2]));
                  break;
                case 'attack':
                  // Ultimate evil: try to break everything at once
                  const evilResult = value1.add(value2).mul(value1).square();
                  if (!value2.equals(Field(0)).toBoolean()) {
                    chaosResults.push(evilResult.div(value2));
                  } else {
                    chaosResults.push(evilResult);
                  }
                  break;
                default:
                  chaosResults.push(value1.square());
              }
            } catch (error) {
              errors.push(`Operation ${operation} failed: ${(error as Error).message}`);
            }
          }
        } catch (error) {
          errors.push(`Chaos monkey ultimate test failed: ${(error as Error).message}`);
        }

        // Allow some errors in chaos mode, but not too many
        if (errors.length > operations.length * 0.3) {
          throw new Error(
            `Chaos monkey caused too many errors (${errors.length}/${operations.length}):\n` +
            errors.slice(0, 3).join('\n') + (errors.length > 3 ? '\n...' : '')
          );
        }

        return true;
      }
    );
  }

  /**
   * Get all devious properties for comprehensive evil testing
   */
  getAllDeviousProperties(): Array<{
    name: string;
    property: IAsyncProperty<any>;
    config: { numRuns: number; timeout: number; };
    evilnessLevel: 'mild' | 'moderate' | 'severe' | 'apocalyptic';
  }> {
    return [
      {
        name: 'devious_memory_exhaustion_attack',
        property: this.memoryExhaustionAttack(),
        config: { numRuns: 10, timeout: 120000 },
        evilnessLevel: 'severe'
      },
      {
        name: 'devious_division_by_zero_chaos',
        property: this.divisionByZeroChaos(),
        config: { numRuns: 20, timeout: 60000 },
        evilnessLevel: 'apocalyptic'
      },
      {
        name: 'devious_backend_switching_chaos',
        property: this.backendSwitchingChaos(),
        config: { numRuns: 15, timeout: 90000 },
        evilnessLevel: 'severe'
      },
      {
        name: 'devious_hash_collision_attack',
        property: this.hashCollisionAttack(),
        config: { numRuns: 25, timeout: 60000 },
        evilnessLevel: 'moderate'
      },
      {
        name: 'devious_circuit_malformation_attack',
        property: this.circuitMalformationAttack(),
        config: { numRuns: 8, timeout: 180000 },
        evilnessLevel: 'apocalyptic'
      },
      {
        name: 'devious_performance_asymmetry_attack',
        property: this.performanceAsymmetryAttack(),
        config: { numRuns: 12, timeout: 120000 },
        evilnessLevel: 'severe'
      },
      {
        name: 'devious_chaos_monkey_ultimate',
        property: this.chaosMonkeyUltimate(),
        config: { numRuns: 5, timeout: 300000 },
        evilnessLevel: 'apocalyptic'
      }
    ];
  }
}

/**
 * Export the devious properties instance
 */
export const deviousBackendProperties = new DeviousBackendProperties();