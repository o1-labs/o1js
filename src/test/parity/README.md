# Parity Testing Suite

This directory contains focused, maintainable tests for verifying Snarky vs Sparky backend parity.

## Philosophy 

**Simple Question**: Do both backends produce identical results for identical inputs?

**Test Strategy**: 
- ✅ **Focus**: Clean, specific tests for core functionality
- ✅ **Speed**: Fast-running tests that developers can run frequently  
- ✅ **Clarity**: Easy to understand what's being tested and why
- ❌ **Avoid**: Over-engineered test infrastructure, redundant test variations

## Test Files

### `backend-comparison.test.ts`
Basic backend switching and result comparison tests.

### `vk-parity.test.ts` 
Comprehensive verification key generation parity tests.
- Core field operations (add, mul, assertEquals)
- Complex nested operations
- Edge cases (zero, one, identity operations)
- Multiple constraint scenarios

## Running Tests

```bash
# Run all parity tests
npm run test:parity

# Run specific parity tests  
npm run test backend-comparison
npm run test vk-parity
```

## Test Results

Track parity success rate:
- **Current**: 14.3% (1/7 operations passing)
- **Target**: 95%+ VK parity

## Design Principles

1. **Each test has a single clear purpose**
2. **Tests are independent and can run in any order**
3. **Mock implementations are clearly marked and temporary**
4. **Real o1js integration comes after structure is established**
5. **Failed tests provide actionable information about what's broken**

This replaces the previous scattered testing infrastructure with a focused, maintainable approach.