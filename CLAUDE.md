# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Development Commands

### Building
```bash
# Standard build (downloads pre-compiled bindings if available)
npm install
npm run build

# Build for web
npm run build:web

# Build examples
npm run build:examples

# Build Sparky
npm run build:sparky && npm run build

# Rebuild OCaml/Rust bindings from source (requires OCaml/Rust toolchain)
npm run build:update-bindings

# Download pre-compiled bindings for current commit
npm run build:bindings-download
```

### Testing

The testing strategy separates **correctness** from **parity** testing for faster debugging:

**Philosophy**: 
- ✅ **Correctness**: Test mathematical properties in pure Rust (fast, isolated debugging)
- ✅ **Parity**: Test backend comparison through o1js (integration verification)
- ❌ **Avoid**: Testing correctness through o1js (slow, complex debugging)
- ⏱️ **ALWAYS run tests with a 6 minute timeout**: Some tests take a while to complete

#### Rust Correctness Tests (Pure mathematical verification)
```bash
# Run field arithmetic correctness tests
cargo test --test field_ops --features testing

# Run comprehensive property-based tests (1000+ test cases per property)
cargo test --test properties --features testing

# Run all Rust correctness tests
cargo test --features testing

# Run performance benchmarks
cargo bench --bench field_operations_bench
```

#### o1js Parity Tests (Backend comparison)
```bash
# Run focused VK parity tests 
npm run test:parity

# Run backend comparison tests
npm run test src/test/parity/backend-comparison.test.ts

# Run VK generation parity tests
npm run test src/test/parity/vk-parity.test.ts

# Quick parity check with consolidated runner
node src/test/parity/run-parity-tests.mjs
```

#### Integration Tests (WASM/o1js bridge)
```bash
# Run all unit tests
npm run test
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end browser tests
npm run test:e2e

# Run all tests
npm run test:all
```

#### Legacy Test Commands (Being phased out)
```bash
# Legacy scattered tests (avoid using these)
npm run test:vk-parity              # Use npm run test:parity instead
npm run test:backend-infrastructure # Use focused parity tests instead  
npm run test:constraint-analysis    # Use Rust correctness tests instead
```

### Testing Strategy Benefits

**🚀 Performance**: Rust correctness tests run in seconds vs minutes for o1js integration tests  
**🔍 Debugging**: Immediate isolation of issues - mathematical correctness vs backend compatibility vs integration  
**📊 Coverage**: Property-based testing with 1000+ cases per mathematical property  
**🎯 Focus**: Each test category has clear purpose and actionable failure messages  
**⚡ Development Speed**: No more waiting for complex test suites to debug simple mathematical errors

### Linting and Formatting
```bash
# Check formatting
npm run format:check path/to/file

# Auto-fix formatting
npm run format path/to/file

# Lint code
npm run lint path/to/file

# Auto-fix linting issues
npm run lint:fix path/to/file
```

### Single Test Execution
```bash
# Run a single example or test file
./run path/to/file.ts --bundle
```

## High-Level Architecture

o1js is a TypeScript framework for writing zero-knowledge proofs and zkApps on Mina. The codebase consists of several layers:

### 1. TypeScript API Layer (`src/lib/`)
This provides the developer-facing API:

- **`provable/`** - Core types (Field, Bool, Group) and cryptographic primitives
  - Circuit-compatible data types and operations
  - Cryptographic functions: Poseidon, SHA256, Keccak, Blake2b
  - Data structures: Merkle trees, dynamic arrays
  - Foreign field/curve arithmetic for cross-chain compatibility

- **`proof-system/`** - Zero-knowledge proof generation
  - `zkprogram.ts` - Main API for creating ZK programs from TypeScript functions
  - `circuit.ts` - Compiles TypeScript to arithmetic circuits
  - `proof.ts` - Proof generation and verification
  - `cache.ts` - Caches compiled circuits and verification keys
  - `workers.ts` - Parallel proof generation using worker threads

