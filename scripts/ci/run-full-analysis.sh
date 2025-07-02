#!/bin/bash
# Full VK Parity Analysis and Deep Backend Investigation
# Runs exhaustive testing for complete compatibility analysis

set -e

# Configuration
TEST_LEVEL="full"
OUTPUT_DIR="./test-results"
PERFORMANCE_DIR="./performance-reports"
HISTORICAL_DIR="./historical-data"
DASHBOARD_DIR="./compatibility-dashboard"
VK_ANALYSIS_DIR="./vk-analysis"
CONSTRAINT_ANALYSIS_DIR="./constraint-analysis"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}🔬 Starting Full VK Parity Analysis & Deep Backend Investigation${NC}"
echo -e "${BOLD}THIS IS THE MOST COMPREHENSIVE TEST SUITE${NC}"
echo ""
echo "Test Level: $TEST_LEVEL"
echo "Expected Duration: 2-4 hours"
echo "Output Directory: $OUTPUT_DIR"
echo "Performance Directory: $PERFORMANCE_DIR"
echo "VK Analysis: $VK_ANALYSIS_DIR"
echo "Constraint Analysis: $CONSTRAINT_ANALYSIS_DIR"
echo ""

# Create all output directories
mkdir -p "$OUTPUT_DIR" "$PERFORMANCE_DIR" "$HISTORICAL_DIR" "$DASHBOARD_DIR" "$VK_ANALYSIS_DIR" "$CONSTRAINT_ANALYSIS_DIR"

# Enhanced prerequisite checks
echo -e "${BLUE}Performing Enhanced Prerequisites Check...${NC}"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

node_version=$(node --version | sed 's/v//')
if ! npx semver --range ">=16.0.0" "$node_version" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Node.js version $node_version detected. Recommend >=16.0.0${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Check system resources
total_memory=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "unknown")
if [ "$total_memory" != "unknown" ]; then
    memory_gb=$((total_memory / 1024 / 1024))
    if [ $memory_gb -lt 8 ]; then
        echo -e "${YELLOW}⚠️  System has ${memory_gb}GB RAM. Full analysis may be slow or fail. Recommend >=8GB${NC}"
    else
        echo -e "${GREEN}✅ System has ${memory_gb}GB RAM${NC}"
    fi
fi

# Check disk space
available_space=$(df . | tail -1 | awk '{print $4}')
if [ "$available_space" -lt 5242880 ]; then  # 5GB in KB
    echo -e "${YELLOW}⚠️  Less than 5GB disk space available. Full analysis generates large files.${NC}"
fi

# Check if project is built
if [ ! -d "./dist" ] || [ ! -f "./dist/node/index.js" ]; then
    echo -e "${YELLOW}⚠️  Project not built, running full build...${NC}"
    npm run build:all
fi

# Check Rust/Cargo for Sparky backend
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo not found - Sparky backend tests will fail${NC}"
    echo "Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
else
    rust_version=$(rustc --version | awk '{print $2}')
    echo -e "${GREEN}✅ Rust ${rust_version} detected${NC}"
fi

# Check for Sparky build
if [ ! -f "./src/sparky/target/wasm32-unknown-unknown/release/sparky.wasm" ]; then
    echo -e "${YELLOW}⚠️  Sparky WASM not found, building...${NC}"
    npm run build:sparky
fi

# Check for additional tools
if command -v jq &> /dev/null; then
    echo -e "${GREEN}✅ jq available for JSON processing${NC}"
else
    echo -e "${YELLOW}⚠️  jq not found - install for enhanced reporting${NC}"
fi

if command -v bc &> /dev/null; then
    echo -e "${GREEN}✅ bc available for mathematical calculations${NC}"
else
    echo -e "${YELLOW}⚠️  bc not found - install for enhanced calculations${NC}"
fi

echo -e "${GREEN}✅ Prerequisites check completed${NC}"
echo ""

# Set environment variables
export TEST_LEVEL="$TEST_LEVEL"
export OUTPUT_DIR="$OUTPUT_DIR"
export PERFORMANCE_DIR="$PERFORMANCE_DIR"
export HISTORICAL_DIR="$HISTORICAL_DIR"
export DASHBOARD_DIR="$DASHBOARD_DIR"
export VK_ANALYSIS_DIR="$VK_ANALYSIS_DIR"
export CONSTRAINT_ANALYSIS_DIR="$CONSTRAINT_ANALYSIS_DIR"
export VERBOSE="${VERBOSE:-true}"
export DETAILED_LOGGING="true"
export RUST_BACKTRACE="1"

