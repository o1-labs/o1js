#!/bin/bash
# Comprehensive Backend Compatibility Tests
# Runs detailed VK parity analysis, performance benchmarking, and regression detection

set -e

# Configuration
TEST_LEVEL="comprehensive"
OUTPUT_DIR="./test-results"
PERFORMANCE_DIR="./performance-reports"
HISTORICAL_DIR="./historical-data"
DASHBOARD_DIR="./compatibility-dashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔬 Starting Comprehensive Backend Compatibility Tests${NC}"
echo "Test Level: $TEST_LEVEL"
echo "Output Directory: $OUTPUT_DIR"
echo "Performance Directory: $PERFORMANCE_DIR"
echo "Historical Data: $HISTORICAL_DIR"
echo "Dashboard Directory: $DASHBOARD_DIR"
echo ""

# Create output directories
mkdir -p "$OUTPUT_DIR" "$PERFORMANCE_DIR" "$HISTORICAL_DIR" "$DASHBOARD_DIR"

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Check if project is built
if [ ! -d "./dist" ] || [ ! -f "./dist/node/index.js" ]; then
    echo -e "${YELLOW}⚠️  Project not built, running build...${NC}"
    npm run build
fi

# Check for Rust/Cargo for Sparky backend
if ! command -v cargo &> /dev/null; then
    echo -e "${YELLOW}⚠️  Cargo not found - Sparky backend tests may fail${NC}"
else
    echo -e "${GREEN}✅ Cargo detected - Sparky backend ready${NC}"
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"
echo ""

# Set environment variables
export TEST_LEVEL="$TEST_LEVEL"
export OUTPUT_DIR="$OUTPUT_DIR"
export PERFORMANCE_DIR="$PERFORMANCE_DIR"
export HISTORICAL_DIR="$HISTORICAL_DIR"
export DASHBOARD_DIR="$DASHBOARD_DIR"
export VERBOSE="${VERBOSE:-true}"

# Start test execution
start_time=$(date +%s)
exit_code=0

echo -e "${BLUE}🧪 Running Comprehensive Compatibility Tests${NC}"
echo "Started at: $(date)"
echo "Expected duration: 45-90 minutes"
echo ""

# Test 1: Comprehensive VK Parity Analysis
echo -e "${PURPLE}1️⃣  Running Comprehensive VK Parity Analysis...${NC}"
test_start=$(date +%s)
if npm run test:vk-parity:comprehensive 2>&1 | tee "$OUTPUT_DIR/vk-parity-comprehensive.log"; then
    test_end=$(date +%s)
    test_duration=$((test_end - test_start))
    echo -e "${GREEN}✅ Comprehensive VK parity analysis completed (${test_duration}s)${NC}"
else
    echo -e "${RED}❌ Comprehensive VK parity analysis failed${NC}"
    exit_code=1
fi
echo ""

# Test 2: Performance Benchmarking
echo -e "${PURPLE}2️⃣  Running Performance Benchmarking...${NC}"
test_start=$(date +%s)
if npm run test:performance:comprehensive 2>&1 | tee "$OUTPUT_DIR/performance-comprehensive.log"; then
    test_end=$(date +%s)
    test_duration=$((test_end - test_start))
    echo -e "${GREEN}✅ Performance benchmarking completed (${test_duration}s)${NC}"
else
    echo -e "${RED}❌ Performance benchmarking failed${NC}"
    exit_code=1
fi
echo ""

# Test 3: Backend Infrastructure Testing
echo -e "${PURPLE}3️⃣  Testing Backend Infrastructure...${NC}"
test_start=$(date +%s)
if npm run test:backend-infrastructure 2>&1 | tee "$OUTPUT_DIR/backend-infrastructure.log"; then
    test_end=$(date +%s)
    test_duration=$((test_end - test_start))
    echo -e "${GREEN}✅ Backend infrastructure testing completed (${test_duration}s)${NC}"
else
    echo -e "${RED}❌ Backend infrastructure testing failed${NC}"
    exit_code=1
fi
echo ""

# Test 4: Constraint System Analysis
echo -e "${PURPLE}4️⃣  Running Constraint System Analysis...${NC}"
test_start=$(date +%s)
if npm run test:constraint-analysis 2>&1 | tee "$OUTPUT_DIR/constraint-analysis.log"; then
    test_end=$(date +%s)
    test_duration=$((test_end - test_start))
    echo -e "${GREEN}✅ Constraint system analysis completed (${test_duration}s)${NC}"
