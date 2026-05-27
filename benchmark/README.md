# o1js Backend Performance Benchmarking Suite

This comprehensive benchmarking suite is designed to compare the performance of different o1js backends, specifically snarky (OCaml) vs sparky (Rust). The suite provides both granular microbenchmarks and holistic real-world scenario tests.

## Quick Start

### Basic Usage

```bash
# Run fast benchmark suite (recommended for development)
./benchmark/scripts/run-backend-comparison.sh --config fast

# Run full comprehensive suite
./benchmark/scripts/run-backend-comparison.sh --config full

# Run with parallel execution (faster)
./benchmark/scripts/run-backend-comparison.sh --config fast --parallel

# CI/automated testing
./benchmark/scripts/run-backend-comparison.sh --ci --config fast
```

### Configuration Options

- **fast**: Essential benchmarks, ~30 minutes
- **full**: Complete benchmark suite, ~3 hours  
- **memory-only**: Memory and resource usage tests only

## Architecture Overview

### Directory Structure

```
benchmark/
├── suites/
│   ├── microbenchmarks/     # Core operation benchmarks
│   │   ├── field-operations.ts
│   │   ├── hash-functions.ts
│   │   ├── circuit-compilation.ts
│   │   └── proof-generation.ts
│   ├── holistic/           # Real-world scenario benchmarks
│   │   ├── simple-contract.ts
│   │   ├── token-contract.ts
│   │   ├── merkle-tree-ops.ts
│   │   └── recursive-proofs.ts
│   └── memory/             # Resource usage benchmarks
│       ├── memory-usage.ts
│       ├── memory-leaks.ts
│       └── concurrent-proving.ts
├── utils/
│   └── comparison/         # Analysis and comparison tools
│       ├── backend-benchmark.ts
│       └── analysis-tools.ts
├── runners/
│   └── comprehensive-runner.ts  # Main test orchestrator
└── scripts/
    └── run-backend-comparison.sh  # CI integration script
```

### Benchmark Categories

#### 1. Microbenchmarks
Tests fundamental operations where backend differences should be most apparent:

- **Field Operations**: Basic arithmetic (add, mul, inv)
- **Hash Functions**: Poseidon and Keccak performance
- **Circuit Compilation**: ZkProgram compilation time
- **Proof Generation**: Core proving system performance

#### 2. Holistic Benchmarks
Real-world zkApp scenarios that test end-to-end performance:

- **Simple Contracts**: Basic state management and method calls
- **Token Contracts**: Complex token operations and transfers
- **Merkle Tree Operations**: Tree updates and membership proofs
- **Recursive Proofs**: Advanced recursive verification

#### 3. Memory Benchmarks
Resource usage and memory management tests:

- **Memory Usage**: Peak memory consumption patterns
- **Memory Leaks**: Long-running process stability
- **Concurrent Proving**: Multi-worker performance and scaling

## Usage Examples

### Running Specific Test Suites

```bash
# Run only microbenchmarks
./benchmark/scripts/run-backend-comparison.sh --config fast --suites "Field Operations,Hash Functions"

# Run memory benchmarks only
./benchmark/scripts/run-backend-comparison.sh --config memory-only

# Run with custom output directory
./benchmark/scripts/run-backend-comparison.sh --output ./my-results
```

### Programmatic Usage

```typescript
import { runAllBenchmarks, runSelectedSuites } from './benchmark/runners/comprehensive-runner.js';

// Run all benchmarks
await runAllBenchmarks({
  outputPath: './results',
  skipLongRunning: true,
  parallel: true
});

// Run specific suites
await runSelectedSuites(['Field Operations', 'Hash Functions'], {
  verboseOutput: true,
  exportResults: true
});
```

### Backend Configuration

When sparky becomes available, configure backend switching:

```bash
# Specify backend binding paths
./benchmark/scripts/run-backend-comparison.sh \
  --snarky-path ./bindings/snarky \
  --sparky-path ./bindings/sparky
```

## Output and Analysis

### Generated Reports

The benchmarking suite generates multiple output formats:

1. **JSON Report** (`analysis-report-*.json`): Complete structured data
2. **CSV Matrix** (`performance-matrix-*.csv`): Spreadsheet-friendly results
3. **Markdown Summary** (`benchmark-summary-*.md`): Human-readable report

### Sample Output

