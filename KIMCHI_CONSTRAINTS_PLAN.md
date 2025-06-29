# Kimchi Constraints Integration Plan

## Executive Summary

The key insight: **o1js already handles R1CS→Kimchi conversion**. Sparky doesn't need to implement complex cryptographic conversions - it just needs to output the correct JSON format that o1js expects.

## Current Architecture vs Target

```
Current (broken):
Sparky → R1CS constraint JSON → ❌ (wrong format)

Target (working):
Sparky → Kimchi gate JSON → o1js gatesFromJson() → Kimchi gates → Proof
```

## The Real Problem: JSON Format Mismatch

### Current Sparky JSON Format
```json
{
  "constraints": [
    {
      "Boolean": {"Var": 1},
      "Equal": [{"Constant": "5"}, {"Var": 0}],
      "R1CS": [{"Var": 0}, {"Var": 1}, {"Constant": "35"}],
      "Square": [{"Var": 0}, {"Var": 2}]
    }
  ],
  "public_input_size": 0,
  "auxiliary_input_size": 0,
  "num_constraints": 4
}
```

### Expected o1js JSON Format
```json
{
  "gates": [
    {
      "typ": "Generic",
      "wires": [
        {"row": 0, "col": 0},
        {"row": 0, "col": 1}, 
        {"row": 0, "col": 2}
      ],
      "coeffs": ["1", "0", "0", "0", "0"]
    }
  ],
  "public_input_size": 0
}
```

## Key Differences to Address

1. **Structure**: `constraints` array → `gates` array
2. **Semantics**: Constraint-based → Gate-based representation
3. **Variables**: `{"Var": id}` → Wire positions `{row, col}`
4. **Coefficients**: Implicit → Explicit coefficient arrays as hex strings

## Implementation Plan

### Phase 1: Understand the Conversion Math (Days 1-2)

The constraint→gate conversions are straightforward linear algebra:

```rust
// Boolean constraint: x ∈ {0,1} → x*(x-1) = 0
// Generic gate: 0*l + 0*r + 0*o + 1*(l*r) + (-1) = 0
// Coeffs: ["0", "0", "0", "1", "-1"]

// Equal constraint: x = y → x - y = 0  
// Generic gate: 1*l + (-1)*r + 0*o + 0*(l*r) + 0 = 0
// Coeffs: ["1", "-1", "0", "0", "0"]

// R1CS constraint: a*b = c → a*b - c = 0
// Generic gate: 0*l + 0*r + (-1)*o + 1*(l*r) + 0 = 0  
// Coeffs: ["0", "0", "-1", "1", "0"]

// Square constraint: x² = y → x*x - y = 0
// Generic gate: 0*l + 0*r + (-1)*o + 1*(l*r) + 0 = 0
// Coeffs: ["0", "0", "-1", "1", "0"]
```

### Phase 2: Implement Gate JSON Generator (Days 3-5)

```rust
// In sparky-core/src/constraint_system.rs
impl ConstraintSystem {
    pub fn to_kimchi_json(&self) -> serde_json::Value {
        let mut gates = Vec::new();
        let mut wire_allocator = WireAllocator::new();
        
        for constraint in &self.constraints {
            let gate = self.constraint_to_gate(constraint, &mut wire_allocator);
            gates.push(gate);
        }
        
        json!({
            "gates": gates,
            "public_input_size": self.public_input_size
        })
    }
    
    fn constraint_to_gate(&self, constraint: &Constraint, allocator: &mut WireAllocator) -> serde_json::Value {
        match &constraint.typ {
            ConstraintType::Boolean(x) => {
                let (l_wire, r_wire, o_wire) = allocator.allocate_for_constraint(x, x, &Cvar::Constant(Fp::zero()));
                json!({
                    "typ": "Generic",
                    "wires": [l_wire, r_wire, o_wire],
                    "coeffs": ["0", "0", "0", "1", "-1"] // x*(x-1) = 0
                })
            },
            ConstraintType::Equal(x, y) => {
                let (l_wire, r_wire, o_wire) = allocator.allocate_for_constraint(x, y, &Cvar::Constant(Fp::zero()));
                json!({
                    "typ": "Generic", 
                    "wires": [l_wire, r_wire, o_wire],
                    "coeffs": ["1", "-1", "0", "0", "0"] // x - y = 0
                })
            },
            ConstraintType::R1CS(a, b, c) => {
                let (l_wire, r_wire, o_wire) = allocator.allocate_for_constraint(a, b, c);
                json!({
                    "typ": "Generic",
                    "wires": [l_wire, r_wire, o_wire], 
                    "coeffs": ["0", "0", "-1", "1", "0"] // a*b - c = 0
                })
            },
            // ... other constraint types
        }
    }
}

struct WireAllocator {
    current_row: usize,
    var_to_wire: HashMap<VarId, Wire>,
}

impl WireAllocator {
    fn allocate_for_constraint(&mut self, l: &Cvar, r: &Cvar, o: &Cvar) -> (Wire, Wire, Wire) {
        let l_wire = self.get_wire(l);
        let r_wire = self.get_wire(r);  
        let o_wire = self.get_wire(o);
        (l_wire, r_wire, o_wire)
    }
    
    fn get_wire(&mut self, cvar: &Cvar) -> serde_json::Value {
        match cvar {
            Cvar::Var(id, _scale) => {
                let wire = self.var_to_wire.entry(*id).or_insert_with(|| {
                    Wire { row: self.current_row, col: 0 }
                });
                json!({"row": wire.row, "col": wire.col})
            },
            Cvar::Constant(_) => {
                // Constants get allocated to special positions
                json!({"row": 0, "col": 0}) // Placeholder
            },
            // Handle linear combinations...
        }
    }
}
```

