# SPARKY PUBLIC INPUT BUG ANALYSIS

**Created**: January 6, 2025 12:00 UTC  
**Last Modified**: January 6, 2025 16:30 UTC

## 🚨 CRITICAL DISCOVERY: Public Inputs Not Being Tracked

### The Smoking Gun

From the test output:
```
🔧 OCaml CONSTRAINT BRIDGE: gates=1, publicInputSize=0, constraints=1
```

The `publicInputSize=0` even though our ZkProgram clearly defines:
```javascript
const SimpleProgram = ZkProgram({
  name: 'SimpleProgram',
  publicInput: Field,  // <-- This exists!
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {  // <-- Used here!
        const result = a.mul(b).add(publicInput);
        return { publicOutput: result };
      },
    },
  },
});
```

### Code Analysis

1. **LIR Export** (`lir_export.rs:105`):
   ```rust
   Reflect::set(&cs_obj, &"public_input_size".into(), &JsValue::from(public_input_count as u32))
   ```
   The value comes from `constraint_system.public_input_count`

2. **LIR Constraint System** (`lir.rs:48`):
   ```rust
   pub struct LirConstraintSystem<F: PrimeField> {
       pub constraints: Vec<LirConstraint<F>>,
       pub variable_count: usize,
       pub public_input_count: usize,  // <-- This field exists
       pub auxiliary_input_count: usize,
       pub witness: HashMap<VarId, FieldElement<F>>,
   }
   ```

3. **Initialization** (`lir.rs:457-465`):
   ```rust
   pub fn new() -> Self {
       Self {
           constraints: Vec::new(),
           variable_count: 0,
           public_input_count: 0,  // <-- Always initialized to 0!
           auxiliary_input_count: 0,
           witness: HashMap::new(),
       }
   }
   ```

4. **MIR to LIR Transformation** (`mir_to_lir.rs`):
   - Creates `LirConstraintSystem::new()` which sets `public_input_count: 0`
   - Never updates this value during transformation
   - The public input information from the ZkProgram is lost!

### Why This Breaks PLONK/Kimchi

In PLONK, public inputs require special handling:

1. **Generic Gates**: Public inputs need "generic gates" that constrain them to specific values
2. **Permutation Argument**: Public input wires must be included in the permutation
3. **Circuit Structure**: The first rows typically contain public input constraints

Without proper public input handling:
- The constraint system is incomplete
- The permutation argument doesn't account for public input wires
- Kimchi's permutation polynomial check fails because the circuit structure is wrong

### The Permutation Connection

The "permutation was not constructed correctly: final value" error likely occurs because:

1. Kimchi expects public input gates at the beginning of the circuit
2. These gates should have specific wire arrangements for the permutation
3. Without them, the permutation polynomial `z` doesn't evaluate correctly
4. The check `z[n - zk_rows] != F::one()` fails

### What Needs to Be Fixed

1. **Track Public Inputs**: During MIR creation or transformation, count and track public inputs
2. **Update LIR**: Set `constraint_system.public_input_count` correctly
3. **Add Public Input Gates**: Generate the necessary generic gates for public inputs
4. **Include in Permutation**: Ensure public input wires are part of the permutation argument

### Current Workaround Impact

The optimization mode change from `Aggressive` to `SnarkyCompatible` doesn't fix this issue - it just changes how constraints are generated. The public input bug remains regardless of optimization level.

### CRITICAL UPDATE: The Fix Already Exists!

The code to handle public inputs **already exists** in `circuit_finalization.rs`:

```rust
pub fn add_public_input_gates(
    constraints: &mut Vec<LirConstraint<PallasField>>,
    public_input_count: usize
) {
    // Creates generic gates for public inputs at rows 0, 1, 2, ...
    // These gates have the form: 1 * public_input_i = public_input_i
}

pub fn finalize_constraint_system(
    constraint_system: &mut LirConstraintSystem<PallasField>,
    permutation_cycles: &mut Vec<LirPermutationCycle>
) {
    let public_input_count = constraint_system.public_input_count;
    
    if public_input_count > 0 {
        // Add public input gates
        add_public_input_gates(&mut constraint_system.constraints, public_input_count);
        // Update wire positions in permutation cycles
    }
}
```

**BUT IT'S NEVER CALLED** because `public_input_count` is always 0!

### The Real Fix Required

1. **Track public inputs from ZkProgram definition**: When a ZkProgram specifies `publicInput: Field`, this needs to be counted
2. **Pass the count through MIR to LIR**: Update `constraint_system.public_input_count` during transformation
3. **Call finalization**: Ensure `finalize_constraint_system` is called before exporting

### INVESTIGATION UPDATE: How Snarky Actually Handles Public Inputs

After thorough investigation, I discovered that **Snarky does NOT track public inputs during constraint generation**. Here's how it actually works:

#### Snarky's Approach:
1. **During constraint generation** (`analyzeMethod`/`Provable.constraintSystem`):
   - Public and private variables are treated identically
   - The constraint system JSON shows `publicInputSize: 0`
   - No special marking of public input variables

2. **During compilation** (`ZkProgram.compile`):
   ```typescript
   result = Pickles.compile(MlArray.to(compilationRules), {
     publicInputSize: publicInputType.sizeInFields(),  // <-- Passed as metadata
     publicOutputSize: publicOutputType.sizeInFields(),
     // ...
   });
   ```
   - Public input size is calculated from the ZkProgram definition
   - Passed to Pickles as compilation metadata
   - Pickles uses this to determine which variables are public

3. **Key Insight**: The public/private distinction is **compilation metadata**, not part of the constraint system itself!

### The Real Problem with Sparky

Sparky's issue is that this compilation metadata isn't being passed through:

