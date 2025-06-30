#!/bin/bash

# Run My Benchmarks - Updated Cache.None Benchmarks
# This script runs all the benchmarks that were updated with Cache.None for accurate Sparky/Snarky comparison

set -e  # Exit on any error

echo "🚀 Running Updated Cache.None Benchmarks"
echo "========================================"
echo "These benchmarks were updated to use Cache.None + forceRecompile for accurate performance measurement"
echo ""

# Function to run a benchmark and capture results
run_benchmark() {
    local name="$1"
    local script="$2"
    local log_file="benchmark-results-$(basename "$script" .cjs).log"
    
    echo "📊 Running $name..."
    echo "   Script: $script"
    echo "   Log: $log_file"
    echo "   Started at: $(date)"
    echo ""
    
    # Run the benchmark and save output
    if node "$script" > "$log_file" 2>&1; then
        echo "✅ $name completed successfully"
        echo "   Duration: $(date)"
        echo "   Results saved to: $log_file"
    else
        echo "❌ $name failed"
        echo "   Check log file: $log_file"
        echo "   Last 10 lines of output:"
        tail -10 "$log_file" | sed 's/^/      /'
    fi
    echo ""
    echo "─────────────────────────────────────────"
    echo ""
}

# Change to benchmark directory
cd "$(dirname "$0")"

echo "📁 Working directory: $(pwd)"
echo "🕐 Started at: $(date)"
echo ""

# 1. Backend Compilation Comparison (already working well)
run_benchmark "Backend Compilation Comparison" \
    "benchmark/suites/microbenchmarks/backend-compilation-comparison.cjs"

# 2. Variable vs Constant Comparison (our investigation benchmark)
run_benchmark "Variable vs Constant Comparison" \
    "benchmark/suites/microbenchmarks/variable-vs-constant-comparison.cjs"

# 3. Hash Chain Native (updated with Cache.None)
run_benchmark "Hash Chain Native" \
    "benchmark/suites/microbenchmarks/hashchain-native.cjs"

# 4. Compilation Complexity (updated with Cache.None)
run_benchmark "Compilation Complexity" \
    "benchmark/suites/microbenchmarks/compilation-complexity.cjs"

# 5. Compilation Streamlined (updated with Cache.None)  
run_benchmark "Compilation Streamlined" \
    "benchmark/suites/microbenchmarks/compilation-streamlined.cjs"

# 6. Compilation No Cache (updated with Cache.None)
run_benchmark "Compilation No Cache" \
    "benchmark/suites/microbenchmarks/compilation-no-cache.cjs"

# 7. Merkle Proof Simple (updated with Cache.None)
run_benchmark "Merkle Proof Simple" \
    "benchmark/suites/holistic/merkle-proof-simple.cjs"

# 8. Merkle Proof Complex (updated with Cache.None)
run_benchmark "Merkle Proof Complex" \
    "benchmark/suites/holistic/merkle-proof-complex.cjs"

echo "🏁 All benchmarks completed!"
echo "🕐 Finished at: $(date)"
echo ""
echo "📊 Results Summary:"
echo "   All log files are saved with prefix: benchmark-results-*"
echo ""
echo "📋 Log files created:"
ls -1 benchmark-results-*.log 2>/dev/null | sed 's/^/   • /' || echo "   No log files found"
echo ""
echo "🔍 To view results:"
echo "   cat benchmark-results-backend-compilation-comparison.log"
echo "   cat benchmark-results-variable-vs-constant-comparison.log"
echo "   # etc..."
echo ""
echo "✅ Benchmark suite execution complete!"