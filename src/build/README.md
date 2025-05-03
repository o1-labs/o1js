# o1js Build Scripts

This directory contains scripts for building and managing the o1js TypeScript
framework.

## Available Scripts

### Core Build Scripts

| Script | Description |
|--------|-------------|
| `build-node.sh` | Builds the CommonJS version of o1js for Node.js |
| `build-web.sh` | Builds the web version of o1js for browsers |
| `build-example.sh` | Compiles TypeScript examples to JavaScript using esbuild |

### Utility Scripts

| Script | Description |
|--------|-------------|
| `copy-artifacts.sh` | Copies compiled JSOO/WASM artifacts between directories |
| `copy-to-dist.sh` | Copies files from /src to /dist/node that TypeScript doesn't copy |
| `e2e-tests-build-helper.sh` | Prepares files for E2E tests by replacing import paths |
| `fix-wasm-bindings-node.sh` | Fixes WASM bindings for Node.js |
| `run.sh` | Runs a TypeScript file using o1js |

## Usage Examples

### Building for Node.js

```bash
# Basic build
./build-node.sh

# Production build
./build-node.sh --production
```

### Building for Web

```bash
# Basic build
./build-web.sh

# Production build (minified)
./build-web.sh --production
```

### Building Examples

```bash
# Build a simple example
./build-example.sh src/examples/hello-world.ts

# Build for web and keep the output
./build-example.sh --web --keep src/examples/browser-example.ts

# Build and place in the correct dist directory structure
./build-example.sh --build-one src/examples/single-file.ts
```

### Running Examples

```bash
# Run a simple example
./run.sh src/examples/hello-world.ts

# Run with bundling and execute the main function
./run.sh --bundle --main src/examples/test.ts
```

## Build Process Overview

The build process typically follows these steps:

1. **Compile TypeScript**: Transforms TypeScript source files to JavaScript
2. **Process Bindings**: Processes WASM/native bindings for the target platform
3. **Bundle**: Uses esbuild to bundle dependencies
4. **Copy Assets**: Copies necessary files to the distribution directory
5. **Optimize**: Minifies JavaScript in production mode

## JavaScript Counterparts

These Bash scripts are equivalents to the original JavaScript build scripts. See
the corresponding `.js` files in this directory for the original implementations.

## Environment Variables

- `NODE_ENV=production`: Sets production mode for builds (same as using
  `--production`)
