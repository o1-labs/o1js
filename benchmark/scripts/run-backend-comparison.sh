#!/bin/bash

# Backend comparison benchmark runner for CI/CD
# Integrates with existing o1js benchmark infrastructure

set -e

# Configuration
DEFAULT_OUTPUT_DIR="./benchmark-results"
DEFAULT_CONFIG="fast"
SNARKY_BINDINGS_PATH=""
SPARKY_BINDINGS_PATH=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Backend Comparison Benchmark Runner

OPTIONS:
    -h, --help              Show this help message
    -o, --output DIR        Output directory (default: $DEFAULT_OUTPUT_DIR)
    -c, --config CONFIG     Benchmark configuration: fast, full, memory-only (default: $DEFAULT_CONFIG)
    -s, --snarky-path PATH  Path to snarky bindings
    -p, --sparky-path PATH  Path to sparky bindings
    --parallel              Run benchmarks in parallel
    --export-only           Only export existing results, don't run benchmarks
    --ci                    CI mode: optimized for automated environments
    --compare-with FILE     Compare results with previous benchmark file

EXAMPLES:
    $0 --config fast --parallel
    $0 --config full --output ./results
    $0 --ci --snarky-path ./snarky --sparky-path ./sparky
    $0 --compare-with ./previous-results.json

EOF
}

# Parse command line arguments
OUTPUT_DIR="$DEFAULT_OUTPUT_DIR"
CONFIG="$DEFAULT_CONFIG"
PARALLEL=""
EXPORT_ONLY=false
CI_MODE=false
COMPARE_WITH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -c|--config)
            CONFIG="$2"
            shift 2
            ;;
        -s|--snarky-path)
            SNARKY_BINDINGS_PATH="$2"
            shift 2
            ;;
        -p|--sparky-path)
            SPARKY_BINDINGS_PATH="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL="--parallel"
            shift
            ;;
        --export-only)
            EXPORT_ONLY=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --compare-with)
            COMPARE_WITH="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate configuration
case $CONFIG in
    fast|full|memory-only)
        ;;
    *)
        print_error "Invalid configuration: $CONFIG"
        print_error "Valid configurations: fast, full, memory-only"
        exit 1
        ;;
esac

print_status "Starting o1js backend comparison benchmarks"
print_status "Configuration: $CONFIG"
print_status "Output directory: $OUTPUT_DIR"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# CI mode optimizations
if [ "$CI_MODE" = true ]; then
    print_status "Running in CI mode"
    
    # Set memory limits for CI environments
    export NODE_OPTIONS="--max-old-space-size=8192"
    
    # Disable interactive features
    export CI=true
    export NO_COLOR=true
    
    # Use fast configuration if not specified
    if [ "$CONFIG" = "$DEFAULT_CONFIG" ]; then
        CONFIG="fast"
    fi
fi

# Validate bindings paths
if [ -n "$SNARKY_BINDINGS_PATH" ] && [ ! -d "$SNARKY_BINDINGS_PATH" ]; then
    print_error "Snarky bindings path does not exist: $SNARKY_BINDINGS_PATH"
    exit 1
fi

if [ -n "$SPARKY_BINDINGS_PATH" ] && [ ! -d "$SPARKY_BINDINGS_PATH" ]; then
    print_error "Sparky bindings path does not exist: $SPARKY_BINDINGS_PATH"
    exit 1
fi

# Set up environment variables for bindings
if [ -n "$SNARKY_BINDINGS_PATH" ]; then
    export O1JS_SNARKY_BINDINGS_PATH="$SNARKY_BINDINGS_PATH"
    print_status "Using snarky bindings: $SNARKY_BINDINGS_PATH"
fi

if [ -n "$SPARKY_BINDINGS_PATH" ]; then
    export O1JS_SPARKY_BINDINGS_PATH="$SPARKY_BINDINGS_PATH"
    print_status "Using sparky bindings: $SPARKY_BINDINGS_PATH"
fi

# Check if we're only exporting existing results
if [ "$EXPORT_ONLY" = true ]; then
    print_status "Export-only mode: processing existing results"
    
    # Look for existing result files
    RESULT_FILES=$(find "$OUTPUT_DIR" -name "*.json" -type f | head -5)
    
    if [ -z "$RESULT_FILES" ]; then
        print_error "No result files found in $OUTPUT_DIR"
        exit 1
    fi
    
    print_status "Found result files, generating reports..."
    # This would call the analysis tools to regenerate reports
    node benchmark/utils/comparison/analysis-tools.js --export "$OUTPUT_DIR"
    exit 0
fi

