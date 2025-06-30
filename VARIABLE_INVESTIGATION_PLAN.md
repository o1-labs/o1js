# Variable Benchmark Investigation Plan - Are We Actually Testing Variables?

## 🚨 **CRITICAL CONCERN**

Our benchmark shows only a **1.05x gap** between "variables" and "constants" (5752ms vs 5518ms). This is **suspicious** and suggests our "variable" operations might actually be getting optimized to constants during compilation.

## 🔍 **Hypothesis: Variables Are Being Optimized Away**

### **Evidence Supporting This Hypothesis:**
1. **Tiny performance gap**: 1.05x vs expected 2-3x for WASM boundary crossings
2. **Deterministic witness values**: `Field.from(seed.toBigInt() + 1n)` might be resolved at compile time
3. **Compilation vs runtime**: Circuit compilation might treat witness values as constants
4. **No logging output showing different paths**: We don't see evidence of WASM vs PoseidonBigint usage

### **What This Means:**
- Our "variable" benchmark might be **fake** - still using the constant optimization path
- We're not actually validating that variable operations use WASM
- The optimization might be working, but we're not properly testing the unoptimized case

## 🎯 **Investigation Strategy**

### **Phase 1: Add Extensive Logging** 
**Goal**: See which code paths are actually taken during compilation

1. **Instrument sparky-adapter.js**:
   - Add console.log to `poseidon.update()` to show when constant vs WASM paths are taken
   - Log the actual FieldVar types being processed
   - Show whether `isConstant()` returns true or false

2. **Add constraint counting**:
   - Count how many constraints are generated for constant vs variable benchmarks
   - If they're the same, then variables are being optimized away

### **Phase 2: Force True Variables**
**Goal**: Find ways to create operations that CANNOT be optimized to constants

1. **Try different variable-forcing techniques**:
   - Use `exists()` instead of `Provable.witness()`
   - Create variables that depend on private inputs in ways that can't be optimized
   - Use random values that are different each compilation

2. **Use constraint-generating operations**:
   - Add assertions that force constraint generation
   - Use multiplication constraints that must create variables
   - Try conditional logic that can't be optimized away

### **Phase 3: WASM Call Verification**
**Goal**: Directly verify that WASM is being called for variables

1. **Add WASM logging**:
   - Instrument the WASM layer to log when Poseidon functions are called
   - Count WASM boundary crossings during compilation
   - Compare call counts between constant and variable benchmarks

2. **Performance profiling**:
   - Use Node.js profiler to see actual function call patterns
   - Identify if WASM functions are being invoked

### **Phase 4: Alternative Approaches**
**Goal**: Try completely different ways to force variable operations

1. **Runtime randomness**:
   - Use truly random values that change between compilation runs
   - Use external data sources that can't be optimized

2. **Complex constraint patterns**:
   - Create operations that definitely require constraint system interaction
   - Use lookup tables or other operations that can't be constant-folded

## 🛠️ **Implementation Plan**

### **Step 1: Instrument Poseidon Adapter (HIGH PRIORITY)**
```javascript
// In sparky-adapter.js poseidon.update()
update(state, input) {
  const stateFields = state.slice(1);
  const inputFields = input.slice(1);
  
  console.log('🔍 [POSEIDON DEBUG] Checking if constant...');
  console.log('   State fields:', stateFields.map(f => typeof f === 'object' ? f[0] : 'unknown'));
  console.log('   Input fields:', inputFields.map(f => typeof f === 'object' ? f[0] : 'unknown'));
  
  const isConstantState = isConstant(stateFields);
  const isConstantInput = isConstant(inputFields);
  
  console.log(`   isConstant(state): ${isConstantState}`);
  console.log(`   isConstant(input): ${isConstantInput}`);
  
  if (isConstantState && isConstantInput) {
    console.log('✅ [OPTIMIZATION] Using PoseidonBigint (JavaScript) path');
    // ... existing constant optimization code
  } else {
    console.log('🔥 [WASM] Using Sparky WASM boundary crossing');
    // ... existing WASM code
  }
}
```

### **Step 2: Create More Aggressive Variable Benchmark**
```javascript
// Force truly variable operations that can't be optimized
variableOperations: {
  privateInputs: [Field, Field, Field],
  
  async method(seed1, seed2, seed3) {
    // Method 1: Use exists() with random computation
    const randomVar1 = exists(Field, () => {
      return Field.random(); // Different every time
    });
    
    // Method 2: Create constraint relationships
    const var2 = exists(Field, () => Field.from(42));
    var2.mul(var2).assertEquals(var2.square()); // Force constraint
    
    // Method 3: Use the random variables in Poseidon
    const hash1 = Poseidon.hash([randomVar1, var2]);
    
    // These should definitely hit WASM
    return { publicOutput: hash1 };
  }
}
```

### **Step 3: Constraint System Analysis**
```javascript
// Compare constraint counts
const constantConstraints = await constraintSystem.count(constantProgram);
const variableConstraints = await constraintSystem.count(variableProgram);

console.log(`Constant program constraints: ${constantConstraints}`);
console.log(`Variable program constraints: ${variableConstraints}`);

if (constantConstraints === variableConstraints) {
  console.log('🚨 WARNING: Same constraint count - variables might be optimized away!');
}
```

## 🔬 **Debugging Questions to Answer**

1. **Are witness values being treated as constants during compilation?**
2. **Is `isConstant()` returning true for operations that should be variable?**
3. **Are we actually hitting the WASM boundary or always using PoseidonBigint?**
4. **Do constant and variable programs generate different constraint counts?**
5. **Can we create operations that definitely can't be constant-folded?**

## 🎯 **Success Criteria for Investigation**

### **Evidence that variables are working:**
- ✅ Logging shows WASM path being taken for variable operations
- ✅ Different constraint counts between constant and variable programs  
- ✅ Significant performance gap (2-3x) between backends for variables
- ✅ `isConstant()` returns false for variable operations

### **Evidence that variables are being optimized away:**
- ❌ Both benchmarks show constant optimization path in logs
- ❌ Same constraint counts for both programs
- ❌ Minimal performance difference between constant and variable operations
- ❌ `isConstant()` returns true for all operations

## 🚨 **If Variables Are Being Optimized Away**

**This would mean:**
1. Our benchmark is **invalid** - we're not testing the unoptimized case
2. We don't know if WASM boundary crossing is actually slow for Sparky
3. We need to find the **real** bottleneck that makes Sparky slower
4. The performance gap might be elsewhere (proving, verification, other operations)

## 🎖️ **Investigation Priority**

**CRITICAL**: This investigation is essential because:
- It validates whether our optimization testing is meaningful
- It identifies if we're solving the right performance problem
- It ensures our benchmark results are accurate and trustworthy
- It guides where to focus future optimization efforts

**If our variables are fake, we need to find the REAL performance bottleneck!**