# Start test execution with detailed logging
start_time=$(date +%s)
exit_code=0
test_count=0
passed_count=0

echo -e "${BOLD}${BLUE}🧪 Running Full Analysis Test Suite${NC}"
echo "Started at: $(date)"
echo "Process ID: $$"
echo ""

# Function to run test with enhanced logging
run_test() {
    local test_name="$1"
    local test_command="$2"
    local log_file="$3"
    local is_critical="${4:-false}"
    
    test_count=$((test_count + 1))
    echo -e "${PURPLE}${test_count}️⃣  ${test_name}...${NC}"
    echo "Command: $test_command"
    echo "Log: $log_file"
    
    test_start=$(date +%s)
    
    if timeout 3600 bash -c "$test_command" 2>&1 | tee "$log_file"; then
        test_end=$(date +%s)
        test_duration=$((test_end - test_start))
        passed_count=$((passed_count + 1))
        echo -e "${GREEN}✅ $test_name completed (${test_duration}s)${NC}"
        return 0
    else
        test_end=$(date +%s)
        test_duration=$((test_end - test_start))
        echo -e "${RED}❌ $test_name failed (${test_duration}s)${NC}"
        
        if [ "$is_critical" = "true" ]; then
            echo -e "${RED}🚨 CRITICAL TEST FAILED - Stopping analysis${NC}"
            exit_code=1
            return 1
        else
            echo -e "${YELLOW}⚠️  Non-critical test failed - Continuing${NC}"
            exit_code=1
            return 1
        fi
    fi
    echo ""
}

# Phase 1: Core VK Parity Analysis
echo -e "${BOLD}${CYAN}Phase 1: Core VK Parity Analysis${NC}"
echo "Analyzing verification key generation differences between Snarky and Sparky backends"
echo ""

run_test "Deep VK Parity Analysis" \
         "npm run test:vk-parity:deep" \
         "$VK_ANALYSIS_DIR/vk-parity-deep.log" \
         "true"

run_test "VK Hash Comparison Analysis" \
         "npm run test:vk-hash-comparison" \
         "$VK_ANALYSIS_DIR/vk-hash-comparison.log" \
         "true"

run_test "VK Generation Step-by-Step" \
         "npm run test:vk-generation:detailed" \
         "$VK_ANALYSIS_DIR/vk-generation-detailed.log" \
         "false"

# Phase 2: Constraint System Deep Dive
echo -e "${BOLD}${CYAN}Phase 2: Constraint System Deep Dive${NC}"
echo "Investigating constraint generation differences and optimization discrepancies"
echo ""

run_test "Detailed Constraint Analysis" \
         "npm run test:constraint-analysis:detailed" \
         "$CONSTRAINT_ANALYSIS_DIR/constraint-detailed.log" \
         "true"

run_test "Constraint Count Comparison" \
         "npm run test:constraint-count-analysis" \
         "$CONSTRAINT_ANALYSIS_DIR/constraint-count.log" \
         "true"

run_test "Missing Reduce Lincom Investigation" \
         "npm run test:reduce-lincom-analysis" \
         "$CONSTRAINT_ANALYSIS_DIR/reduce-lincom.log" \
         "false"

run_test "Constraint Routing Bug Analysis" \
         "npm run test:constraint-routing-bug" \
         "$CONSTRAINT_ANALYSIS_DIR/routing-bug.log" \
         "true"

# Phase 3: Backend Infrastructure Analysis
echo -e "${BOLD}${CYAN}Phase 3: Backend Infrastructure Analysis${NC}"
echo "Deep testing of backend switching mechanism and infrastructure"
echo ""

run_test "Backend Switching Deep Test" \
         "npm run test:backend-switching:deep" \
         "$OUTPUT_DIR/backend-switching-deep.log" \
         "true"

run_test "GlobalThis Snarky Update Test" \
         "npm run test:globalthis-snarky-update" \
         "$OUTPUT_DIR/globalthis-update.log" \
         "true"

run_test "Backend State Consistency" \
         "npm run test:backend-state-consistency" \
         "$OUTPUT_DIR/backend-state.log" \
         "false"

# Phase 4: Comprehensive Performance Analysis
echo -e "${BOLD}${CYAN}Phase 4: Comprehensive Performance Analysis${NC}"
echo "Deep performance profiling and optimization analysis"
echo ""