1. **Current Flow**:
   - ZkProgram knows `publicInput: Field` exists
   - During compilation, `publicInputType.sizeInFields()` returns 1
   - But Sparky's constraint system always returns `public_input_size: 0`
   - The LIR export doesn't have access to the compilation context

2. **Why the Fix Code Doesn't Run**:
   - `circuit_finalization.rs` has the code to add public input gates
   - But it's never called because `public_input_count` is always 0
   - The public input count needs to be set from the TypeScript compilation context

### Proposed Solution

The fix requires passing the public input size from the TypeScript compilation context to Sparky:

#### Option 1: Compilation Context (Preferred)
1. Before constraint generation for a ZkProgram method, set a global state in Sparky:
   ```typescript
   // In zkprogram.ts analyzeMethod or compile
   if (getCurrentBackend() === 'sparky') {
     sparkyConstraintBridge.setCompilationContext({
       publicInputSize: publicInputType.sizeInFields(),
       publicOutputSize: publicOutputType.sizeInFields()
     });
   }
   ```

2. Sparky reads this context when generating the constraint system JSON:
   ```rust
   // In lir_export.rs
   let public_input_count = get_compilation_context().public_input_size;
   ```

#### Option 2: Constraint System Post-Processing
1. After getting the constraint system from Sparky, inject the public input size:
   ```typescript
   // In provable-context.ts constraintSystemToJS
   if (getCurrentBackend() === 'sparky') {
     json.public_input_size = getActivePublicInputSize();
   }
   ```

### Why This Matters

Without the correct public input size:
1. Kimchi/PLONK expects public input gates at the beginning
2. The permutation polynomial is constructed incorrectly
3. The verification key hash doesn't match
4. Single-constraint circuits fail with permutation errors

### Recommendation

This is the **root cause** of the permutation bug. The fix requires:
1. Pass `public_input_count` from TypeScript compilation context to Sparky
2. Ensure the LIR export uses this value when generating JSON
3. The existing `circuit_finalization.rs` code will then add the required gates
4. The permutation will include the public input wires correctly

The variable unification fix was correct but insufficient - the missing public inputs are preventing the permutation from being constructed properly.

## Implementation Plan

### Step 1: Add Compilation Context to Sparky (Rust)

**File**: `src/sparky/sparky-wasm/src/lib.rs`
```rust
// Add a global compilation context
static COMPILATION_CONTEXT: Mutex<CompilationContext> = Mutex::new(CompilationContext::default());

#[derive(Default)]
struct CompilationContext {
    public_input_size: usize,
    public_output_size: usize,
}

#[wasm_bindgen]
impl Snarky {
    /// Set compilation context (called from TypeScript)
    pub fn set_compilation_context(&self, public_input_size: u32, public_output_size: u32) {
        if let Ok(mut ctx) = COMPILATION_CONTEXT.lock() {
            ctx.public_input_size = public_input_size as usize;
            ctx.public_output_size = public_output_size as usize;
        }
    }
}
```

### Step 2: Use Context in LIR Export

**File**: `src/sparky/sparky-wasm/src/lir_export.rs`
```rust
// In export_lir_to_json function
pub fn export_lir_to_json(lir: &LowLevelIr<PallasField>) -> JsValue {
    // Get public input count from compilation context if available
    let public_input_count = if let Ok(ctx) = COMPILATION_CONTEXT.lock() {
        if ctx.public_input_size > 0 {
            ctx.public_input_size
        } else {
            // Fallback to LIR's count
            match lir {
                LowLevelIr::ConstraintSystem(cs) => cs.public_input_count,
                LowLevelIr::Program(program) => program.constraint_system.public_input_count,
            }
        }
    } else {
        // Fallback if lock fails
        match lir {
            LowLevelIr::ConstraintSystem(cs) => cs.public_input_count,
            LowLevelIr::Program(program) => program.constraint_system.public_input_count,
        }
    };
    
    // Use the public_input_count when setting the JSON field
    Reflect::set(&cs_obj, &"public_input_size".into(), &JsValue::from(public_input_count as u32)).unwrap_or_default();
}
```

### Step 3: Set Context from TypeScript

**File**: `src/lib/proof-system/zkprogram.ts`
```typescript
// In analyzeMethod function
async function analyzeMethod(
  publicInputType: Provable<any>,
  methodIntf: MethodInterface,
  method: (...args: any) => unknown
): Promise<MethodAnalysis> {
  // Set compilation context for Sparky
  if (getCurrentBackend() === 'sparky' && globalThis.sparkyConstraintBridge) {
    const sparkyInstance = globalThis.sparkyConstraintBridge.getSparkyInstance();
    if (sparkyInstance?.setCompilationContext) {
      sparkyInstance.setCompilationContext(
        publicInputType.sizeInFields(),
        0 // publicOutputType not available in analyzeMethod
      );
    }
  }
  
  // ... rest of the function
}
```

### Step 4: Add to Constraint Bridge

**File**: `src/bindings/sparky-adapter/constraint-bridge.ts` (or wherever the bridge is defined)
```typescript
export const sparkyConstraintBridge = {
  // ... existing methods
  
  getSparkyInstance(): any {
    return getSparkyInstance();
  },
  
  // ... rest of the bridge
};
```

### Testing the Fix

1. Build Sparky WASM with the new changes
2. Run the test that was failing:
   ```bash
   npm run test:sparky-comprehensive
   ```
3. Verify that `publicInputSize` is now correctly set in the constraint system JSON
4. Check that the permutation error is resolved

### Expected Outcome

With this fix:
- The constraint system JSON will have the correct `public_input_size`
- The `circuit_finalization.rs` code will add public input gates
- The permutation will be constructed correctly
- Single-constraint circuits with public inputs will work