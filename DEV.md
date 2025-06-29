# o1js Development Documentation

**Last Updated**: June 29, 2025

This document consolidates all technical documentation for o1js development, including backend switching, Sparky integration, security issues, and implementation status.

## Table of Contents

1. [Backend Switching](#backend-switching)
2. [Sparky Integration](#sparky-integration)
3. [Elliptic Curve Operations](#elliptic-curve-operations)
4. [Security Issues](#security-issues)
5. [Implementation Plans](#implementation-plans)
6. [Performance Benchmarks](#performance-benchmarks)
7. [Build System](#build-system)

---

## Backend Switching

### Overview

o1js supports runtime switching between the OCaml Snarky backend and the Rust Sparky backend. The implementation is simpler than originally designed but fully functional.

### Current Implementation

The actual backend switching is implemented in `src/bindings.js`:

```javascript
// Switch backends
await switchBackend('sparky');  // or 'snarky'

// Check current backend
console.log(getCurrentBackend()); // returns 'snarky' or 'sparky'

// Environment variable support
export O1JS_BACKEND=sparky
```

### What Actually Exists

✅ **Working Features**:
- Simple `switchBackend('snarky' | 'sparky')` function
- `getCurrentBackend()` to check active backend
- Environment variable support (`O1JS_BACKEND`)
- Sparky adapter files for compatibility (1,150+ lines)
- Both backends can compile ZkPrograms
- Backend state properly isolated

❌ **What Doesn't Exist** (contrary to some documentation):
- No backend abstraction layer in `src/lib/backend/`
- No registry system or configuration files
- No `BackendType` enum (uses simple strings)
- No performance benchmarking framework
- No thread-safe backend switching implementation

### Architecture

```
Current Implementation:
bindings.js → switchBackend() → loads either:
  - Snarky: OCaml bindings via js_of_ocaml
  - Sparky: Rust WASM via sparky-adapter.js

Sparky Adapter (1,755 lines total):
- sparky-adapter.js (1,150 lines) - Node.js version
- sparky-adapter.web.js (605 lines) - Browser version
```

### Usage Examples

```javascript
import { Field, ZkProgram, initializeBindings, switchBackend } from 'o1js';

// Initialize with default (Snarky)
await initializeBindings();

// Create a ZkProgram
const MyProgram = ZkProgram({
  name: 'example',
  publicInput: Field,
  methods: {
    prove: {
      privateInputs: [Field],
      method(publicInput: Field, secret: Field) {
        secret.square().assertEquals(publicInput);
      }
    }
  }
});

// Compile with Snarky
let { verificationKey: snarkyVK } = await MyProgram.compile();

// Switch to Sparky
await switchBackend('sparky');

// Compile with Sparky
let { verificationKey: sparkyVK } = await MyProgram.compile();
```

### Current Limitations

1. **Sparky Adapter Completeness**:
   - ✅ EC operations (ecScale, ecEndoscale) - NOW IMPLEMENTED
   - ❌ Lookup tables - Still has placeholder implementation
   - ❌ Foreign field operations - Not implemented

2. **Proof Generation**: Module resolution errors prevent full proof generation with Sparky

3. **Performance**: The adapter layer adds overhead (100+ type conversions)

---

## Sparky Integration

### Overview

Sparky is a Rust port of the OCaml Snarky library, integrated as a git submodule at `src/sparky/`. It provides zkSNARK functionality with WASM compatibility.

### Directory Structure

```
o1js/
├── src/
│   ├── sparky/                    # Sparky submodule (1.2GB)
│   │   ├── sparky-core/          # Core Rust implementation
│   │   ├── sparky-wasm/          # WASM bindings
│   │   └── target/               # Build artifacts (1.2GB - consider removing)
│   ├── bindings/
│   │   ├── sparky-adapter.js     # Compatibility layer
│   │   ├── compiled/
│   │   │   ├── sparky_web/       # Web WASM artifacts
│   │   │   └── sparky_node/      # Node.js WASM artifacts
```

### Build Commands

```bash
# Build Sparky WASM bindings
npm run build:sparky

# This will:
# 1. Build WASM for both web and Node.js targets
# 2. Copy artifacts to src/bindings/compiled/
# 3. Update SPARKY_COMMIT file
```

### Current Feature Status

✅ **Working in Sparky**:
- Field arithmetic (Pallas field)
- Constraint system (R1CS)
- Poseidon hash function (verified identical results)
- EC operations (ecScale, ecEndoscale, ecEndoscalar)
- Range check operations (rangeCheck, rangeCheck0, rangeCheck1)
- WASM bindings with JavaScript API
- Backend switching
- Cryptographically secure field.random()

❌ **Not Working**:
- Lookup tables (partially implemented)
- Foreign field operations
- Full proof generation pipeline (module resolution errors)

⚠️ **Issues**:
- 1.2GB disk usage (mostly target/ directory)
- 4,012 files in sparky subdirectory
- Complex adapter layer (1,755 lines across two files)

### Key Statistics

- **Disk Usage**: 1.2GB total
  - `target/`: 1.2GB (build artifacts - should be deleted)
  - `sparky-wasm/`: 876KB
  - Other source: ~500KB
- **File Count**: 4,012 files
- **Adapter Complexity**: 
  - 100 type conversions
  - 27 error handling paths
  - 8 switch statement cases

---

## Elliptic Curve Operations

### Current Status (June 29, 2025)

✅ **All EC operations have been implemented and are working in the Sparky adapter.**

### Implemented Operations

#### 1. ecScale - Variable-Base Scalar Multiplication
- **Location**: `src/bindings/sparky-adapter.js:527-612`
- **Algorithm**: Windowed scalar multiplication
- **Features**: 
  - Processes scalar bits in windows
  - Generates proper constraints
  - Handles accumulator states

#### 2. ecEndoscale - Endomorphism-Accelerated Scalar Multiplication
- **Location**: `src/bindings/sparky-adapter.js:614-718`
- **Algorithm**: GLV (Gallant-Lambert-Vanstone) decomposition
- **Features**:
  - ~50% performance improvement
  - GLV decomposition: k = k1 + k2*λ
  - Validates elliptic curve equation: y² = x³ + 5

#### 3. ecEndoscalar - Scalar Decomposition Validation
- **Location**: `src/bindings/sparky-adapter.js:720-751`
- **Purpose**: Validates scalar decomposition for GLV endomorphism

### Historical Context

The EC operations were previously criticized as "fundamentally flawed" because early implementations used field arithmetic instead of proper elliptic curve operations. These issues have been completely resolved in the current implementation.

---

## Security Issues

### Overview

This section tracks security vulnerabilities and their resolution status.

### Math.random() Usage

**Status**: ✅ PARTIALLY FIXED

#### Fixed Issues

1. **Sparky Adapter Field Random** (FIXED)
   - **File**: `src/bindings/sparky-adapter.js`
   - **Old**: Used `Math.random()` for cryptographic operations
   - **New**: Uses `Fp.random()` with cryptographically secure randomness
   - **Verification**: Tested and confirmed working

#### Remaining Issues

2. **Global Context ID Generation** (NOT FIXED)
   - **File**: `src/lib/util/global-context.ts:80`
   - **Code**: `let id = Math.random();`
   - **Impact**: Context IDs might be predictable

3. **AccountUpdate ID Generation** (NOT FIXED)
   - **File**: `src/lib/mina/v1/account-update.ts:663,1108`
   - **Impact**: Transaction component IDs could be predictable

4. **RandomId Type** (NOT FIXED)
   - **File**: `src/lib/provable/types/auxiliary.ts`
   - **Impact**: IDs in provable computations might be predictable

### Security Guidelines

**NEVER use Math.random() for**:
- Cryptographic keys or nonces
- Random field elements
- Transaction IDs
- Any security-sensitive randomness

**ALWAYS use**:
- `src/bindings/crypto/random.ts` (Node.js)
- `src/bindings/crypto/random.web.ts` (Browser)
- `Fp.random()` for field elements

---

## Implementation Plans

### Field.readVar Fix (COMPLETED)

The `field.readVar` function has been successfully implemented in the Sparky adapter. It now correctly handles:
- Constants: Returns the constant value
- Variables: Reads from witness array in prover mode
- Compound expressions: Evaluates Add/Scale operations recursively

### Kimchi Constraints Integration

**Status**: May be outdated - both backends successfully compile ZkPrograms

The original plan discussed converting R1CS constraints to Kimchi gate format. However, testing shows both backends work, suggesting this may have been resolved or worked around.

### Build System Updates

The build system has been updated to support Sparky:
- `npm run build:sparky` - Builds WASM bindings
- `npm run build:update-bindings` - Updates all bindings
- WASM artifacts are properly copied to compiled directories

---

## Performance Benchmarks

### Poseidon Hash Performance

**Snarky vs Sparky Comparison**:
- Both produce identical hash results
- Example: `Poseidon.hash([100, 0]) = 1259702704738371196984972831885384469288156549426257425022876410209069764640`
- Performance comparison pending

### Constraint Generation

- Poseidon hash: 660 R1CS constraints per operation
- EC operations: Proportional to scalar bit length
- Memory efficiency: Rust implementation shows good characteristics

---

## Build System

### Sparky WASM Building

```bash
# Full build process
npm run build:update-bindings  # Rebuild OCaml bindings
npm run build:sparky          # Build Sparky WASM
npm run build                 # Standard o1js build

# The build:sparky script:
1. Builds WASM for web target
2. Builds WASM for Node.js target  
3. Copies artifacts to src/bindings/compiled/
4. Updates SPARKY_COMMIT tracking file
```

### Known Issues

- `import.meta` warnings in CJS format (can be ignored)
- WASM file paths need proper resolution in bundled environments
- Dynamic imports cause issues in some contexts

---

## Recommendations and TODOs

### Immediate Actions
1. **Delete `src/sparky/target/`** to save 1.2GB
2. **Fix remaining Math.random()** security issues in:
   - `src/lib/util/global-context.ts`
   - `src/lib/mina/v1/account-update.ts`
   - `src/lib/provable/types/auxiliary.ts`

### Missing Gate Operations (from REMINDERS.md)
- [ ] **Range check gates**: Some range check functionality may still be incomplete
- [ ] **Lookup gates**: `lookup` gate functionality confirmed missing
- [ ] **Foreign field operations**: `foreignFieldAdd`, `foreignFieldMul` not implemented

### Constraint System Issues
- [ ] **Fix constraint system format**: May need to match Snarky's object format more closely
- [ ] **Implement proper row counting**: `constraintSystem.rows()` may return incorrect values
- [ ] **Add constraint system JSON serialization**: Ensure format compatibility

### Testing Priorities
- [ ] **Create comprehensive comparison tests**: Test every API method with both backends
- [ ] **Add performance benchmarks**: Compare Sparky vs Snarky performance
- [ ] **Test with real zkApps**: Ensure compatibility with existing applications

### Short Term Goals
1. Fix proof generation module resolution
2. Complete foreign field operations implementation
3. Reduce adapter complexity (currently 1,755 lines)

### Long Term Goals
1. Consider native Kimchi gate generation in Sparky
2. Optimize type conversions in adapter (currently 100+ conversions)
3. Add comprehensive performance benchmarking suite
4. Decide whether to adapt Sparky to match Snarky API or create new unified API

---

## Migration Notes

When working with backend switching:
1. Always await `switchBackend()` - it's asynchronous
2. Check current backend with `getCurrentBackend()`
3. Both backends should produce identical results for basic operations
4. Sparky is missing some advanced features (lookup, foreign fields)
5. Proof generation currently only works with Snarky

---

*This document consolidates technical information previously spread across 18+ separate files. For general o1js documentation, see README.md. For contribution guidelines, see CONTRIBUTING.md.*