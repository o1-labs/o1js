#!/bin/bash
# Quick Backend Compatibility Tests
# Runs basic VK parity and performance tests for fast feedback

set -e

# Configuration
TEST_LEVEL="quick"
OUTPUT_DIR="./test-results"
PERFORMANCE_DIR="./performance-reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Quick Backend Compatibility Tests${NC}"
echo "Test Level: $TEST_LEVEL"
echo "Output Directory: $OUTPUT_DIR"
echo "Performance Directory: $PERFORMANCE_DIR"
echo ""

# Create output directories
mkdir -p "$OUTPUT_DIR" "$PERFORMANCE_DIR"

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

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"
echo ""

# Set environment variables
export TEST_LEVEL="$TEST_LEVEL"
export OUTPUT_DIR="$OUTPUT_DIR"
export PERFORMANCE_DIR="$PERFORMANCE_DIR"
export VERBOSE="${VERBOSE:-false}"

# Start test execution
start_time=$(date +%s)

echo -e "${BLUE}🧪 Running Quick Compatibility Tests${NC}"
echo "Started at: $(date)"
echo ""

# Test 1: Basic VK Parity
echo -e "${BLUE}1️⃣  Testing Basic VK Parity...${NC}"
if npm run test:vk-parity:basic 2>&1 | tee "$OUTPUT_DIR/vk-parity-basic.log"; then
    echo -e "${GREEN}✅ Basic VK Parity tests completed${NC}"
else
    echo -e "${RED}❌ Basic VK Parity tests failed${NC}"
    exit_code=1
fi
echo ""

# Test 2: Performance Quick Check
echo -e "${BLUE}2️⃣  Running Performance Quick Check...${NC}"
if npm run test:performance:quick 2>&1 | tee "$OUTPUT_DIR/performance-quick.log"; then
    echo -e "${GREEN}✅ Performance quick check completed${NC}"
else
    echo -e "${RED}❌ Performance quick check failed${NC}"
    exit_code=1
fi
echo ""

# Test 3: Critical Backend Operations
echo -e "${BLUE}3️⃣  Testing Critical Backend Operations...${NC}"
if npm run test:backend:critical 2>&1 | tee "$OUTPUT_DIR/backend-critical.log"; then
    echo -e "${GREEN}✅ Critical backend operations completed${NC}"
else
    echo -e "${RED}❌ Critical backend operations failed${NC}"
    exit_code=1
fi
echo ""

# Generate quick report
echo -e "${BLUE}📊 Generating Quick Report...${NC}"
if node scripts/ci/run-compatibility-tests.js 2>&1 | tee "$OUTPUT_DIR/compatibility-runner.log"; then
    echo -e "${GREEN}✅ Report generation completed${NC}"
else
    echo -e "${YELLOW}⚠️  Report generation had issues (non-critical)${NC}"
fi

# Calculate execution time
end_time=$(date +%s)
execution_time=$((end_time - start_time))
minutes=$((execution_time / 60))
seconds=$((execution_time % 60))

echo ""
echo -e "${BLUE}📈 Quick Test Results Summary${NC}"
echo "=============================================="
echo "Execution Time: ${minutes}m ${seconds}s"
echo "Logs Directory: $OUTPUT_DIR"
echo "Performance Reports: $PERFORMANCE_DIR"

# Check for results files
if [ -f "$OUTPUT_DIR/quick-compatibility.json" ]; then
    echo ""
    echo -e "${BLUE}Key Metrics:${NC}"
    
    # Extract VK parity rate if available
    if command -v jq &> /dev/null; then
        vk_parity=$(jq -r '.vkParityRate // "N/A"' "$OUTPUT_DIR/quick-compatibility.json" 2>/dev/null)
        critical_failures=$(jq -r '.criticalFailures // "N/A"' "$OUTPUT_DIR/quick-compatibility.json" 2>/dev/null)
        performance_regression=$(jq -r '.performanceRegression // "N/A"' "$OUTPUT_DIR/quick-compatibility.json" 2>/dev/null)
        
        echo "- VK Parity Rate: $vk_parity"
        echo "- Critical Failures: $critical_failures"
        echo "- Performance Regression: $performance_regression"
    else
        echo "- Install 'jq' for detailed metrics display"
    fi
fi

echo ""

# Final status
if [ "${exit_code:-0}" -eq 0 ]; then
    echo -e "${GREEN}🎉 Quick compatibility tests completed successfully!${NC}"
    
    # Check for breakthrough
    if [ -f "$OUTPUT_DIR/quick-compatibility.json" ] && command -v jq &> /dev/null; then
        vk_parity=$(jq -r '.vkParityRate' "$OUTPUT_DIR/quick-compatibility.json" 2>/dev/null)
        if [ "$vk_parity" != "null" ] && [ "$vk_parity" != "N/A" ]; then
            if (( $(echo "$vk_parity >= 1.0" | bc -l 2>/dev/null || echo 0) )); then
                echo -e "${GREEN}🚀 BREAKTHROUGH: 100% VK Parity Achieved!${NC}"
            elif (( $(echo "$vk_parity >= 0.5" | bc -l 2>/dev/null || echo 0) )); then
                echo -e "${YELLOW}📈 Significant VK Parity Progress: $(echo "$vk_parity * 100" | bc -l | cut -d. -f1)%${NC}"
            fi
        fi
    fi
    
    echo ""
    echo "Next steps:"
    echo "- Review logs in $OUTPUT_DIR"
    echo "- Run comprehensive tests: ./scripts/ci/run-comprehensive-tests.sh"
    echo "- View dashboard: open compatibility-dashboard/index.html"
    
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check logs for details.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "- Check logs in $OUTPUT_DIR"
    echo "- Ensure all dependencies are installed: npm install"
    echo "- Try rebuilding: npm run build"
    echo "- Check system resources and permissions"
    
    exit 1
fi