else
    echo -e "${RED}❌ Constraint system analysis failed${NC}"
    exit_code=1
fi
echo ""

# Test 5: Foreign Field Operations
echo -e "${PURPLE}5️⃣  Testing Foreign Field Operations...${NC}"
test_start=$(date +%s)
if npm run test:foreign-field:comprehensive 2>&1 | tee "$OUTPUT_DIR/foreign-field-comprehensive.log"; then
    test_end=$(date +%s)
    test_duration=$((test_end - test_start))
    echo -e "${GREEN}✅ Foreign field operations testing completed (${test_duration}s)${NC}"
else
    echo -e "${RED}❌ Foreign field operations testing failed${NC}"
    exit_code=1
fi
echo ""

# Test 6: Lookup Table Operations
echo -e "${PURPLE}6️⃣  Testing Lookup Table Operations...${NC}"
test_start=$(date +%s)
if npm run test:lookup-tables:comprehensive 2>&1 | tee "$OUTPUT_DIR/lookup-tables-comprehensive.log"; then
    test_end=$(date +%s)
    test_duration=$((test_end - test_start))
    echo -e "${GREEN}✅ Lookup table operations testing completed (${test_duration}s)${NC}"
else
    echo -e "${RED}❌ Lookup table operations testing failed${NC}"
    exit_code=1
fi
echo ""

# Test 7: EC Operations
echo -e "${PURPLE}7️⃣  Testing EC Operations...${NC}"
test_start=$(date +%s)
if npm run test:ec-operations:comprehensive 2>&1 | tee "$OUTPUT_DIR/ec-operations-comprehensive.log"; then
    test_end=$(date +%s)
    test_duration=$((test_end - test_start))
    echo -e "${GREEN}✅ EC operations testing completed (${test_duration}s)${NC}"
else
    echo -e "${RED}❌ EC operations testing failed${NC}"
    exit_code=1
fi
echo ""

# Generate comprehensive reports
echo -e "${CYAN}📊 Generating Comprehensive Reports...${NC}"
report_start=$(date +%s)

# Run automated reporting
if npx ts-node src/test/pbt/ci/AutomatedReporting.ts 2>&1 | tee "$OUTPUT_DIR/automated-reporting.log"; then
    echo -e "${GREEN}✅ Automated reporting completed${NC}"
else
    echo -e "${YELLOW}⚠️  Automated reporting had issues (non-critical)${NC}"
fi

# Run performance monitoring
if npx ts-node src/test/pbt/ci/PerformanceMonitoring.ts 2>&1 | tee "$OUTPUT_DIR/performance-monitoring.log"; then
    echo -e "${GREEN}✅ Performance monitoring completed${NC}"
else
    echo -e "${YELLOW}⚠️  Performance monitoring had issues (non-critical)${NC}"
fi

# Generate dashboard
if npm run generate:compatibility-dashboard 2>&1 | tee "$OUTPUT_DIR/dashboard-generation.log"; then
    echo -e "${GREEN}✅ Compatibility dashboard generated${NC}"
else
    echo -e "${YELLOW}⚠️  Dashboard generation had issues (non-critical)${NC}"
fi

report_end=$(date +%s)
report_duration=$((report_end - report_start))
echo -e "${GREEN}✅ Report generation completed (${report_duration}s)${NC}"
echo ""

# Calculate total execution time
end_time=$(date +%s)
execution_time=$((end_time - start_time))
hours=$((execution_time / 3600))
minutes=$(((execution_time % 3600) / 60))
seconds=$((execution_time % 60))

echo ""
echo -e "${BLUE}📈 Comprehensive Test Results Summary${NC}"
echo "=============================================="
if [ $hours -gt 0 ]; then
    echo "Execution Time: ${hours}h ${minutes}m ${seconds}s"
else
    echo "Execution Time: ${minutes}m ${seconds}s"
fi
echo "Logs Directory: $OUTPUT_DIR"
echo "Performance Reports: $PERFORMANCE_DIR"
echo "Historical Data: $HISTORICAL_DIR"
echo "Dashboard: $DASHBOARD_DIR"

