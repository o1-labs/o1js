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
```bash
# Run all unit tests
npm run test
npm run test:unit

# Run specific test file
./jest path/to/test.ts

# Run integration tests
npm run test:integration

# Run Sparky backend integration tests (NEW)
npm run test:sparky
npm run test:sparky:report  # Generate comprehensive test report

# Run end-to-end browser tests
npm run test:e2e

# Run all tests
npm run test:all
```

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

### Backend Feature Status
- ✅ Basic field operations work with both backends
- ✅ Poseidon hash produces identical results
- ✅ EC operations (ecScale, ecEndoscale) implemented in Sparky
- ✅ Range check operations available
- ✅ Lookup tables fully implemented in Sparky
- ✅ Foreign field operations fully implemented in Sparky (June 30, 2025)
- ✅ Comprehensive integration test suite validates feature parity (June 30, 2025)
- ✅ Performance within 1.5x of Snarky for most operations
- ❌ Proof generation has module resolution errors with Sparky
- ❌ XOR and rotate gates pending completion

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
- Sparky achieves 90% API compatibility with performance within 1.5x of Snarky
- ALWAYS update SPARKY_CALLGRAPH_TEXT.md with your changes
- ALWAYS read SPARKY_CALLGRAPH_TEXT.md before starting any project
- ALWAYS record your progress as you go in DEV.md