run_test "Performance Deep Profiling" \
         "npm run test:performance:deep-profile" \
         "$PERFORMANCE_DIR/deep-profile.log" \
         "false"

run_test "Memory Usage Analysis" \
         "npm run test:memory-usage:detailed" \
         "$PERFORMANCE_DIR/memory-detailed.log" \
         "false"

run_test "Constraint Generation Performance" \
         "npm run test:constraint-performance" \
         "$PERFORMANCE_DIR/constraint-performance.log" \
         "false"

# Phase 5: Advanced Feature Testing
echo -e "${BOLD}${CYAN}Phase 5: Advanced Feature Testing${NC}"
echo "Testing advanced features and edge cases"
echo ""

run_test "Foreign Field Deep Analysis" \
         "npm run test:foreign-field:deep" \
         "$OUTPUT_DIR/foreign-field-deep.log" \
         "false"

run_test "Lookup Tables Advanced" \
         "npm run test:lookup-tables:advanced" \
         "$OUTPUT_DIR/lookup-tables-advanced.log" \
         "false"

run_test "EC Operations Edge Cases" \
         "npm run test:ec-operations:edge-cases" \
         "$OUTPUT_DIR/ec-operations-edge.log" \
         "false"

run_test "Recursive Proofs Compatibility" \
         "npm run test:recursive-proofs:compatibility" \
         "$OUTPUT_DIR/recursive-proofs.log" \
         "false"

# Phase 6: Proof Generation Analysis
echo -e "${BOLD}${CYAN}Phase 6: Proof Generation Analysis${NC}"
echo "Deep analysis of proof generation differences (if VK parity achieved)"
echo ""

# Only run proof generation tests if VK parity shows progress
if [ -f "$VK_ANALYSIS_DIR/vk-parity-deep.log" ]; then
    if grep -q "VK parity.*[1-9][0-9]*%" "$VK_ANALYSIS_DIR/vk-parity-deep.log" 2>/dev/null; then
        echo "VK parity progress detected - running proof generation tests"
        
        run_test "Proof Generation Compatibility" \
                 "npm run test:proof-generation:compatibility" \
                 "$OUTPUT_DIR/proof-generation.log" \
                 "false"
        
        run_test "Proof Verification Comparison" \
                 "npm run test:proof-verification:comparison" \
                 "$OUTPUT_DIR/proof-verification.log" \
                 "false"
    else
        echo "No significant VK parity progress - skipping proof generation tests"
    fi
fi

# Phase 7: Stress Testing and Edge Cases  
echo -e "${BOLD}${CYAN}Phase 7: Stress Testing and Edge Cases${NC}"
echo "Stress testing and edge case analysis"
echo ""

run_test "Large Circuit Stress Test" \
         "npm run test:stress:large-circuits" \
         "$OUTPUT_DIR/stress-large-circuits.log" \
         "false"

run_test "Memory Pressure Test" \
         "npm run test:stress:memory-pressure" \
         "$OUTPUT_DIR/stress-memory.log" \
         "false"

run_test "Edge Case Compatibility" \
         "npm run test:edge-cases:comprehensive" \
         "$OUTPUT_DIR/edge-cases.log" \
         "false"

# Generate comprehensive analysis reports
echo -e "${BOLD}${CYAN}Generating Comprehensive Analysis Reports...${NC}"
report_start=$(date +%s)

# Generate VK analysis report
echo "Generating VK analysis report..."
if node -e "
const fs = require('fs');
const path = require('path');

// Analyze VK parity results
const vkLogs = fs.readdirSync('$VK_ANALYSIS_DIR').filter(f => f.endsWith('.log'));
let vkResults = { totalTests: vkLogs.length, passedTests: 0, vkParityAchieved: false };

vkLogs.forEach(log => {
  const content = fs.readFileSync(path.join('$VK_ANALYSIS_DIR', log), 'utf-8');
  if (content.includes('✅') || content.includes('SUCCESS')) {
    vkResults.passedTests++;
  }
  if (content.includes('100% VK parity') || content.includes('VK parity: 1.0')) {
    vkResults.vkParityAchieved = true;
  }
});

fs.writeFileSync('$VK_ANALYSIS_DIR/analysis-summary.json', JSON.stringify(vkResults, null, 2));
console.log('VK analysis summary generated');
" 2>&1 | tee "$OUTPUT_DIR/vk-analysis-generation.log"; then
    echo -e "${GREEN}✅ VK analysis report generated${NC}"
else
    echo -e "${YELLOW}⚠️  VK analysis report generation had issues${NC}"
