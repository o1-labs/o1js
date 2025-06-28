# Sparky Integration Guide

This document describes how Sparky (Rust-based Snarky implementation) is integrated into o1js as a git submodule.

## Overview

Sparky is a Rust port of the OCaml-based Snarky library, providing the same zkSNARK functionality with improved performance and WASM compatibility. It's added as a git submodule to o1js to enable gradual migration and testing.

## Setup

### Initial Setup (Already Done)

The Sparky submodule has been added to o1js at `src/sparky`:

```bash
git submodule add git@github.com:o1-labs/sparky.git src/sparky
```

### Cloning with Submodules

When cloning o1js, initialize submodules:

```bash
git clone git@github.com:o1-labs/o1js.git
cd o1js
git submodule update --init --recursive
```

### Building Sparky WASM

Build the Sparky WASM bindings:

```bash
npm run build:sparky
```

This will:
1. Build Sparky WASM for both web and Node.js targets
2. Copy artifacts to `src/bindings/compiled/sparky_web` and `src/bindings/compiled/sparky_node`
3. Update the SPARKY_COMMIT file

## Usage

### TypeScript Integration

Import Sparky functionality from the bindings:

```typescript
import { initSparky, createField, poseidonHash } from './bindings/sparky/index.js';

// Initialize Sparky
await initSparky();

// Create field elements
const a = await createField(100);
const b = await createField(200);

// Compute Poseidon hash
const hash = await poseidonHash(a, b);
```

### Running the Demo

```bash
npm run build
node dist/examples/sparky-demo.js
```

## Architecture

### Directory Structure

```
o1js/
├── src/
│   ├── sparky/                    # Sparky submodule
│   │   ├── sparky-core/          # Core Rust implementation
│   │   ├── sparky-wasm/          # WASM bindings
│   │   └── ...
│   ├── bindings/
│   │   ├── sparky/               # TypeScript integration
│   │   │   └── index.ts
│   │   ├── compiled/
│   │   │   ├── sparky_web/       # Web WASM artifacts
│   │   │   └── sparky_node/      # Node.js WASM artifacts
│   │   └── scripts/
│   │       └── build-sparky-wasm.sh
│   └── examples/
│       └── sparky-demo.ts
```

### Build Scripts

- `npm run build:sparky` - Build Sparky WASM bindings
- `npm run build` - Standard o1js build (includes Sparky if available)

## Development Workflow

### Updating Sparky

To update the Sparky submodule to the latest version:

```bash
cd src/sparky
git checkout main
git pull origin main
cd ../..
git add src/sparky
git commit -m "Update Sparky submodule"
```

### Making Changes to Sparky

1. Navigate to the submodule:
   ```bash
   cd src/sparky
   ```

2. Create a new branch:
   ```bash
   git checkout -b feature/my-feature
   ```

3. Make changes and commit:
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin feature/my-feature
   ```

4. Update the submodule reference in o1js:
   ```bash
   cd ../..
   git add src/sparky
   git commit -m "Update Sparky submodule to feature branch"
   ```

## Features Available

### Currently Implemented in Sparky

- ✅ Field arithmetic (Vesta field)
- ✅ Constraint system (R1CS)
- ✅ Checked monad
- ✅ Generic gates with polynomial constraints
- ✅ Poseidon hash function
- ✅ Elliptic curve operations (Vesta curve)
- ✅ WASM bindings with JavaScript API
- ✅ Witness generation and constraint evaluation

### Integration Status

- ✅ Submodule added to o1js
- ✅ Build scripts configured
- ✅ TypeScript bindings created
- ✅ Demo example implemented
- 🚧 Full o1js API compatibility (in progress)
- 🚧 Performance benchmarking vs OCaml backend
- 🚧 Migration guide for existing code

## Testing

Run Sparky tests within the submodule:

```bash
cd src/sparky
cargo test --workspace
```

Run WASM integration tests:

```bash
cd src/sparky/sparky-wasm
npm test
```

## Troubleshooting

### WASM Build Failures

If the WASM build fails, ensure you have:
- Rust toolchain installed (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- wasm-pack installed (`curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`)
- Node.js 18+ installed

### Submodule Issues

If the submodule is not initialized:
```bash
git submodule update --init --recursive
```

If the submodule is in a detached HEAD state:
```bash
cd src/sparky
git checkout main
git pull origin main
```

## Future Work

1. **API Parity**: Achieve full API compatibility with OCaml snarky
2. **Performance**: Benchmark and optimize critical paths
3. **Integration**: Gradual migration path for existing o1js code
4. **Documentation**: Comprehensive API documentation and migration guides
5. **Testing**: Integration test suite comparing OCaml and Rust implementations

## Resources

- [Sparky Repository](https://github.com/o1-labs/sparky)
- [Sparky Documentation](src/sparky/README.md)
- [o1js Documentation](https://docs.minaprotocol.com/zkapps/o1js)
- [Git Submodules Guide](https://git-scm.com/book/en/v2/Git-Tools-Submodules)