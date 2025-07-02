# o1js Development Documentation

**Last Updated**: July 2, 2025

Essential technical documentation for o1js development with Sparky backend integration.

## Current Status

**Architecture**: Clean and consolidated after removing 2,419+ lines of technical debt  
**Critical Blocker**: 0% VK parity - missing `reduce_lincom` optimization in Sparky  
**Performance**: Sparky constraint generation catastrophically broken (timeouts on 10k additions)

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
- **Constraint Optimization**: Missing `reduce_lincom` causes 500.5 constraints per addition (vs 1 in Snarky)
- **Proof Generation**: Module resolution errors when using Sparky backend
- **Performance**: Sparky times out on operations that take 47s in Snarky

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
1. **Broken Constraint-to-Wire Conversion**: Sparky truncates complex expressions
2. **Missing Optimization**: No linear combination reduction (`3x + 2x → 5x`)
3. **Wrong Coefficient Format**: Sparky generates `[1,1,1,1,1]` vs Snarky's `[1,0,0,0,-3]`

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

1. **Fix `reduce_lincom` optimization** - Critical for VK parity
2. **Fix constraint-to-wire conversion** - Fundamental design flaw
3. **Investigate identical VK hash issue** - All Sparky VKs produce same hash
4. **Resolve proof generation errors** - Module resolution issues

---

*For historical implementation details and completed work, see DEV_ARCHIVE.md*