fi

# Generate constraint analysis report
echo "Generating constraint analysis report..."
if node -e "
const fs = require('fs');
const path = require('path');

// Analyze constraint results
const constraintLogs = fs.readdirSync('$CONSTRAINT_ANALYSIS_DIR').filter(f => f.endsWith('.log'));
let constraintResults = { totalTests: constraintLogs.length, criticalIssuesFound: [], optimizationOpportunities: [] };

constraintLogs.forEach(log => {
  const content = fs.readFileSync(path.join('$CONSTRAINT_ANALYSIS_DIR', log), 'utf-8');
  if (content.includes('reduce_lincom')) {
    constraintResults.criticalIssuesFound.push('Missing reduce_lincom optimization');
  }
  if (content.includes('routing bug') || content.includes('globalThis.__snarky')) {
    constraintResults.criticalIssuesFound.push('Constraint routing bug detected');
  }
});

fs.writeFileSync('$CONSTRAINT_ANALYSIS_DIR/analysis-summary.json', JSON.stringify(constraintResults, null, 2));
console.log('Constraint analysis summary generated');
" 2>&1 | tee "$OUTPUT_DIR/constraint-analysis-generation.log"; then
    echo -e "${GREEN}✅ Constraint analysis report generated${NC}"
else
    echo -e "${YELLOW}⚠️  Constraint analysis report generation had issues${NC}"
fi

# Run final comprehensive reporting
if npx ts-node src/test/pbt/ci/AutomatedReporting.ts 2>&1 | tee "$OUTPUT_DIR/final-automated-reporting.log"; then
    echo -e "${GREEN}✅ Final automated reporting completed${NC}"
else
    echo -e "${YELLOW}⚠️  Final automated reporting had issues${NC}"
fi

if npx ts-node src/test/pbt/ci/PerformanceMonitoring.ts 2>&1 | tee "$OUTPUT_DIR/final-performance-monitoring.log"; then
    echo -e "${GREEN}✅ Final performance monitoring completed${NC}"
else
    echo -e "${YELLOW}⚠️  Final performance monitoring had issues${NC}"
fi

report_end=$(date +%s)
report_duration=$((report_end - report_start))
echo -e "${GREEN}✅ Comprehensive report generation completed (${report_duration}s)${NC}"

# Calculate total execution time
end_time=$(date +%s)
execution_time=$((end_time - start_time))
hours=$((execution_time / 3600))
minutes=$(((execution_time % 3600) / 60))
seconds=$((execution_time % 60))

echo ""
echo -e "${BOLD}${BLUE}📈 Full Analysis Results Summary${NC}"
echo "=============================================="
echo "Execution Time: ${hours}h ${minutes}m ${seconds}s"
echo "Total Tests Run: $test_count"
echo "Tests Passed: $passed_count"
echo "Success Rate: $(( passed_count * 100 / test_count ))%"
echo ""
echo "Analysis Directories:"
echo "- Main Results: $OUTPUT_DIR"
echo "- VK Analysis: $VK_ANALYSIS_DIR"
echo "- Constraint Analysis: $CONSTRAINT_ANALYSIS_DIR"
echo "- Performance Data: $PERFORMANCE_DIR"
echo "- Dashboard: $DASHBOARD_DIR"

# Extract critical findings
echo ""
echo -e "${BOLD}${CYAN}🔍 Critical Findings:${NC}"

# Check VK parity status
if [ -f "$VK_ANALYSIS_DIR/analysis-summary.json" ] && command -v jq &> /dev/null; then
    vk_parity=$(jq -r '.vkParityAchieved' "$VK_ANALYSIS_DIR/analysis-summary.json" 2>/dev/null)
    if [ "$vk_parity" = "true" ]; then
        echo -e "${GREEN}🚀 BREAKTHROUGH: VK Parity has been achieved!${NC}"
        echo -e "${GREEN}   The critical blocker has been resolved!${NC}"
    else
        echo -e "${YELLOW}⏳ VK Parity not yet achieved - investigation continues${NC}"
    fi
fi

# Check constraint issues
if [ -f "$CONSTRAINT_ANALYSIS_DIR/analysis-summary.json" ] && command -v jq &> /dev/null; then
    critical_issues=$(jq -r '.criticalIssuesFound[]' "$CONSTRAINT_ANALYSIS_DIR/analysis-summary.json" 2>/dev/null | wc -l)
    if [ "$critical_issues" -gt 0 ]; then
        echo -e "${RED}🚨 $critical_issues critical constraint system issues found${NC}"
        jq -r '.criticalIssuesFound[]' "$CONSTRAINT_ANALYSIS_DIR/analysis-summary.json" 2>/dev/null | while read -r issue; do
            echo "   - $issue"
        done
    fi
