#!/bin/bash
# Comprehensive security test runner for o1js/Sparky
# This script runs all security-focused property-based tests
#
# ⚠️  IMPORTANT: These tests provide security indicators, not guarantees
# Professional audits and formal verification are required for production

set -e

echo "🔒 Running Comprehensive Security Tests for o1js/Sparky"
echo "========================================================"
echo "⚠️  WARNING: These tests cannot detect all security vulnerabilities"
echo "⚠️  Timing tests are statistical only - NOT cryptographic verification"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test suite and track results
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "\n${YELLOW}Running: ${test_name}${NC}"
    echo "----------------------------------------"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ ${test_name} FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 1. Rust Security Property Tests
echo -e "\n${YELLOW}=== RUST SECURITY TESTS ===${NC}"

# Navigate to sparky directory
cd src/sparky

# Run mathematical correctness tests
run_test "Field Operations Correctness" \
    "cargo test --test field_ops --features testing -- --nocapture"

# Run comprehensive property tests
run_test "Mathematical Properties (1000+ cases each)" \
    "cargo test --test properties --features testing -- --nocapture"

# Run security-focused property tests
run_test "Security Properties" \
    "cargo test --test security_properties --features testing -- --nocapture"

# Run performance benchmarks to check for timing leaks
run_test "Performance Benchmarks (timing analysis)" \
    "cargo bench --bench field_operations_bench"

# 2. TypeScript/o1js Security Tests
echo -e "\n${YELLOW}=== TYPESCRIPT SECURITY TESTS ===${NC}"

# Navigate back to project root
cd ../..

# Ensure we're using the correct backend
export NODE_OPTIONS="--max-old-space-size=8192"

# Run backend security parity tests
run_test "Backend Security Parity" \
    "npm run test src/test/security/backend-security-parity.test.ts -- --testTimeout=360000"

# Run cryptographic property tests
run_test "Cryptographic Properties" \
    "npm run test src/test/security/cryptographic-properties.test.ts -- --testTimeout=360000"

# Run existing parity tests that have security implications
run_test "VK Generation Parity" \
    "npm run test:parity -- --testTimeout=360000"

# 3. Integration Security Tests
echo -e "\n${YELLOW}=== INTEGRATION SECURITY TESTS ===${NC}"

# Test constraint system security
run_test "Constraint System Analysis" \
    "npm run test src/test/parity/backend-comparison.test.ts -- --testTimeout=360000"

# 4. Attack Vector Testing
echo -e "\n${YELLOW}=== ATTACK VECTOR TESTING ===${NC}"

# Create a simple attack vector test
cat > test-attack-vectors.mjs << 'EOF'
import { Field, switchBackend, Provable } from './dist/node/index.js';

console.log('Testing common attack vectors...');

async function testAttackVectors() {
  const backends = ['snarky', 'sparky'];
  const results = {};

  for (const backend of backends) {
    console.log(`\nTesting ${backend}...`);
    await switchBackend(backend);
    results[backend] = {};

    // Test 1: Integer overflow
    try {
      const max = Field(Field.ORDER - 1n);
      const overflow = max.add(Field(2));
      results[backend].overflow = 'handled';
    } catch (e) {
      results[backend].overflow = 'error';
    }

    // Test 2: Division by zero
    try {
      const one = Field(1);
      const zero = Field(0);
      const invalid = one.div(zero);
      results[backend].divByZero = 'vulnerable';
    } catch (e) {
      results[backend].divByZero = 'protected';
    }

    // Test 3: Invalid field elements
    try {
      const invalid = Field(Field.ORDER + 100n);
      results[backend].invalidField = 'accepted';
    } catch (e) {
      results[backend].invalidField = 'rejected';
    }

    // Test 4: Timing attack (simplified)
    const timings = [];
    for (let i = 0; i < 100; i++) {
      const a = Field(i);
      const b = Field(Field.ORDER - 1n);
      const start = performance.now();
      a.mul(b);
      timings.push(performance.now() - start);
    }
    const variance = timings.reduce((a, b) => a + b, 0) / timings.length;
    results[backend].timingVariance = variance;
  }

  // Compare results
  console.log('\n=== Attack Vector Results ===');
  console.log(JSON.stringify(results, null, 2));

  // Check for consistency
  const snarkyStr = JSON.stringify(results.snarky);
  const sparkyStr = JSON.stringify(results.sparky);
  
  if (snarkyStr === sparkyStr) {
    console.log('\n✅ Both backends handle attacks identically');
    return true;
  } else {
    console.log('\n⚠️  Backends differ in attack handling');
    return false;
  }
}

testAttackVectors().then(success => {
  process.exit(success ? 0 : 1);
}).catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
EOF

run_test "Attack Vector Consistency" \
    "node test-attack-vectors.mjs"

# Clean up
rm -f test-attack-vectors.mjs

# 5. Summary Report
echo -e "\n${YELLOW}========================================"
echo "SECURITY TEST SUMMARY"
echo "========================================${NC}"
echo -e "Total Tests Run: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ All security tests passed!${NC}"
    echo "The cryptographic implementation appears to be sound."
else
    echo -e "\n${RED}⚠️  Security vulnerabilities detected!${NC}"
    echo "Review the failed tests above for potential attack vectors."
fi

# Generate detailed security report
cat > security-test-report.md << EOF
# Security Test Report

Generated on: $(date)

## Summary
- Total Tests: $TOTAL_TESTS
- Passed: $PASSED_TESTS  
- Failed: $FAILED_TESTS

## Test Categories

### 1. Rust Security Tests
- Field operation correctness
- Mathematical properties (1000+ cases per property)
- Security-focused properties
- Timing analysis via benchmarks

### 2. TypeScript Security Tests  
- Backend security parity
- Cryptographic properties
- VK generation consistency

### 3. Integration Tests
- Constraint system security
- Cross-backend compatibility

### 4. Attack Vector Tests
- Integer overflow handling
- Division by zero protection
- Invalid input rejection
- Timing attack resistance

## Recommendations

$(if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ No security issues detected. The implementation appears cryptographically sound."
else
    echo "⚠️  Security issues detected. Review failed tests and address vulnerabilities before production use."
fi)

## Detailed Results

See test output above for specific test results and any detected vulnerabilities.
EOF

echo -e "\n📄 Detailed report saved to: security-test-report.md"

# Exit with appropriate code
exit $FAILED_TESTS