- **`mina/`** - Mina blockchain integration
  - `v1/` - Current stable API
    - `zkapp.ts` - Smart contract framework with decorators
    - `transaction.ts` - Transaction construction and submission
    - `account-update.ts` - Account state updates
    - `actions/` - Reducer pattern for offchain state
  - `v2/` - Experimental next-generation API

### 2. Bindings Layer (`src/bindings/`)
This layer bridges TypeScript with the underlying OCaml/Rust implementation:

- **`compiled/`** - Pre-compiled artifacts
  - `_node_bindings/` - Node.js specific compiled code
  - `web_bindings/` - Browser-specific compiled code

- **`ocaml/`** - OCaml source that wraps the Mina protocol
  - Exposes Snarky (constraint system) and Pickles (recursive proofs)
  - Provides local blockchain simulation

- **`crypto/`** - Pure TypeScript implementations (for mina-signer)

The bindings are compiled from OCaml to JavaScript using js_of_ocaml, and from Rust to WebAssembly using wasm-pack.

### 3. Mina Protocol Layer (`src/mina/`)
This is a git submodule containing the Mina protocol implementation, including:
- Kimchi proof system (Rust)
- Protocol validation rules (OCaml)
- Cryptographic primitives

### Key Concepts

1. **Provable Code**: TypeScript functions decorated with `@method` or used in `ZkProgram` are compiled to arithmetic circuits.

2. **Account Updates**: Changes to on-chain state are batched into account updates within transactions.

3. **Recursive Proofs**: Proofs can verify other proofs, enabling scalable applications.

4. **Foreign Fields/Curves**: Support for non-native field arithmetic enables cross-chain applications.

5. **Local Testing**: A local blockchain simulator allows testing without deploying to a real network.

### Development Tips

- The bindings layer is pre-compiled and committed to the repo. Only rebuild if modifying OCaml/Rust code.
- Use `./run <file> --bundle` for quick iteration on examples
- Most development happens in the TypeScript layer without touching bindings
- Test files use `.test.ts` suffix and are run with Jest
- Examples are in `src/examples/` with various zkApp patterns

## Backend Switching (Added June 2025)

o1js now supports runtime switching between OCaml Snarky and Rust Sparky backends:

```javascript
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Check current backend
console.log(getCurrentBackend()); // 'snarky' (default)

// Switch to Sparky backend
await switchBackend('sparky');

// Switch back to Snarky
await switchBackend('snarky');
```

### Backend Feature Status & Testing Results

#### Mathematical Correctness (Rust Tests)
- ✅ **Field Arithmetic**: 100% pass rate - all operations mathematically correct
- ✅ **Property Verification**: 14/14 properties verified with 1000+ test cases each
- ✅ **Performance**: Field operations at 2-3ns, within target performance range
- ✅ **Pallas Field**: Full compatibility with Mina protocol field
- 🎯 **ALWAYS prefer the Pallas Field for testing**: Use Pallas field parameters for all mathematical correctness tests

#### Backend Parity (o1js Integration)  
- ✅ Basic field operations work with both backends
- ✅ Poseidon hash produces identical results
- ✅ EC operations (ecScale, ecEndoscale) implemented in Sparky
- ✅ Range check operations available
- ✅ Lookup tables fully implemented in Sparky
- ✅ Foreign field operations fully implemented in Sparky
- ⚠️ **VK Parity**: 14.3% success rate (1/7 operations) - needs improvement
- ✅ **Testing Infrastructure**: New focused test suite replaces scattered legacy tests
- ❌ Proof generation has API compatibility issues

#### Infrastructure Status
- ✅ **Clean Test Architecture**: Correctness vs parity vs integration separation
- ✅ **Fast Development Cycle**: Mathematical issues debugged in seconds, not minutes
- ✅ **Performance Tracking**: Benchmarks prevent regressions
- ✅ **Legacy Cleanup**: 20+ redundant test files consolidated into maintainable suite

## Technical Documentation

For detailed technical documentation including:
- Backend switching implementation
- Sparky integration details
- Security issues and fixes
- EC operations status
- Performance benchmarks
- Build system information
- Math.random() security analysis

