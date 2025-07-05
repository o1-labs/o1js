# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Project status and development progress tracking is maintained in DEV.md.

## Development Guidelines

- When creating .md files, include creation and last modified timestamps
  - Created: July 4, 2025
  - Last Modified: July 5, 2025 12:05 AM UTC

- Use business-like tone in commit messages. No emoji or emotional language
- Use technical tone in documentation with minimal emoji
- Provide times in UTC
- Use checkmarks ✅ and X ❌ for pass/fail status only
- ONLY add dates to .md files, NOT .rs or .ts (etc) source files!

## Communication Guidelines

- Be direct and factual rather than enthusiastic or accommodating
- Avoid excessive praise for routine requests
- Do not over-apologize or hedge unnecessarily
- Focus on substance over politeness markers
- Answer questions concisely without preamble
- State facts and recommendations plainly

## Building

```bash
# Build the project
npm run build

# Build with specific backend
npm run build:snarky    # Build with Snarky backend
npm run build:sparky    # Build with Sparky backend

# Build WASM bindings
npm run build:wasm
```

- Use `npm run build:sparky` to build the sparky wasm
- Run `npm run build` after updating the wasm to see effects

## Testing

### Test Infrastructure

The repository includes parallel testing infrastructure for backend-isolated testing of Snarky and Sparky implementations:

- 4.6x performance improvement through parallel execution
- Backend isolation preventing cross-contamination
- Progress monitoring and memory management
- Automatic test discovery and categorization

### Running Tests

```bash
# Run comprehensive test suite (smoke + core + comprehensive)
npm run test:sparky-comprehensive

# Run specific test tiers
npm run test:sparky-smoke         # Quick health check (~30s)
npm run test:sparky-core          # VK parity focused (~2min)
npm run test:sparky-comprehensive # All tests including circuit compilation (~10min)

# CI-optimized comprehensive tests (2 processes)
npm run test:sparky-ci

# Development testing with verbose output
npm run test:sparky-dev

# Debug mode (sequential execution)
npm run test:sparky-debug

# Run with custom configuration
SPARKY_TEST_PROCESSES=8 npm run test:sparky-comprehensive    # Use 8 parallel processes
SPARKY_TEST_MODE=sequential npm run test:sparky-comprehensive # Debug mode
SPARKY_TEST_VERBOSE=true npm run test:sparky-comprehensive   # Verbose output
```

### Test Structure

Tests are organized in `src/test/sparky/suites/`:
- `snarky-only/` - Tests that run only with snarky backend
- `sparky-only/` - Tests that run only with sparky backend  
- `integration/` - Tests that compare results between backends
- `comprehensive/` - Circuit compilation tests that verify real SmartContract and ZkProgram compilation between backends

### Test Architecture

The system uses a main orchestrator that spawns isolated worker processes:
- Each worker is locked to a single backend (no switching within a worker)
- Workers communicate results via IPC
- Memory limits enforced per process (default 600MB)
- Automatic cleanup on failure or timeout

### Adding New Tests

Create test suites following the pattern in existing suite files:
```typescript
export const tests: TestCase[] = [
  {
    name: 'test-name',
    testFn: async () => {
      const o1js = (global as any).o1js;
      // Test implementation
    },
    timeout: 5000
  }
];
```

### Circuit Compilation Tests

The comprehensive tier includes circuit compilation tests that compare SmartContract and ZkProgram compilation between Snarky and Sparky backends:

- SmartContract compilation tests state management, method compilation, and constraint generation
- ZkProgram compilation tests proof systems, public input/output handling, and method verification  
- Cross-backend verification compares verification keys, method counts, and compilation success
- Performance metrics track compilation times and memory usage

Create compilation tests in `src/test/sparky/suites/comprehensive/`:
```typescript
export interface CompilationTestCase {
  name: string;
  type: 'compilation';
  testFn: (backend?: string) => Promise<any>;
  timeout?: number;
}

export const tests: CompilationTestCase[] = [
  {
    name: 'smartcontract-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const o1js = (global as any).o1js;
      const { SmartContract, State, state, Field, method } = o1js;
      
      class TestContract extends SmartContract {
        @state(Field) value = State();
        
        @method update(newValue: any) {
          const current = this.value.getAndRequireEquals();
          newValue.assertGreaterThan(current);
          this.value.set(newValue);
        }
      }
      
      const compilationResult = await TestContract.compile();
      
      return {
        backend,
        verificationKeyExists: !!compilationResult.verificationKey,
        verificationKeyHash: compilationResult.verificationKey?.hash || 'missing',
        methodCount: Object.keys(compilationResult.provers || {}).length,
        success: true
      };
    },
    timeout: 120000
  }
];
```

## Running

```bash
# Run examples
npm run examples

# Run specific example
npm run example:simple-zkapp
npm run example:backend-switching

# Run with specific backend
BACKEND=sparky npm run example:simple-zkapp
BACKEND=snarky npm run example:simple-zkapp
```

## Known Issues

Integration tests show differences between snarky and sparky:
- Field arithmetic operations produce different results
- Provable.witness behavior differs between backends
- Implementation differences require investigation

## Backend Switching

Runtime backend switching between Snarky and Sparky:

```typescript
// Switch to Sparky backend
await switchBackend('sparky');

// Switch to Snarky backend  
await switchBackend('snarky');

// Check current backend
const currentBackend = getCurrentBackend();
```

Backend switching uses process isolation to prevent cross-contamination.