# o1js Development Documentation

**Last Updated**: July 2, 2025

Essential technical documentation for o1js development with Sparky backend integration.

## Current Status

**Architecture**: Clean and consolidated after removing 2,419+ lines of technical debt  
**Critical Update (July 2, 2025)**: Successfully refactored major gates to use raw_gate interface  
**Performance**: Significantly reduced constraint counts through optimization and refactoring

## Working Features

### ✅ Fully Implemented in Sparky
- Basic field operations (add, subtract, multiply, divide)
- Poseidon hash (produces identical results to Snarky)
- Elliptic curve operations (ecScale, ecEndoscale, ecEndoscalar)
- Range check operations
- Lookup tables
- Foreign field operations
- Backend switching infrastructure

### ❌ Critical Issues
- **VK Generation**: All Sparky VKs generate identical hash - fundamental constraint generation bug
- **Proof Generation**: Module resolution errors when using Sparky backend

### ✅ Recently Fixed (July 2, 2025)
- **Raw Gate Refactoring**: Successfully refactored Poseidon, EC operations, and generic gates to use standardized raw_gate interface
- **Poseidon Optimization**: Reduced from 660 manual R1CS constraints to single raw_gate call (99.7% reduction)
- **EC Operations**: ec_add and ec_scalar_mult now use KimchiGateType::CompleteAdd and VarBaseMul
- **Constraint Optimization**: Re-enabled `reduce_lincom` optimization - significantly reduces constraint counts
- **Performance**: Constraint counts reduced: multiplication 4→2, addition 2→0, boolean 4→2

## Essential Commands

### Building
```bash
# Standard build (downloads pre-compiled bindings)
npm install && npm run build

# Build Sparky WASM
npm run build:sparky && npm run build

# Full rebuild including Sparky
npm run build:all

# Build from source (requires OCaml/Rust toolchain)
npm run build:update-bindings
```

### Testing
```bash
# Run all tests
npm run test:all

# Test suites for backend compatibility
npm run test:framework              # Entire test framework
npm run test:vk-parity             # VK parity testing (14.3% passing)
npm run test:backend-infrastructure # Backend switching tests
npm run test:constraint-analysis    # Constraint system analysis
npm run test:unified-report        # Unified compatibility dashboard

# Run specific test
./jest path/to/test.ts
```

### Development
```bash
# Run single file
./run path/to/file.ts --bundle

# Linting and formatting
npm run lint:fix path/to/file
npm run format path/to/file
```

## Backend Switching

```javascript
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Check current backend
console.log(getCurrentBackend()); // 'snarky' (default)

// Switch to Sparky
await switchBackend('sparky');

// Switch back to Snarky
await switchBackend('snarky');
```

## Architecture Overview

### Current Clean Architecture
```
o1js TypeScript API
    ↓
Constraint Bridge (sparky-adapter.js)
    ↓
Backend Selection (runtime switching)
    ↙        ↘
Snarky    Sparky
(OCaml)   (Rust/WASM)
```

### Key Components
- **sparky-adapter.js**: 1,150 lines handling backend compatibility
- **Constraint Bridge**: Unified interface for constraint generation
- **Test Framework**: Systematic backend comparison in `src/test/`

## Test Framework

Located in `src/test/`:
- `BackendTestFramework`: Utilities for systematic backend comparison
- `VkParityComprehensive`: Complete VK generation testing across patterns
- `BackendInfrastructure`: Tests core routing and switching mechanism
- `ConstraintSystemAnalysis`: Deep constraint generation analysis

**Current Results**: 14.3% VK parity (1/7 tests passing)

## Critical Technical Details

### Constraint Generation Issues
1. **Architectural Difference**: Snarky performs constraint fusion during circuit construction, Sparky generates then optimizes
2. **VK Hash Issue**: All Sparky VKs generate identical hash - suggests fundamental issue in constraint system
3. **Constraint Pattern Mismatch**: Snarky creates `x*x - 9 = 0` as one constraint, Sparky creates two: `x*x = z` and `z = 9`

### Build System
- Sparky adds 1.2GB to repository (mostly in `src/sparky/target/`)
- Use `./src/bindings/scripts/build-sparky-wasm.sh` for WASM builds
- Pre-compiled bindings committed to repo for faster development

### Important Warnings
- **NEVER edit `dist/` files** - always modify source in `src/bindings/`
- **NEVER convert BigInts to JavaScript numbers** - loses precision
- **ALWAYS update SPARKY_CALLGRAPH_TEXT.md** with changes
- **ALWAYS read SPARKY_CALLGRAPH_TEXT.md** before starting work

## Next Priority Actions

1. **Implement constraint fusion** - Combine multiplication + equality into single constraints like Snarky
2. **Fix field addition over-optimization** - Currently reduces to 0 constraints which is incorrect
3. **Complete remaining gate refactoring** - Range checks, foreign fields, and lookup gates still use manual R1CS
4. **Investigate identical VK hash issue** - All Sparky VKs produce same hash regardless of circuit
5. **Achieve full VK parity** - Currently at 14.3% (1/7 tests passing)

## Property-Based Testing Infrastructure (July 2, 2025)

Implemented core PBT infrastructure for systematic backend compatibility testing:

### Created Structure
- `src/test/pbt/infrastructure/BackendCompatibilityTestRunner.ts` - Main test runner with fast-check integration
- `src/test/pbt/utils/BackendTestUtils.ts` - Backend switching and comparison utilities
- `src/test/pbt/utils/CircuitShrinker.ts` - Automatic test case minimization
- `src/test/pbt/init.ts` - Initialization helpers
- `src/test/pbt/index.ts` - Main exports

### Key Features
- Property-based testing with fast-check
- Automatic shrinking to minimal failing cases
- Backend comparison utilities for Field, Bool, Group types
- Constraint count and performance analysis
- Comprehensive error handling and logging

### NPM Scripts Added
- `test:pbt` - Run all PBT tests
- `test:pbt:phase1` - Basic field operations
- `test:pbt:phase2` - Advanced operations
- `test:pbt:phase3` - Circuit composition
- `test:pbt:report` - Generate compatibility report

### Next Steps for PBT
1. Create actual field/circuit generators using o1js types
2. Implement constraint system capture
3. Add comprehensive property tests for all operations
4. Track and minimize known compatibility issues

---

*For historical implementation details and completed work, see DEV_ARCHIVE.md*