See **[DEV.md](./DEV.md)** and **[CRYPTO_MATH.md](./CRYPTO_MATH.md)**

## Development Memories

- You must run all examples for o1js2 from the project root so it can find the compiled bindings
- Sparky integration adds 1.2GB to the repository (mostly build artifacts in src/sparky/target/)
- The sparky-adapter.js file (1,150 lines) handles compatibility between backends
- All technical documentation has been consolidated into DEV.md (June 29, 2025)
- There is a build:all that rebuilds everything, including sparky
- Math.random() security audit completed (June 30, 2025) - no cryptographic uses found
- Foreign field operations fully implemented in Sparky (June 30, 2025)
- Comprehensive integration test suite created in src/test/integration/ (June 30, 2025)
- 🚨 **REALITY CHECK** (July 3, 2025): Sparky achieves ~15% VK parity, not 90% as previously documented
- ALWAYS update SPARKY_CALLGRAPH_TEXT.md with your changes
- ALWAYS read SPARKY_CALLGRAPH_TEXT.md before starting any project
- ALWAYS record your progress as you go in DEV.md
- NEVER change the structure of sparky-adapter.js UNLESS explicitly told to do so.  It is meant to exactly match the exports of Snarky
- 🚨 **DOCUMENTATION AUDIT** (July 3, 2025): Previous claims of "breakthrough" were aspirational, not factual
- ⚠️ **Partial Implementation**: Dynamic coefficient generation works but critical optimizations missing

## Critical Updates (July 2025)

- 🚨 **DOCUMENTATION AUDIT COMPLETE** (July 3, 2025): Previous claims corrected after implementation review
- ✅ **Algorithmic Compatibility**: Basic framework exists but optimizations incomplete
- ⚠️ **Dynamic Coefficient Generation**: Works for Equal constraints only
- 🚨 **Test Status** (July 3, 2025) - **ACTUAL RESULTS**:
  - **Field Operations**: 100% success rate ✅ (ALL basic operations work perfectly)
  - **Cryptographic Functions**: 100% success rate ✅ (Poseidon hash consistent)  
  - **Backend Infrastructure**: 100% success rate ✅ (Switching works reliably)
  - **VK Parity**: 14.3% success rate 🚨 (1/7 tests passing - MAJOR GAP from claims)
  - **Core Algorithms**: Constraint batching exists but not activated, Union-Find missing
- ⚠️ **Limited Production Readiness**: Works for simple operations, breaks for complex circuits
- 🚨 **NEVER edit `dist/` files**: Always modify source files in `src/bindings/` - they compile to `dist/`
- ⚠️ **Field precision**: NEVER convert BigInts to JavaScript numbers - loses precision

## Revolutionary Testing Strategy Implementation (July 2025)

- 🚀 **BREAKTHROUGH**: Implemented correctness vs parity testing separation
- 🧹 **Major Cleanup**: Replaced 20+ scattered test files with focused architecture
- ✅ **Rust Correctness Tests**: Mathematical verification in pure Rust
  - `sparky-core/tests/field_ops.rs`: Field arithmetic correctness verification  
  - `sparky-core/tests/properties.rs`: 14 comprehensive property-based tests (1000+ cases each)
  - `sparky-core/benches/field_operations_bench.rs`: Performance benchmarks (2-3ns field ops)
- ✅ **o1js Parity Tests**: Focused backend comparison in `src/test/parity/`
  - `backend-comparison.test.ts`: Systematic Snarky vs Sparky verification
  - `vk-parity.test.ts`: VK generation comparison for circuit patterns
  - `ParityTestRunner`: Clean architecture for automated backend testing
- 🎯 **Development Impact**: Fast mathematical debugging (seconds vs minutes)
- 📊 **Current Results**:
  - **Mathematical Correctness**: 100% verified in Rust (6 basic + 14 property tests)
  - **VK Parity**: 14.3% success rate (1/7 operations) - integration issue isolated
  - **Performance**: Field operations within 2-3ns target range
- 🧪 **Testing Philosophy**: Separate concerns for faster debugging and clearer failure isolation