/**
 * LIR to Constraint Conversion Test
 * 
 * This file demonstrates how to convert LIR gates back to sparky-core ConstraintType format.
 * Created: July 6, 2025
 * Last Modified: July 6, 2025
 */

import { Field } from '../lib/provable/field.js';

// Type definitions matching sparky-core ConstraintType
type VarId = number;

interface FieldElement {
  value: bigint;
}

// sparky-core ConstraintType enum
type ConstraintType = 
  | { type: 'Boolean'; var: VarId }
  | { type: 'Equal'; left: VarId; right: VarId }
  | { type: 'Square'; input: VarId; output: VarId }
  | { type: 'R1CS'; left: VarId; right: VarId; output: VarId }
  | { type: 'Linear'; terms: Array<[FieldElement, VarId]>; constant: FieldElement }
  | { type: 'If'; condition: VarId; then_val: VarId; else_val: VarId; output: VarId }
  | { type: 'BooleanAnd'; a: VarId; b: VarId; output: VarId }
  | { type: 'BooleanOr'; a: VarId; b: VarId; output: VarId }
  | { type: 'BooleanNot'; input: VarId; output: VarId }
  | { type: 'RangeCheck'; value: VarId; limbs_12bit: VarId[]; crumbs_2bit: VarId[]; compact: boolean }
  | { type: 'PoseidonHash'; inputs: VarId[]; output: VarId; rate: number }
  | { type: 'ForeignFieldAdd'; left: VarId[]; right: VarId[]; sign: FieldElement; result: VarId[]; overflow: VarId; modulus: FieldElement[] };

// LIR Gate types (simplified for demonstration)
interface LirGenericCoefficients {
  l: FieldElement;  // left coefficient
  r: FieldElement;  // right coefficient  
  o: FieldElement;  // output coefficient
  m: FieldElement;  // multiplication coefficient (l * r)
  c: FieldElement;  // constant coefficient
}

interface LirColumnAssignments {
  left: VarId;
  right: VarId;
  output: VarId;
  // Additional columns for complex gates
  aux?: VarId[];
}

type LirGate = 
  | { type: 'Generic'; coefficients: LirGenericCoefficients }
  | { type: 'Poseidon'; state_size: number; state_table: VarId[][] }
  | { type: 'RangeCheck0'; v0: VarId; v0p0: VarId; v0p1: VarId; v0p2: VarId; v0p3: VarId; v0p4: VarId; v0p5: VarId; v0c0: VarId; v0c1: VarId; v0c2: VarId; v0c3: VarId; v0c4: VarId; v0c5: VarId; v0c6: VarId; v0c7: VarId; compact: boolean }
  | { type: 'ForeignFieldAdd'; modulus_limbs: FieldElement[]; limb_count: number };

interface LirConstraint {
  gate: LirGate;
  row: number;
  column_assignments: LirColumnAssignments;
}

/**
 * Convert a LIR gate back to sparky-core ConstraintType format
 * 
 * This function reverses the MIR->LIR transformation to recover the high-level constraint semantics
 */
function lirGateToConstraintType(lir: LirConstraint): ConstraintType | null {
  const { gate, column_assignments } = lir;
  
  switch (gate.type) {
    case 'Generic': {
      const coeffs = gate.coefficients;
      const { left, right, output } = column_assignments;
      
      // Analyze coefficients to determine constraint type
      
      // R1CS: 0*l + 0*r + (-1)*o + 1*l*r + 0 = 0  =>  l * r = o
      if (isZero(coeffs.l) && isZero(coeffs.r) && isMinusOne(coeffs.o) && isOne(coeffs.m) && isZero(coeffs.c)) {
        return { type: 'R1CS', left, right, output };
      }
      
      // Square: 0*l + 0*r + (-1)*o + 1*l*l + 0 = 0  =>  l * l = o (where left = right)
      if (left === right && isZero(coeffs.l) && isZero(coeffs.r) && isMinusOne(coeffs.o) && isOne(coeffs.m) && isZero(coeffs.c)) {
        return { type: 'Square', input: left, output };
      }
      
      // Boolean: 1*l + 0*r + 0*o + (-1)*l*l + 0 = 0  =>  l - l² = 0  =>  l(1-l) = 0
      if (left === right && isOne(coeffs.l) && isZero(coeffs.r) && isZero(coeffs.o) && isMinusOne(coeffs.m) && isZero(coeffs.c)) {
        return { type: 'Boolean', var: left };
      }
      
      // Equality via linear constraint: 1*l + (-1)*r + 0*o + 0*l*r + 0 = 0  =>  l = r
      if (isOne(coeffs.l) && isMinusOne(coeffs.r) && isZero(coeffs.o) && isZero(coeffs.m) && isZero(coeffs.c)) {
        return { type: 'Equal', left, right };
      }
      
      // General linear constraint: gather all non-zero terms
      const terms: Array<[FieldElement, VarId]> = [];
      if (!isZero(coeffs.l)) terms.push([coeffs.l, left]);
      if (!isZero(coeffs.r)) terms.push([coeffs.r, right]);
      if (!isZero(coeffs.o)) terms.push([coeffs.o, output]);
      
      // If there's a multiplication term but it doesn't fit standard patterns, we can't convert it
      if (!isZero(coeffs.m)) {
        console.warn('Cannot convert generic gate with non-standard multiplication coefficient');
        return null;
      }
      
      return { type: 'Linear', terms, constant: coeffs.c };
    }
    
    case 'Poseidon': {
      // Poseidon gates encode the full permutation
      // Extract input and output from state table
      const inputs = gate.state_table[0].slice(0, gate.state_size);
      const outputs = gate.state_table[gate.state_table.length - 1].slice(0, gate.state_size);
      
      // For simple hash, we typically have one output
      const output = outputs[0];
      
      return { type: 'PoseidonHash', inputs, output, rate: gate.state_size };
    }
    
    case 'RangeCheck0': {
      // Range check gate with full decomposition
      const limbs_12bit = [gate.v0p0, gate.v0p1, gate.v0p2, gate.v0p3, gate.v0p4, gate.v0p5];
      const crumbs_2bit = [gate.v0c0, gate.v0c1, gate.v0c2, gate.v0c3, gate.v0c4, gate.v0c5, gate.v0c6, gate.v0c7];
      
      return { 
        type: 'RangeCheck', 
        value: gate.v0, 
        limbs_12bit, 
        crumbs_2bit, 
        compact: gate.compact 
      };
    }
    
    case 'ForeignFieldAdd': {
      // Foreign field addition gate
      // Need to extract variable assignments from column assignments
      if (!column_assignments.aux || column_assignments.aux.length < 7) {
        console.warn('ForeignFieldAdd gate missing auxiliary columns');
        return null;
      }
      
      // Typical layout: left[3], right[3], result[3], overflow, carry
      const left = column_assignments.aux.slice(0, 3);
      const right = column_assignments.aux.slice(3, 6);
      const result = column_assignments.aux.slice(6, 9);
      const overflow = column_assignments.aux[9];
      
      // Sign is typically encoded in the gate parameters
      // For now, assume addition (sign = 1)
      const sign: FieldElement = { value: 1n };
      
      return {
        type: 'ForeignFieldAdd',
        left,
        right,
        sign,
        result,
        overflow,
        modulus: gate.modulus_limbs
      };
    }
    
    default:
      console.warn(`Unsupported LIR gate type: ${(gate as any).type}`);
      return null;
  }
}

