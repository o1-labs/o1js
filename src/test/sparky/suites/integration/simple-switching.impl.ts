/**
 * Simple Backend Switching Test Implementation
 * 
 * Contains the actual test implementations with static imports for proper TypeScript metadata.
 * 
 * Created: July 5, 2025, 03:05 UTC
 * Last Modified: July 5, 2025, 03:05 UTC
 */

import { Field } from '../../../../index.js';

export const backendSwitchingVerification = async (backend?: string) => {
  const o1js = await import('../../../../index.js');
  
  const currentBackend = o1js.getCurrentBackend();
  return {
    backend: currentBackend,
    expectedBackend: backend,
    match: currentBackend === backend
  };
};

export const fieldArithmeticComparison = async (backend?: string) => {
  const o1js = await import('../../../../index.js');
  const { Field: DynamicField } = o1js;
  
  const a = DynamicField(123);
  const b = DynamicField(456);
  const c = a.mul(b);
  const d = c.add(DynamicField(789));
  
  return {
    backend,
    result: d.toString(),
    operation: '(123 * 456) + 789'
  };
};

export const provableWitnessConsistency = async (backend?: string) => {
  const o1js = await import('../../../../index.js');
  const { Field: DynamicField, Provable } = o1js;
  
  let witnessValue = '';
  Provable.runAndCheck(() => {
    const x = Provable.witness(DynamicField, () => DynamicField(99));
    const y = x.mul(DynamicField(2));
    Provable.asProver(() => {
      witnessValue = y.toString();
    });
  });
  
  return {
    backend,
    witnessValue,
    operation: 'witness(99) * 2'
  };
};