# Extract and display key metrics
if [ -f "$OUTPUT_DIR/comprehensive-compatibility.json" ]; then
    echo ""
    echo -e "${CYAN}🔍 Key Metrics:${NC}"
    
    if command -v jq &> /dev/null; then
        vk_parity=$(jq -r '.vkParityRate // "N/A"' "$OUTPUT_DIR/comprehensive-compatibility.json" 2>/dev/null)
        regression_detected=$(jq -r '.regressionDetected // "N/A"' "$OUTPUT_DIR/comprehensive-compatibility.json" 2>/dev/null)
        progress_delta=$(jq -r '.progressDelta // "N/A"' "$OUTPUT_DIR/comprehensive-compatibility.json" 2>/dev/null)
        
        echo "- VK Parity Rate: $vk_parity"
        echo "- Regression Detected: $regression_detected"
        echo "- Progress Delta: $progress_delta"
        
        # Show test results breakdown
        total_tests=$(find "$OUTPUT_DIR" -name "*.log" | wc -l)
        echo "- Total Test Suites: $total_tests"
        
        # Count log files with "✅" or "SUCCESS" patterns
        passed_tests=$(grep -l "✅\|SUCCESS\|completed successfully" "$OUTPUT_DIR"/*.log 2>/dev/null | wc -l || echo "0")
        echo "- Passed Test Suites: $passed_tests"
        
    else
        echo "- Install 'jq' for detailed metrics display"
    fi
fi

# Check for dashboard
if [ -f "$DASHBOARD_DIR/index.html" ]; then
    echo ""
    echo -e "${CYAN}🌐 Dashboard Available:${NC}"
    echo "- Open: file://$(pwd)/$DASHBOARD_DIR/index.html"
    echo "- Or serve with: python3 -m http.server 8080 -d $DASHBOARD_DIR"
fi

echo ""

# Final status and recommendations
if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}🎉 Comprehensive compatibility tests completed successfully!${NC}"
    
    # Check for significant progress or breakthrough
    if [ -f "$OUTPUT_DIR/comprehensive-compatibility.json" ] && command -v jq &> /dev/null; then
        vk_parity=$(jq -r '.vkParityRate' "$OUTPUT_DIR/comprehensive-compatibility.json" 2>/dev/null)
        if [ "$vk_parity" != "null" ] && [ "$vk_parity" != "N/A" ]; then
            # Use bc for floating point comparison if available
            if command -v bc &> /dev/null; then
                if (( $(echo "$vk_parity >= 1.0" | bc -l) )); then
                    echo -e "${GREEN}🚀 BREAKTHROUGH: 100% VK Parity Achieved!${NC}"
                    echo -e "${GREEN}   The critical VK parity blocker has been resolved!${NC}"
                elif (( $(echo "$vk_parity >= 0.5" | bc -l) )); then
                    parity_percent=$(echo "$vk_parity * 100" | bc -l | xargs printf "%.1f")
                    echo -e "${YELLOW}📈 Significant VK Parity Progress: ${parity_percent}%${NC}"
                    echo -e "${YELLOW}   More than halfway to full compatibility!${NC}"
                elif (( $(echo "$vk_parity > 0" | bc -l) )); then
                    parity_percent=$(echo "$vk_parity * 100" | bc -l | xargs printf "%.1f")
                    echo -e "${CYAN}📊 VK Parity Progress: ${parity_percent}%${NC}"
                fi
            fi
        fi
        
        # Check for regressions
        regression=$(jq -r '.regressionDetected' "$OUTPUT_DIR/comprehensive-compatibility.json" 2>/dev/null)
        if [ "$regression" = "true" ]; then
            echo -e "${RED}⚠️  Regression detected - investigate recent changes${NC}"
        fi
    fi
    
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "✓ Review detailed dashboard: $DASHBOARD_DIR/index.html"
    echo "✓ Analyze performance reports in: $PERFORMANCE_DIR"
    echo "✓ Check historical trends in: $HISTORICAL_DIR"
    echo "✓ For deep analysis, run: ./scripts/ci/run-full-analysis.sh"
    echo "✓ Monitor progress with: npm run test:framework"
    
    exit 0
else
    echo -e "${RED}❌ Some comprehensive tests failed.${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting Steps:${NC}"
    echo "1. Check individual test logs in: $OUTPUT_DIR"
    echo "2. Verify system resources (memory, disk space)"
    echo "3. Ensure Sparky backend is properly built"
    echo "4. Try running tests individually to isolate issues"
    echo "5. Check for constraint routing bugs in backend switching"
    echo ""
    echo -e "${BLUE}Common Issues:${NC}"
    echo "- VK parity failures: Check constraint system differences"
    echo "- Performance failures: Verify adequate system resources"
    echo "- Backend switching: Ensure globalThis.__snarky is updated correctly"
    
    exit 1
fi