// Helper functions for field element comparison
function isZero(fe: FieldElement): boolean {
  return fe.value === 0n;
}

function isOne(fe: FieldElement): boolean {
  return fe.value === 1n;
}

function isMinusOne(fe: FieldElement): boolean {
  // In a prime field, -1 = p - 1
  const fieldOrder = BigInt('28948022309329048855892746252171976963363056481941560715954676764349967630337');
  return fe.value === fieldOrder - 1n;
}

// Example usage
function testLirToConstraintConversion() {
  console.log('Testing LIR to Constraint conversion...\n');
  
  // Example 1: R1CS constraint (multiplication)
  const r1csLir: LirConstraint = {
    gate: {
      type: 'Generic',
      coefficients: {
        l: { value: 0n },
        r: { value: 0n },
        o: { value: BigInt('28948022309329048855892746252171976963363056481941560715954676764349967630336') }, // -1
        m: { value: 1n },
        c: { value: 0n }
      }
    },
    row: 0,
    column_assignments: { left: 1, right: 2, output: 3 }
  };
  
  const r1csConstraint = lirGateToConstraintType(r1csLir);
  console.log('R1CS LIR gate converted to:', r1csConstraint);
  
  // Example 2: Boolean constraint
  const booleanLir: LirConstraint = {
    gate: {
      type: 'Generic',
      coefficients: {
        l: { value: 1n },
        r: { value: 0n },
        o: { value: 0n },
        m: { value: BigInt('28948022309329048855892746252171976963363056481941560715954676764349967630336') }, // -1
        c: { value: 0n }
      }
    },
    row: 1,
    column_assignments: { left: 4, right: 4, output: 0 } // left = right for boolean
  };
  
  const booleanConstraint = lirGateToConstraintType(booleanLir);
  console.log('Boolean LIR gate converted to:', booleanConstraint);
  
  // Example 3: Linear constraint (addition)
  const linearLir: LirConstraint = {
    gate: {
      type: 'Generic',
      coefficients: {
        l: { value: 1n },
        r: { value: 1n },
        o: { value: BigInt('28948022309329048855892746252171976963363056481941560715954676764349967630336') }, // -1
        m: { value: 0n },
        c: { value: 0n }
      }
    },
    row: 2,
    column_assignments: { left: 5, right: 6, output: 7 }
  };
  
  const linearConstraint = lirGateToConstraintType(linearLir);
  console.log('Linear (addition) LIR gate converted to:', linearConstraint);
  
  // Example 4: Range check
  const rangeCheckLir: LirConstraint = {
    gate: {
      type: 'RangeCheck0',
      v0: 10,
      v0p0: 11, v0p1: 12, v0p2: 13, v0p3: 14, v0p4: 15, v0p5: 16,
      v0c0: 17, v0c1: 18, v0c2: 19, v0c3: 20, v0c4: 21, v0c5: 22, v0c6: 23, v0c7: 24,
      compact: false
    },
    row: 3,
    column_assignments: { left: 10, right: 0, output: 0 }
  };
  
  const rangeCheckConstraint = lirGateToConstraintType(rangeCheckLir);
  console.log('RangeCheck LIR gate converted to:', rangeCheckConstraint);
}

// Run the test
testLirToConstraintConversion();

export { lirGateToConstraintType, ConstraintType, LirGate, LirConstraint };