### Phase 3: Update WASM Interface (Day 6)

```rust
// In sparky-wasm/src/bindings.rs  
#[wasm_bindgen(js_name = "toJson")]
pub fn to_json(&self, _system: JsValue) -> JsValue {
    crate::run::with_run_state_ref(|state| {
        let cs = state.get_constraint_system();
        let kimchi_json = cs.to_kimchi_json(); // ← This is the key change
        JsValue::from_str(&kimchi_json.to_string())
    })
}
```

### Phase 4: Testing & Validation (Days 7-10)

```rust
#[test]
fn test_sparky_json_matches_snarky() {
    // Create identical circuits in both backends
    let sparky_json = sparky_circuit();
    let snarky_json = snarky_circuit(); 
    
    // Should produce identical gate structures
    assert_eq!(sparky_json["gates"], snarky_json["gates"]);
    assert_eq!(sparky_json["public_input_size"], snarky_json["public_input_size"]);
}
```

## Constraint to Gate Type Mappings

### Basic Constraint Types

| Sparky Constraint | Generic Gate Coefficients | Description |
|-------------------|---------------------------|-------------|
| `Boolean(x)` | `["0", "0", "0", "1", "-1"]` | `x*(x-1) = 0` |
| `Equal(x, y)` | `["1", "-1", "0", "0", "0"]` | `x - y = 0` |
| `R1CS(a, b, c)` | `["0", "0", "-1", "1", "0"]` | `a*b - c = 0` |
| `Square(x, y)` | `["0", "0", "-1", "1", "0"]` | `x*x - y = 0` |

### Generic Gate Formula
```
sl*l + sr*r + so*o + sm*(l*r) + sc = 0
```
Where coefficients are: `[sl, sr, so, sm, sc]`

### Wire Allocation Strategy
- 15 wires per row: `[0-14]`
- Primary wires: `0` (left), `1` (right), `2` (output)
- Auxiliary wires: `3-14` for additional constraints
- Public inputs occupy first N rows

## Advanced Features (Future Phases)

### Specialized Gate Types
- `Poseidon` gates for hash operations
- `CompleteAdd`, `VarBaseMul` for elliptic curve operations
- `RangeCheck0`, `RangeCheck1` for range checking
- `ForeignFieldAdd`, `ForeignFieldMul` for cross-chain compatibility
- `Lookup`, `Xor16`, `Rot64` for specialized operations

### Linear Combination Handling
Complex expressions like `2x + 3y` require:
1. Auxiliary variable allocation
2. Multiple constraint decomposition
3. Proper wire connection management

### Optimization Opportunities
- Wire packing: Multiple operations per row
- Constant propagation: Eliminate redundant constraints
- Gate fusion: Combine compatible operations

## Success Criteria

1. **Functional**: Sparky JSON accepted by o1js `gatesFromJson()`
2. **Compatible**: Identical circuit compilation to Snarky
3. **Complete**: All constraint types properly converted
4. **Testable**: Comprehensive test suite comparing outputs

## Key Advantages

1. **Reuses Existing o1js Logic**: No cryptographic conversion needed
2. **Minimal Changes**: Only JSON format modification required
3. **Proven Architecture**: Leverages working Snarky→o1js pipeline
4. **Incremental**: Can implement one constraint type at a time
5. **Testable**: Easy JSON comparison between backends

## Implementation Timeline

- **Week 1**: Basic constraint type conversions (Boolean, Equal, R1CS, Square)
- **Week 2**: Wire allocation and JSON formatting
- **Week 3**: Testing and integration with o1js
- **Week 4**: Advanced features and optimization

## Risk Mitigation

1. **Start Simple**: Implement basic constraints first
2. **Test Early**: Validate JSON format with o1js immediately
3. **Compare Outputs**: Use Snarky as reference implementation
4. **Incremental Integration**: One constraint type at a time

## Conclusion

This approach transforms a complex cryptographic conversion problem into a straightforward interface compatibility issue. By outputting the correct JSON format, Sparky can immediately leverage o1js's existing Kimchi integration without reimplementing the mathematical conversions.

The key insight is that **we don't need to understand Kimchi's internal gate representations** - we just need to match the JSON schema that o1js already knows how to process.