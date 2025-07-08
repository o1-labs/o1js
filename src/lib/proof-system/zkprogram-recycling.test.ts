/**
 * ZK Program Proving Tests with Pool Recycling
 * 
 * Tests that ZK programs can prove successfully before and after
 * pool recycling, validating that our memory management system
 * maintains functionality across pool resets.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { Field, ZkProgram, Cache } from 'o1js';
import { PoolHealthCoordinator } from './pool-health-coordinator';

// Simple ZK program for testing
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    baseCase: {
      privateInputs: [],
      async method(publicInput: Field) {
        publicInput.assertEquals(Field(42));
        return {
          publicOutput: publicInput
        };
      },
    },
    
    step: {
      privateInputs: [Field],
      async method(publicInput: Field, privateInput: Field) {
        publicInput.assertEquals(privateInput.add(Field(1)));
        return {
          publicOutput: publicInput
        };
      },
    },
  },
});

describe('ZK Program Proving with Pool Recycling', () => {
  let coordinator: PoolHealthCoordinator;
  let TestProgramClass: any;

  beforeAll(async () => {
    console.log('Compiling ZK program...');
    // The compile() method will initialize the thread pool and create the coordinator
    const { verificationKey } = await TestProgram.compile({ cache: Cache.None });
    TestProgramClass = TestProgram.Proof;
    console.log('ZK program compiled successfully');
    
    // Get the coordinator that was created by withThreadPool during compile
    coordinator = (globalThis as any).poolHealthCoordinator;
    
    if (!coordinator) {
      // If no coordinator was created, something is wrong with the integration
      throw new Error('Pool health coordinator was not initialized during compile');
    }
    
    console.log('Pool health coordinator is active and connected to thread pool');
  });

  afterAll(async () => {
    if (coordinator) {
      await coordinator.waitForRecyclingToComplete();
    }
  });

  test('should prove successfully before any recycling', async () => {
    console.log('Testing proof generation before recycling...');
    
    // Generate a proof
    const proof = await TestProgram.baseCase(Field(42));
    
    // Check proof exists and has expected properties
    expect(proof).toBeDefined();
    expect(proof.proof).toBeDefined();
    expect(proof.proof.publicInput).toEqual(Field(42));
    expect(proof.proof.publicOutput).toEqual(Field(42));
    
    console.log('✅ Proof generated successfully before recycling');
  });

  test('should prove successfully after forced pool recycling', async () => {
    console.log('Testing proof generation after forced pool recycling...');
    
    // Force pool recycling
    console.log('Forcing pool recycling...');
    await coordinator.forceRecycling('test_recycling');
    console.log('Pool recycling completed');
    
    // Wait a moment for pool to stabilize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Generate a proof after recycling
    const proof = await TestProgram.step(Field(43), Field(42));
    
    // Check proof exists and has expected properties
    expect(proof).toBeDefined();
    expect(proof.proof).toBeDefined();
    expect(proof.proof.publicInput).toEqual(Field(43));
    expect(proof.proof.publicOutput).toEqual(Field(43));
    
    console.log('✅ Proof generated successfully after recycling');
  });

  test('should handle multiple proofs across recycling events', async () => {
    console.log('Testing multiple proofs across recycling events...');
    
    const results = [];
    
    // Generate first proof
    console.log('Generating proof 1...');
    const proof1 = await TestProgram.baseCase(Field(42));
    expect(proof1.proof.publicInput).toEqual(Field(42));
    results.push(true);
    console.log('Proof 1 generated successfully');
    
    // Trigger recycling via critical memory simulation
    console.log('Simulating critical memory condition...');
    coordinator.receiveHealthReport({
      workerId: 'test-worker-1',
      memoryUsageMB: 1500, // Above threshold
      isMemoryCritical: true,
      timestamp: Date.now()
    });
    
    // Wait for recycling to complete
    await coordinator.waitForRecyclingToComplete();
    console.log('Recycling completed after critical memory');
    
    // Generate second proof after recycling
    console.log('Generating proof 2 after recycling...');
    const proof2 = await TestProgram.step(Field(100), Field(99));
    expect(proof2.proof.publicInput).toEqual(Field(100));
    results.push(true);
    console.log('Proof 2 generated successfully');
    
    // Force another recycling
    console.log('Forcing second recycling...');
    await coordinator.forceRecycling('second_test_recycling');
    
    // Generate third proof
    console.log('Generating proof 3 after second recycling...');
    const proof3 = await TestProgram.baseCase(Field(42));
    expect(proof3.proof.publicInput).toEqual(Field(42));
    results.push(true);
    console.log('Proof 3 generated successfully');
    
    // All proofs should be generated successfully
    expect(results).toEqual([true, true, true]);
    console.log('✅ All proofs across multiple recycling events generated successfully');
  });

  test('should maintain proof consistency across pool resets', async () => {
    console.log('Testing proof consistency across pool resets...');
    
    const testValues = [Field(42), Field(42), Field(42)]; // Use valid value for baseCase
    const proofs = [];
    const results = [];
    
    for (let i = 0; i < testValues.length; i++) {
      console.log(`Generating proof ${i + 1} for value ${testValues[i].toString()}...`);
      
      // Generate proof
      const proof = await TestProgram.baseCase(testValues[i]);
      proofs.push(proof);
      
      // Verify proof properties
      expect(proof.proof.publicInput).toEqual(testValues[i]);
      expect(proof.proof.publicOutput).toEqual(testValues[i]);
      results.push(true);
      console.log(`Proof ${i + 1} generated successfully`);
      
      // Force recycling between each proof
      if (i < testValues.length - 1) {
        console.log(`Recycling pool after proof ${i + 1}...`);
        await coordinator.forceRecycling(`consistency_test_${i}`);
        await new Promise(resolve => setTimeout(resolve, 50)); // Brief stabilization
      }
    }
    
    // All proofs should be consistent
    expect(results.every(v => v === true)).toBe(true);
    expect(proofs.length).toBe(testValues.length);
    
    console.log('✅ Proof consistency maintained across all pool resets');
  });

  test('should handle concurrent proving and recycling gracefully', async () => {
    console.log('Testing concurrent proving and recycling...');
    
    // Start multiple proof generation tasks
    const proofPromise = TestProgram.baseCase(Field(42));
    
    // Start recycling concurrently
    const recyclingPromise = coordinator.forceRecycling('concurrent_test');

    console.log('Running proofs and recycling concurrently...');
    
    // Wait for everything to complete
    const [proof, _recyclingResult] = await Promise.all([
      proofPromise,
      recyclingPromise
    ]);
    
    console.log('All concurrent operations completed');
    
    // Check all proofs were generated
    expect(proof.proof.publicInput).toEqual(Field(42));
    
    console.log('✅ Concurrent proving and recycling handled gracefully');
  });

  test('should recover from simulated memory pressure', async () => {
    console.log('Testing recovery from simulated memory pressure...');
    
    // Simulate escalating memory pressure
    const memoryLevels = [800, 1200, 1500]; // Last one triggers recycling
    
    for (let i = 0; i < memoryLevels.length; i++) {
      console.log(`Reporting memory level: ${memoryLevels[i]}MB`);
      
      coordinator.receiveHealthReport({
        workerId: `pressure-worker-${i}`,
        memoryUsageMB: memoryLevels[i],
        isMemoryCritical: memoryLevels[i] > 1000,
        timestamp: Date.now()
      });
      
      // Try to generate a proof at each memory level
      try {
        const proof = await TestProgram.baseCase(Field(42));
        expect(proof.proof.publicInput).toEqual(Field(42));
        console.log(`Proof at ${memoryLevels[i]}MB: SUCCESS`);
      } catch (error: any) {
        console.log(`Proof failed at ${memoryLevels[i]}MB:`, error.message);
        throw error;
      }
      
      // Wait for potential recycling
      if (coordinator.isPoolRecycling()) {
        console.log('Pool recycling triggered, waiting for completion...');
        await coordinator.waitForRecyclingToComplete();
        console.log('Recovery completed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Successfully recovered from memory pressure');
  });

  test('should handle worker thread pool integration', async () => {
    console.log('Testing worker thread pool integration...');
    
    // Test that the global poolHealthCoordinator is accessible
    expect((globalThis as any).poolHealthCoordinator).toBeDefined();
    expect((globalThis as any).poolHealthCoordinator).toBe(coordinator);
    
    // Test proof generation while coordinator is active
    const proof = await TestProgram.baseCase(Field(42));
    expect(proof.proof.publicInput).toEqual(Field(42));
    
    // Test that recycling doesn't break the integration
    await coordinator.forceRecycling('integration_test');
    
    // Should still be able to generate proofs
    const proof2 = await TestProgram.baseCase(Field(42));
    expect(proof2.proof.publicInput).toEqual(Field(42));
    
    console.log('✅ Worker thread pool integration working correctly');
  });
});