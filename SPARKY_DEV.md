# Sparky Development Guide

**Last Updated**: December 30, 2024

This guide provides detailed information for developers working on Sparky backend integration in o1js.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Gate Implementation Guide](#gate-implementation-guide)
4. [JavaScript Adapter Development](#javascript-adapter-development)
5. [VK Parity Achievement](#vk-parity-achievement)
6. [Debugging Tools](#debugging-tools)
7. [Common Issues and Solutions](#common-issues-and-solutions)
8. [Testing Strategy](#testing-strategy)

## Overview

Sparky is a Rust implementation of the Snarky constraint system, providing WASM-compatible zkSNARK functionality. The integration enables runtime switching between OCaml Snarky and Rust Sparky backends while maintaining API compatibility.

### Current Status (December 30, 2024)

- ✅ **Raw gate interface fixed** - Proper constraint generation via Checked monad
- ✅ **Native gates implemented** - Cairo VM, Xor16, ForeignField gates working
- ✅ **Core infrastructure complete** - Ready for rapid gate implementation
- 🚧 **VK parity pending** - JavaScript adapter refinements needed
- 🚧 **Additional gates ready** - Poseidon, CompleteAdd, VarBaseMul next

## Architecture

### Component Overview

```
o1js TypeScript API
        ↓
JavaScript Adapter Layer (sparky-adapter.js)
        ↓
WASM Bindings (sparky_wasm)
        ↓
Rust Sparky Core (sparky-core)
        ↓
Kimchi Proof System
```

### Key Files

```
src/
├── bindings/
│   ├── sparky-adapter.js         # Main compatibility layer (1,150 lines)
│   └── compiled/
│       ├── sparky_node/          # Node.js WASM artifacts
│       └── sparky_web/           # Browser WASM artifacts
└── sparky/
    ├── sparky-core/
    │   ├── src/
    │   │   ├── constraint.rs     # Constraint structures
    │   │   ├── gates/
    │   │   │   └── raw_gate.rs   # Gate implementations
    │   │   └── checked.rs        # Checked monad
    └── sparky-wasm/              # WASM bindings
```

## Gate Implementation Guide

### Step 1: Define Constraint Structure

In `sparky-core/src/constraint.rs`:

```rust
#[derive(Clone, Debug)]
pub struct MyGateConstraint {
    // 15 wire values required for Kimchi compatibility
    pub wire0: Cvar,
    pub wire1: Cvar,
    // ... up to wire14
    
    // Gate-specific parameters
    pub coefficient: FieldElement,
}
```

### Step 2: Add to Constraint Enum

```rust
pub enum Constraint {
    // Existing variants...
    MyGate(MyGateConstraint),
}

impl Constraint {
    pub fn my_gate(constraint: MyGateConstraint) -> Self {
        Constraint::MyGate(constraint)
    }
}
```

### Step 3: Implement Evaluation

```rust
impl MyGateConstraint {
    pub fn eval(&self, witness: &dyn WitnessGenerator) -> Result<FieldElement, SparkyError> {
        // Implement gate logic
        let wire0_val = witness.read_var(&self.wire0)?;
        // ... gate computation
        Ok(result)
    }
    
    pub fn log(&self) {
        println!("MyGate constraint");
    }
}
```

### Step 4: Add Kimchi Conversion

In `sparky-core/src/constraint_to_kimchi.rs`:

```rust
KimchiConstraint::MyGate => {
    vec![kimchi::circuits::gate::CircuitGate {
        typ: kimchi::circuits::gate::GateType::MyGate,
        wires: kimchi::circuits::wires::GateWires {
            0: Wire { row, col: 0 },
            // ... map all 15 wires
        },
        coeffs: vec![self.coefficient],
    }]
}
```

### Step 5: Implement Raw Gate Function

In `sparky-core/src/gates/raw_gate.rs`:

```rust
fn my_gate_impl_checked(params: &RawGateParams) -> crate::checked::Checked<()> {
    if params.values.len() < 15 {
        return error_checked("MyGate requires 15 wire values");
    }
    
    let constraint = MyGateConstraint {
        wire0: params.values[0].clone(),
        // ... map all wires
        coefficient: params.coeffs[0],
    };
    
    crate::checked::add_constraint(Constraint::my_gate(constraint))
}
```

### Step 6: Update Raw Gate Router

```rust
pub fn raw_gate(gate_type: RawGateType, params: RawGateParams) -> Checked<()> {
    match gate_type {
        // ...
        RawGateType::MyGate => my_gate_impl_checked(&params),
    }
}
```

## JavaScript Adapter Development

### Understanding MlArray Format

OCaml arrays in JavaScript have format `[0, ...actualValues]`:

```javascript
// Example: 4 limbs, 8 crumbs
const limbs = [0, limb0, limb1, limb2, limb3];  // MlArray
const crumbs = [0, crumb0, crumb1, ..., crumb7]; // MlArray

// Extract actual values
const actualLimbs = limbs.slice(1);  // Skip first element
```

### Understanding FieldConst Format

Field constants are represented as `[tag, value]`:

```javascript
// Example: coefficient 4096 (2^12)
const coeff = [0, 4096n];  // FieldConst format

// Extract value
const value = Array.isArray(coeff) ? coeff[1] : coeff;
```

### Implementing Gate Functions

In `sparky-adapter.js`:

```javascript
myGate(param1, param2, ..., param15, coeffs) {
    return this.withRuntime(() => {
        // Handle MlArray format
        if (Array.isArray(param1) && param1[0] === 0) {
            param1 = param1.slice(1);
        }
        
        // Extract coefficient values
        const coeff = Array.isArray(coeffs[0]) ? coeffs[0][1] : coeffs[0];
        
        // Map parameters to field variables
        const values = [
            this.readFieldVar(param1),
            this.readFieldVar(param2),
            // ... up to 15 values
        ];
        
        // Call raw gate
        this.rawGate(GateType.MyGate, values, [coeff]);
    });
}
```

## VK Parity Achievement

### Current Issues

1. **Constraint Structure Differences**
   - Snarky and Sparky generate different gate sequences
   - Example: Rot64 generates 3 vs 4 gates

2. **Parameter Format Mismatches**
   - MlArray format handling
   - FieldConst extraction
   - Type conversions

### Debugging Process

1. **Use Constraint Comparison Tool**
   ```bash
   npx tsx src/test/debug/test-rot64-gate.ts
   ```

2. **Analyze Output**
   ```
   Snarky gates: [Rot64, RangeCheck0, Generic]
   Sparky gates: [Generic, Rot64, Generic, Generic]
   ```

3. **Fix Adapter Implementation**
   - Match exact gate sequence
   - Ensure proper parameter handling
   - Verify coefficient formats

### Testing VK Equality

```javascript
// src/test/integration/sparky-new-gates.test.ts
it('should match VK for MyGate', async () => {
    const circuit = () => {
        // Create gate test
    };
    
    const snarkyVK = await compileWithBackend('snarky', circuit);
    const sparkyVK = await compileWithBackend('sparky', circuit);
    
    expect(sparkyVK.digest).toBe(snarkyVK.digest);
});
```

## Debugging Tools

### Constraint System Analysis

```bash
# Compare constraint systems
npm run test:constraints

# Test specific gate
npx tsx src/test/debug/test-rot64-gate.ts

# Generate comprehensive report
npm run test:sparky:report
```

### Debug Output

Enable detailed logging:

```javascript
// In sparky-adapter.js
if (DEBUG) {
    console.log('Gate params:', {
        type: gateType,
        values: values.map(v => this.fieldToHex(v)),
        coeffs: coeffs
    });
}
```

### Common Debug Patterns

1. **Check MlArray Handling**
   ```javascript
   console.log('Raw limbs:', limbs);
   console.log('Extracted:', limbs.slice(1));
   ```

2. **Verify Field Values**
   ```javascript
   const hex = this.fieldToHex(fieldVar);
   console.log('Field value:', hex);
   ```

3. **Trace Constraint Generation**
   ```javascript
   console.log('Constraints before:', this.constraintSystem.rows());
   // Gate operation
   console.log('Constraints after:', this.constraintSystem.rows());
   ```

## Common Issues and Solutions

### Issue 1: "Invalid field element string"

**Cause**: Incorrect coefficient format handling

**Solution**:
```javascript
// Wrong
const coeff = coeffArray.toString();

// Correct
const coeff = Array.isArray(coeffArray) ? coeffArray[1] : coeffArray;
```

### Issue 2: Wrong number of constraints

**Cause**: Missing or extra operations in adapter

**Solution**:
- Compare with Snarky implementation
- Check for implicit range checks
- Verify all operations match

### Issue 3: VK digest mismatch

**Cause**: Different gate ordering or parameters

**Solution**:
1. Use constraint comparison tool
2. Match exact gate sequence
3. Verify all coefficients

### Issue 4: WASM binding errors

**Cause**: Type mismatches or missing conversions

**Solution**:
```javascript
// Ensure proper type conversion
const wasmField = this.makeWasmField(jsField);
const wasmCvar = this.makeWasmCvar(row, col);
```

## Testing Strategy

### Unit Tests

Test individual gates:

```javascript
describe('MyGate', () => {
    it('generates correct constraints', () => {
        // Test constraint generation
    });
    
    it('evaluates correctly', () => {
        // Test witness generation
    });
});
```

### Integration Tests

Test with real circuits:

```javascript
it('works in zkProgram', async () => {
    const program = ZkProgram({
        publicInput: Field,
        methods: {
            test: {
                privateInputs: [Field],
                method(pub, priv) {
                    // Use gate operation
                }
            }
        }
    });
    
    await testBothBackends(program);
});
```

### Performance Tests

```javascript
it('performs within 1.5x of Snarky', async () => {
    const snarkyTime = await timeOperation('snarky', operation);
    const sparkyTime = await timeOperation('sparky', operation);
    
    expect(sparkyTime).toBeLessThan(snarkyTime * 1.5);
});
```

## Build and Development Workflow

### Building Sparky

```bash
# Full rebuild
npm run build:all

# Just Sparky WASM
npm run build:sparky

# Just TypeScript
npm run build
```

### Development Cycle

1. **Implement in Rust**
   ```bash
   cd src/sparky/sparky-core
   cargo build
   cargo test
   ```

2. **Build WASM**
   ```bash
   npm run build:sparky
   ```

3. **Update Adapter**
   - Edit `src/bindings/sparky-adapter.js`
   - No rebuild needed for JS changes

4. **Test**
   ```bash
   npm run test:sparky
   ```

5. **Debug**
   ```bash
   npx tsx src/test/debug/test-constraint-comparison.ts
   ```

## Next Steps

### Immediate Priorities

1. **Fix VK Parity Issues**
   - Rot64 constraint structure
   - Xor16 parameter handling
   - ForeignField constant format

2. **Implement Priority 2 Gates**
   - Poseidon
   - CompleteAdd
   - VarBaseMul

3. **Optimize Performance**
   - Reduce adapter overhead
   - Improve type conversions
   - Cache compiled functions

### Long-term Goals

1. **Complete Gate Coverage**
   - All Kimchi gates implemented
   - Perfect Snarky compatibility
   - Optimized implementations

2. **Proof Generation**
   - Fix module resolution issues
   - Enable full proving pipeline
   - Cross-backend proof verification

3. **Performance Parity**
   - Match or exceed Snarky speed
   - Reduce memory usage
   - Optimize WASM bindings

## Resources

- [Kimchi Specification](https://o1-labs.github.io/proof-systems/specs/kimchi.html)
- [Gate Implementations](./GATES.md)
- [VK Parity Status](./VK_PARITY_STATUS.md)
- [Development Documentation](./DEV.md)

---

*For general o1js development, see [CLAUDE.md](./CLAUDE.md). For technical details, see [DEV.md](./DEV.md).*