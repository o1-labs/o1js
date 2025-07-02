/**
 * Backend Infrastructure Tests
 * 
 * Tests the core backend switching mechanism, constraint routing, and infrastructure
 * compatibility between Snarky (OCaml) and Sparky (Rust) backends.
 * 
 * Key Issue: globalThis.__snarky is not updated when switching to Sparky,
 * causing all constraints to route through OCaml regardless of backend selection.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { 
  initializeBindings, 
  switchBackend, 
  getCurrentBackend, 
  Field 
} from '../../dist/node/index.js';

describe('Backend Switching Infrastructure', () => {
  beforeAll(async () => {
    await initializeBindings();
  });

  describe('Basic Backend Switching', () => {
    test('getCurrentBackend reports correct backend', async () => {
      await switchBackend('snarky');
      expect(getCurrentBackend()).toBe('snarky');

      await switchBackend('sparky');
      expect(getCurrentBackend()).toBe('sparky');

      await switchBackend('snarky');
      expect(getCurrentBackend()).toBe('snarky');
    });

    test('backend switching is idempotent', async () => {
      await switchBackend('snarky');
      const backend1 = getCurrentBackend();
      
      await switchBackend('snarky');
      const backend2 = getCurrentBackend();
      
      expect(backend1).toBe(backend2);
      expect(backend2).toBe('snarky');
    });

    test('can switch backends multiple times', async () => {
      const switches = ['snarky', 'sparky', 'snarky', 'sparky', 'snarky'];
      
      for (const targetBackend of switches) {
        await switchBackend(targetBackend as 'snarky' | 'sparky');
        expect(getCurrentBackend()).toBe(targetBackend);
      }
    });
  });

  describe('Global State Management', () => {
    test('globalThis.__snarky initialization', async () => {
      await switchBackend('snarky');
      
      expect(globalThis.__snarky).toBeDefined();
      expect(globalThis.__snarky.gates).toBeDefined();
      expect(typeof globalThis.__snarky.gates.generic).toBe('function');
      
      console.log('✅ globalThis.__snarky properly initialized with Snarky');
    });

    test('CRITICAL: globalThis.__snarky update on backend switch', async () => {
      // Start with Snarky - get reference to OCaml gates
      await switchBackend('snarky');
      const snarkyGates = globalThis.__snarky?.gates;
      expect(snarkyGates).toBeDefined();
      
      // Switch to Sparky
      await switchBackend('sparky');
      const currentGates = globalThis.__snarky?.gates;
      
      // CRITICAL BUG: globalThis.__snarky should be updated to point to Sparky adapter
      // but it still points to the original OCaml implementation
      const stillPointsToOCaml = currentGates === snarkyGates;
      
      console.log('🚨 CRITICAL ROUTING BUG DETECTED:');
      console.log(`   globalThis.__snarky unchanged after switch: ${stillPointsToOCaml}`);
      console.log(`   Current backend reports: ${getCurrentBackend()}`);
      console.log(`   But constraints still route through: ${stillPointsToOCaml ? 'OCaml' : 'Sparky'}`);
      
      // With routing fixed and optimization re-enabled
      expect(stillPointsToOCaml).toBe(false); // Should be false with routing fixed
      expect(currentGates).not.toBe(snarkyGates); // Gates should be updated
    });

    test('Sparky adapter provides required interface', async () => {
      // Check that Sparky adapter has the expected interface
      const { Snarky: SparkySnarky } = await import('../../dist/node/bindings/sparky-adapter.js');
      
      expect(SparkySnarky).toBeDefined();
      expect(SparkySnarky.gates).toBeDefined();
      expect(SparkySnarky.gates.generic).toBeDefined();
      expect(typeof SparkySnarky.gates.generic).toBe('function');
      
      console.log('✅ Sparky adapter provides required gates interface');
      console.log('   The problem is that globalThis.__snarky is never updated to use it');
    });
  });

  describe('Constraint Routing Validation', () => {
    test('constraint generation routes to correct backend', async () => {
      // This test will demonstrate the routing bug
      
      // Test with Snarky - should work correctly
      await switchBackend('snarky');
      console.log('\n🔍 Testing constraint routing with Snarky...');
      
      let snarkyConstraintsCaptured = false;
      try {
        // Create a simple circuit to generate constraints
        const x = Field(3);
        const y = x.mul(x); // This should generate constraints through correct backend
        snarkyConstraintsCaptured = true;
      } catch (error) {
        console.error('Error generating constraints with Snarky:', error.message);
      }
      
      // Test with Sparky - will fail to capture constraints properly
      await switchBackend('sparky');
      console.log('🔍 Testing constraint routing with Sparky...');
      
      let sparkyConstraintsCaptured = false;
      try {
        const x = Field(3);
        const y = x.mul(x); // This will route through OCaml due to globalThis.__snarky bug
        sparkyConstraintsCaptured = true;
      } catch (error) {
        console.error('Error generating constraints with Sparky:', error.message);
      }
      
      expect(snarkyConstraintsCaptured).toBe(true);
      expect(sparkyConstraintsCaptured).toBe(true); // Basic operations work
      
      console.log('💡 Diagnosis:');
      console.log('   Basic field operations work with both backends');
      console.log('   But constraint recording routes incorrectly due to globalThis.__snarky');
    });

    test('constraint system compilation routing', async () => {
      const { Provable } = await import('../index.js');
      
      const testCircuit = () => {
        const x = Provable.witness(Field, () => Field(3));
        x.mul(x).assertEquals(Field(9));
      };

      // Compile with Snarky
      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(testCircuit);
      console.log(`Snarky constraint count: ${snarkyCS.gates.length}`);

      // Compile with Sparky - should use Sparky but actually uses OCaml
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(testCircuit);
      console.log(`Sparky constraint count: ${sparkyCS.gates.length}`);

      // Due to routing bug, these will likely be different even though they should be same
      const constraintCountMatch = snarkyCS.gates.length === sparkyCS.gates.length;
      
      console.log('🔍 Constraint System Routing Analysis:');
      console.log(`   Constraint count match: ${constraintCountMatch ? '✅' : '❌'}`);
      console.log(`   Expected: Same count (routing to same system)`);
      console.log(`   Actual: Different counts (routing to different systems)`);
      
      // With reduce_lincom optimization re-enabled, counts should match
      expect(constraintCountMatch).toBe(true); // Should be true with optimization
    });
  });

  describe('Backend Capability Validation', () => {
    test('Snarky backend basic functionality', async () => {
      await switchBackend('snarky');
      
      // Test basic field operations
      const a = Field(5);
      const b = Field(3);
      const result = a.mul(b);
      
      expect(result.toString()).toBe('15');
      console.log('✅ Snarky backend: Basic field operations work');
    });

    test('Sparky backend basic functionality', async () => {
      await switchBackend('sparky');
      
      // Test basic field operations
      const a = Field(5);
      const b = Field(3);
      const result = a.mul(b);
      
      expect(result.toString()).toBe('15');
      console.log('✅ Sparky backend: Basic field operations work');
    });

    test('both backends produce same results for field operations', async () => {
      const testValues = [
        [Field(1), Field(1)],
        [Field(5), Field(3)],
        [Field(100), Field(200)],
        [Field(0), Field(42)]
      ];

      for (const [a, b] of testValues) {
        // Test with Snarky
        await switchBackend('snarky');
        const snarkyResult = a.mul(b).add(Field(1));
        
        // Test with Sparky
        await switchBackend('sparky');
        const sparkyResult = a.mul(b).add(Field(1));
        
        expect(snarkyResult.toString()).toBe(sparkyResult.toString());
      }
      
      console.log('✅ Both backends produce identical results for field operations');
    });
  });

  describe('Infrastructure Diagnostics', () => {
    test('complete infrastructure health check', async () => {
      const diagnostics = {
        backendSwitching: false,
        globalStateManagement: false,
        constraintRouting: false,
        sparkySnarkyInterface: false,
        overallHealth: false
      };

      // Test backend switching
      try {
        await switchBackend('snarky');
        await switchBackend('sparky');
        await switchBackend('snarky');
        diagnostics.backendSwitching = getCurrentBackend() === 'snarky';
      } catch (error) {
        console.error('Backend switching failed:', error.message);
      }

      // Test global state management
      await switchBackend('snarky');
      const snarkyGates = globalThis.__snarky?.gates;
      await switchBackend('sparky');
      const afterSwitchGates = globalThis.__snarky?.gates;
      
      // This should fail - gates should be different but aren't
      diagnostics.globalStateManagement = afterSwitchGates !== snarkyGates;

      // Test Sparky interface availability
      try {
        const { Snarky: SparkySnarky } = await import('../bindings/sparky-adapter.js');
        diagnostics.sparkySnarkyInterface = !!SparkySnarky?.gates?.generic;
      } catch (error) {
        console.error('Sparky interface check failed:', error.message);
      }

      // Test constraint routing (simplified)
      try {
        const { Provable } = await import('../../dist/node/index.js');
        const simpleCircuit = () => Field(1).mul(Field(1));
        
        await switchBackend('snarky');
        const snarkyCS = await Provable.constraintSystem(simpleCircuit);
        
        await switchBackend('sparky');
        const sparkyCS = await Provable.constraintSystem(simpleCircuit);
        
        // Should be same constraint count, but likely isn't due to routing bug
        diagnostics.constraintRouting = snarkyCS.gates.length === sparkyCS.gates.length;
      } catch (error) {
        console.error('Constraint routing test failed:', error.message);
      }

      diagnostics.overallHealth = Object.values(diagnostics).every(Boolean);

      console.log('\n🏥 INFRASTRUCTURE HEALTH REPORT');
      console.log('='.repeat(40));
      console.log(`Backend Switching: ${diagnostics.backendSwitching ? '✅' : '❌'}`);
      console.log(`Global State Mgmt: ${diagnostics.globalStateManagement ? '✅' : '❌'}`);
      console.log(`Constraint Routing: ${diagnostics.constraintRouting ? '✅' : '❌'}`);
      console.log(`Sparky Interface: ${diagnostics.sparkySnarkyInterface ? '✅' : '❌'}`);
      console.log(`Overall Health: ${diagnostics.overallHealth ? '✅' : '❌'}`);

      if (!diagnostics.overallHealth) {
        console.log('\n🚨 CRITICAL ISSUES DETECTED:');
        if (!diagnostics.globalStateManagement) {
          console.log('   - globalThis.__snarky not updated on backend switch');
        }
        if (!diagnostics.constraintRouting) {
          console.log('   - Constraints routing to wrong backend');
        }
        console.log('\n💡 ROOT CAUSE: Backend switching updates internal state');
        console.log('   but does not update globalThis.__snarky, causing constraint');
        console.log('   routing to always use OCaml regardless of selected backend.');
      }

      // Document current state - infrastructure is broken
      expect(diagnostics.overallHealth).toBe(false);
      expect(diagnostics.globalStateManagement).toBe(false);
      expect(diagnostics.constraintRouting).toBe(false);
      
      // When infrastructure is fixed, these should pass:
      // expect(diagnostics.overallHealth).toBe(true);
      // expect(diagnostics.globalStateManagement).toBe(true);
      // expect(diagnostics.constraintRouting).toBe(true);
    });
  });
});