fi

# Check for specific blockers mentioned in CLAUDE.md
echo ""
echo -e "${BOLD}${CYAN}🎯 Known Blocker Status:${NC}"

# Check for VK hash uniformity issue
if grep -r "identical.*hash" "$VK_ANALYSIS_DIR" >/dev/null 2>&1; then
    echo -e "${RED}🚨 CONFIRMED: VK hash uniformity issue detected${NC}"
    echo "   All Sparky VKs generate identical hash"
else
    echo -e "${GREEN}✅ VK hash uniformity issue not detected in this run${NC}"
fi

# Check for reduce_lincom optimization
if grep -r "reduce_lincom" "$CONSTRAINT_ANALYSIS_DIR" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Missing reduce_lincom optimization confirmed${NC}"
    echo "   Causing constraint count differences (Sparky: 5, Snarky: 3)"
else
    echo -e "${GREEN}✅ No reduce_lincom issues detected${NC}"
fi

# Check for routing bug
if grep -r "globalThis.*__snarky" "$OUTPUT_DIR" >/dev/null 2>&1; then
    echo -e "${RED}🚨 Constraint routing bug confirmed${NC}"
    echo "   globalThis.__snarky not updated when switching to Sparky"
else
    echo -e "${GREEN}✅ No constraint routing bug detected${NC}"
fi

echo ""

# Final status and next steps
if [ "$exit_code" -eq 0 ]; then
    echo -e "${BOLD}${GREEN}🎉 Full analysis completed successfully!${NC}"
    
    echo ""
    echo -e "${BOLD}${BLUE}📋 Detailed Next Steps:${NC}"
    echo "1. 🔍 Review VK analysis: $VK_ANALYSIS_DIR/analysis-summary.json"
    echo "2. 🧩 Investigate constraint issues: $CONSTRAINT_ANALYSIS_DIR/analysis-summary.json"
    echo "3. 📊 Study performance data: $PERFORMANCE_DIR/"
    echo "4. 🌐 View comprehensive dashboard: $DASHBOARD_DIR/index.html"
    echo "5. 📧 Share findings with development team"
    echo "6. 🔄 Monitor progress with: npm run test:framework"
    
    if [ -f "$VK_ANALYSIS_DIR/analysis-summary.json" ]; then
        echo ""
        echo -e "${BLUE}🚀 Priority Actions Based on Analysis:${NC}"
        if command -v jq &> /dev/null; then
            if jq -e '.vkParityAchieved' "$VK_ANALYSIS_DIR/analysis-summary.json" >/dev/null 2>&1; then
                echo "✅ VK parity achieved - Focus on proof generation compatibility"
                echo "✅ Begin integration testing with full proof pipeline"
            else
                echo "🎯 Focus on resolving VK generation differences"
                echo "🎯 Investigate constraint system optimizations"
                echo "🎯 Fix constraint routing bug if detected"
            fi
        fi
    fi
    
    exit 0
else
    echo -e "${BOLD}${RED}❌ Full analysis completed with some failures.${NC}"
    echo ""
    echo -e "${BOLD}${YELLOW}🔧 Comprehensive Troubleshooting Guide:${NC}"
    echo ""
    echo "Critical Issues to Address:"
    echo "1. 🚨 Check failed critical tests in logs"
    echo "2. 🔍 Focus on VK parity blockers first"
    echo "3. 🧩 Address constraint system differences"
    echo "4. 🔄 Fix backend switching issues"
    echo ""
    echo "Investigation Priorities:"
    echo "- VK generation: Review $VK_ANALYSIS_DIR/"
    echo "- Constraints: Review $CONSTRAINT_ANALYSIS_DIR/"
    echo "- Backend switching: Check routing bug logs"
    echo "- Performance: Identify bottlenecks in $PERFORMANCE_DIR/"
    echo ""
    echo "Tools for Deep Investigation:"
    echo "- Individual test rerun: npm run test:[specific-test]"
    echo "- Constraint debugging: Enable RUST_BACKTRACE=full"
    echo "- VK comparison: Use manual VK generation scripts"
    echo "- Performance profiling: Use Node.js profiler tools"
    
    exit 1
fi