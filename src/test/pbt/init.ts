/**
 * Initialization module for PBT infrastructure
 * 
 * This module connects the PBT utilities to the actual o1js backend switching
 * functionality once it's available during test execution.
 */

import { initializeBackendUtils } from './utils/BackendTestUtils.js';

/**
 * Initialize PBT infrastructure with o1js backend functions
 * 
 * Call this at the beginning of your test suite to connect
 * the PBT utilities to the actual backend switching implementation.
 * 
 * @example
 * ```typescript
 * import { initializePBT } from './pbt/init';
 * import { switchBackend, getCurrentBackend } from 'o1js';
 * 
 * beforeAll(async () => {
 *   await initializePBT(switchBackend, getCurrentBackend);
 * });
 * ```
 */
export async function initializePBT(
  switchBackendFn: (backend: 'snarky' | 'sparky') => Promise<void>,
  getCurrentBackendFn: () => 'snarky' | 'sparky'
): Promise<void> {
  // Initialize backend utilities
  initializeBackendUtils(switchBackendFn, getCurrentBackendFn);
  
  // Ensure we start with a known state
  await switchBackendFn('snarky');
  
  console.log('PBT infrastructure initialized');
  console.log(`Current backend: ${getCurrentBackendFn()}`);
}

/**
 * Mock initialization for testing the PBT infrastructure itself
 * 
 * This can be used when developing PBT tests without the actual
 * o1js backend switching available.
 */
export async function initializePBTMock(): Promise<void> {
  let currentBackend: 'snarky' | 'sparky' = 'snarky';
  
  const mockSwitchBackend = async (backend: 'snarky' | 'sparky') => {
    console.log(`Mock: Switching to ${backend} backend`);
    currentBackend = backend;
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
  };
  
  const mockGetCurrentBackend = () => currentBackend;
  
  initializeBackendUtils(mockSwitchBackend, mockGetCurrentBackend);
  
  console.log('PBT infrastructure initialized with mock backends');
}

/**
 * Jest setup helper
 * 
 * Add this to your Jest setup file to automatically initialize
 * PBT for all tests.
 */
export function setupJestPBT(): void {
  beforeAll(async () => {
    // Try to import actual o1js functions
    try {
      // This will be replaced with actual import once available
      const o1js = await import('../../index.js');
      if (o1js.switchBackend && o1js.getCurrentBackend) {
        await initializePBT(o1js.switchBackend, o1js.getCurrentBackend);
      } else {
        console.warn('o1js backend functions not available, using mock');
        await initializePBTMock();
      }
    } catch (error) {
      console.warn('Failed to import o1js, using mock backends:', error);
      await initializePBTMock();
    }
  });
  
  afterEach(async () => {
    // Reset to default backend after each test
    try {
      const { switchBackend } = await import('./utils/BackendTestUtils.js');
      await switchBackend('snarky');
    } catch (error) {
      // Ignore if not initialized
    }
  });
}