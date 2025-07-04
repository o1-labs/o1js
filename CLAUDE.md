# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines

- **ALWAYS when I tell you to write a .md file include a date and time for when you created it and last modified it**
  - Created: July 4, 2025
  - Last Modified: July 4, 2025 7:49 AM UTC

## Sparky Parallel Test Infrastructure

### Overview
The o1js2 repository now includes a comprehensive parallel testing infrastructure for backend-isolated testing of Snarky and Sparky implementations. This infrastructure provides:
- **4.6x performance improvement** through parallel execution
- Backend isolation ensuring no cross-contamination
- Real-time progress monitoring and memory management
- Automatic test discovery and categorization

### Running Tests

```bash
# Run full test suite (smoke + core + comprehensive)
npm run test:sparky-full

# Run specific test tiers
npm run test:sparky-smoke      # Quick health check (~30s)
npm run test:sparky-core       # VK parity focused (~2min)
npm run test:sparky-full       # All tests (~10min sequential, ~2min parallel)

# Run with custom configuration
SPARKY_TEST_PROCESSES=8 npm run test:sparky-full    # Use 8 parallel processes
SPARKY_TEST_MODE=sequential npm run test:sparky-full # Debug mode
SPARKY_TEST_VERBOSE=true npm run test:sparky-full   # Verbose output
```

### Test Structure

Tests are organized in `src/test/sparky/suites/`:
- `snarky-only/` - Tests that run only with snarky backend
- `sparky-only/` - Tests that run only with sparky backend  
- `integration/` - Tests that compare results between backends

### Architecture

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

### Known Issues

Integration tests currently show differences between snarky and sparky:
- Field arithmetic operations produce different results
- Provable.witness behavior differs between backends
- These are real implementation differences that need investigation

(Existing content remains unchanged)