```
=== o1js Backend Performance Comparison ===

Overall Performance Gain: Sparky vs Snarky
├── Proof Generation: +42.3% faster
├── Memory Usage: -18.7% reduction  
├── Compilation: +15.2% faster
└── Verification: ~0% (expected same)

Detailed Breakdown:
┌─────────────────┬──────────┬──────────┬──────────┐
│ Scenario        │ Snarky   │ Sparky   │ Speedup  │
├─────────────────┼──────────┼──────────┼──────────┤
│ Field Addition  │ 1.2ms    │ 0.8ms    │ +33%     │
│ Poseidon Hash   │ 15.4ms   │ 9.1ms    │ +69%     │
│ Token Transfer  │ 2.1s     │ 1.3s     │ +62%     │
└─────────────────┴──────────┴──────────┴──────────┘
```

### Key Metrics

- **Speedup Percentage**: Performance improvement (positive = faster)
- **Memory Reduction**: Memory usage difference (positive = less memory)
- **Statistical Significance**: ✓ for p < 0.05, ~ for inconclusive
- **Constraint Count**: Circuit complexity measure

## CI/CD Integration

### GitHub Actions Integration

```yaml
- name: Run Backend Benchmarks
  run: |
    ./benchmark/scripts/run-backend-comparison.sh --ci --config fast
    
- name: Upload Benchmark Results
  uses: actions/upload-artifact@v3
  with:
    name: benchmark-results
    path: benchmark-results/
```

### Performance Regression Detection

The suite automatically detects:
- Performance regressions > 5%
- Memory usage increases > 20% 
- Statistical significance of changes
- Consistency of results across runs

## Advanced Usage

### Custom Benchmark Development

Create new benchmarks by extending the framework:

```typescript
import { backendBenchmark, BackendConfig } from '../utils/comparison/backend-benchmark.js';

const myBenchmark = backendBenchmark(
  'My Custom Benchmark',
  async (tic, toc, memTracker) => {
    tic('compilation');
    // ... your test setup
    toc('compilation');
    
    tic('proving');
    // ... your test execution
    toc('proving');
    
    return { constraints: 42 };
  },
  [
    { name: 'snarky', warmupRuns: 3, measurementRuns: 10 },
    { name: 'sparky', warmupRuns: 3, measurementRuns: 10 }
  ]
);
```

### Memory Profiling

Enable detailed memory tracking:

```bash
# Run with garbage collection exposed
node --expose-gc benchmark/runners/comprehensive-runner.js --config memory-only

# Monitor with external tools
valgrind node benchmark/runners/comprehensive-runner.js
```

### Comparative Analysis

Compare results across different commits or configurations:

```bash
# Save baseline results
./benchmark/scripts/run-backend-comparison.sh --output ./baseline

# Compare with previous run
./benchmark/scripts/run-backend-comparison.sh \
  --compare-with ./baseline/analysis-report-*.json
```

## Contributing

### Adding New Benchmarks

1. Create benchmark files in the appropriate suite directory
2. Follow the established patterns for timing and memory tracking
3. Add statistical analysis for results
4. Update the comprehensive runner to include new benchmarks
5. Test with both fast and full configurations

### Performance Guidelines

- **Microbenchmarks**: Focus on specific operations, < 1 minute each
- **Holistic benchmarks**: Test realistic scenarios, < 10 minutes each  
- **Memory benchmarks**: Track resource usage, handle cleanup
- **Statistical rigor**: Use multiple runs, report confidence intervals

## Troubleshooting

### Common Issues

1. **Out of Memory**: Reduce benchmark scope or increase Node.js memory limit
2. **Timeout Errors**: Increase timeout values or skip long-running tests
3. **Backend Not Found**: Verify binding paths and environment variables
4. **Inconsistent Results**: Check for system load, use more warmup runs

### Debug Mode

```bash
# Enable verbose output
./benchmark/scripts/run-backend-comparison.sh --config fast --verbose

# Run single benchmark for debugging
node benchmark/suites/microbenchmarks/field-operations.js
```

## Performance Expectations

Based on preliminary analysis, sparky is expected to show:

- **25-50% improvement** in core proof generation
- **15-30% improvement** in circuit compilation  
- **10-25% reduction** in memory usage
- **Similar performance** in verification (same algorithms)

Actual results will vary based on:
- Circuit complexity
- Hardware configuration
- Workload characteristics
- Memory pressure