# Determine which benchmark suites to run based on configuration
BENCHMARK_ARGS=""
case $CONFIG in
    fast)
        BENCHMARK_ARGS="--fast $PARALLEL"
        ;;
    full)
        BENCHMARK_ARGS="$PARALLEL"
        ;;
    memory-only)
        BENCHMARK_ARGS="--suites 'Memory Usage,Memory Leaks,Concurrent Proving' $PARALLEL"
        ;;
esac

# Add output directory to arguments
BENCHMARK_ARGS="$BENCHMARK_ARGS --output $OUTPUT_DIR"

# Run the comprehensive benchmark suite
print_status "Running benchmark suite with args: $BENCHMARK_ARGS"

# Check if Node.js and dependencies are available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

# Check if the benchmark runner exists
RUNNER_PATH="benchmark/runners/comprehensive-runner.js"
if [ ! -f "$RUNNER_PATH" ]; then
    print_error "Benchmark runner not found: $RUNNER_PATH"
    print_error "Make sure you're running this script from the o1js root directory"
    exit 1
fi

# Capture start time
START_TIME=$(date +%s)

# Run the benchmarks
print_status "Executing benchmarks..."
if node $RUNNER_PATH $BENCHMARK_ARGS; then
    print_success "Benchmarks completed successfully"
else
    EXIT_CODE=$?
    print_error "Benchmarks failed with exit code: $EXIT_CODE"
    
    # In CI mode, always exit with error code
    if [ "$CI_MODE" = true ]; then
        exit $EXIT_CODE
    fi
    
    # Otherwise, continue to try generating partial reports
    print_warning "Attempting to generate partial reports from available data..."
fi

# Calculate execution time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

print_status "Total execution time: ${DURATION_MIN}m ${DURATION_SEC}s"

# Generate summary report
LATEST_REPORT=$(find "$OUTPUT_DIR" -name "analysis-report-*.json" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

if [ -n "$LATEST_REPORT" ] && [ -f "$LATEST_REPORT" ]; then
    print_status "Latest analysis report: $LATEST_REPORT"
    
    # Extract key metrics from the report for CI summary
    if command -v jq &> /dev/null; then
        OVERALL_SPEEDUP=$(jq -r '.overallSummary.speedupMetrics.mean' "$LATEST_REPORT" 2>/dev/null || echo "N/A")
        SIGNIFICANT_IMPROVEMENTS=$(jq -r '.overallSummary.significanceAnalysis.significantImprovements' "$LATEST_REPORT" 2>/dev/null || echo "N/A")
        TOTAL_SCENARIOS=$(jq -r '.detailedComparisons | length' "$LATEST_REPORT" 2>/dev/null || echo "N/A")
        
        print_success "=== BENCHMARK SUMMARY ==="
        print_success "Overall Performance Improvement: ${OVERALL_SPEEDUP}%"
        print_success "Significant Improvements: ${SIGNIFICANT_IMPROVEMENTS}/${TOTAL_SCENARIOS} scenarios"
        print_success "=========================="
    fi
else
    print_warning "No analysis report found in $OUTPUT_DIR"
fi

# Compare with previous results if requested
if [ -n "$COMPARE_WITH" ]; then
    if [ -f "$COMPARE_WITH" ]; then
        print_status "Comparing with previous results: $COMPARE_WITH"
        # This would implement trend analysis
        node benchmark/utils/comparison/trend-analysis.js "$LATEST_REPORT" "$COMPARE_WITH"
    else
        print_warning "Previous results file not found: $COMPARE_WITH"
    fi
fi

# CI integration: Set GitHub Actions outputs if available
if [ "$CI_MODE" = true ] && [ -n "$GITHUB_OUTPUT" ]; then
    if [ -n "$OVERALL_SPEEDUP" ] && [ "$OVERALL_SPEEDUP" != "N/A" ]; then
        echo "benchmark_speedup=$OVERALL_SPEEDUP" >> "$GITHUB_OUTPUT"
        echo "benchmark_success=true" >> "$GITHUB_OUTPUT"
        echo "benchmark_report_path=$LATEST_REPORT" >> "$GITHUB_OUTPUT"
    else
        echo "benchmark_success=false" >> "$GITHUB_OUTPUT"
    fi
fi

# Cleanup: Remove any temporary files
find "$OUTPUT_DIR" -name "*.tmp" -type f -delete 2>/dev/null || true

print_success "Backend comparison benchmarks completed!"
print_status "Results available in: $OUTPUT_DIR"

# Exit with appropriate code
if [ -n "$LATEST_REPORT" ] && [ -f "$LATEST_REPORT" ]; then
    exit 0
else
    exit 1
fi