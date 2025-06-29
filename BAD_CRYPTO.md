# BAD_CRYPTO.md - Security Audit: Weak Randomness in o1js

## CRITICAL SECURITY ISSUE: Math.random() Usage

This document tracks all instances of weak randomness (Math.random()) in the o1js codebase. Using Math.random() in cryptographic contexts is a severe security vulnerability as it is not cryptographically secure and can be predicted.

## Critical Issues (Production Code)

### 1. ✅ FIXED: Sparky Adapter Field Random Generation
**File**: `src/bindings/sparky-adapter.js`
**Line**: 267 (now line 297)
**Context**: Generates random field elements for cryptographic operations
**Old Code**:
```javascript
random() {
  const randomBigInt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  return [0, [0, randomBigInt]];
}
```
**New Code**:
```javascript
random() {
  // Generate a cryptographically secure random field element
  const randomBigInt = generateSecureRandomField();
  return [0, [0, randomBigInt]]; // [FieldType.Constant, [0, bigint]]
}
```
**Fix Details**: 
- Replaced Math.random() with Fp.random() from finite-field.js
- Fp.random() uses cryptographically secure randomBytes from crypto module
- Implements rejection sampling to ensure uniform distribution over the field
- Generates full-range 255-bit random field elements
- Fixed Date: 2025-01-29
- Verified working with test-sparky-secure-random.js
**Status**: FIXED AND VERIFIED ✅

### 2. ❌ Global Context ID Generation
**File**: `src/lib/util/global-context.ts`
**Line**: 80
**Context**: Generates context IDs for global state management
```typescript
let id = Math.floor(Math.random() * 1e10);
```
**Impact**: Context IDs might be predictable, potentially affecting security if used in sensitive contexts.
**Status**: NOT FIXED - Needs investigation of security implications

### 3. ❌ AccountUpdate ID Generation
**File**: `src/lib/mina/v1/account-update.ts`
**Lines**: 663, 1108
**Context**: Generates IDs for AccountUpdate objects in transactions
```typescript
static Actions = Actions();
// Uses Math.random() internally for ID generation
```
**Impact**: Transaction component IDs could be predictable.
**Status**: NOT FIXED - Needs refactoring to use secure randomness

### 4. ❌ RandomId Type Implementation
**File**: `src/lib/provable/types/auxiliary.ts`
**Lines**: 8, 14
**Context**: Auxiliary type for provable computations
```typescript
RandomId: RandomId,
// Implementation uses Math.random()
```
**Impact**: IDs in provable computations might be predictable.
**Status**: NOT FIXED - Needs secure random implementation

## Test Code Issues (Lower Priority)

### 5. ⚠️ Keccak Unit Test
**File**: `src/lib/provable/test/keccak.unit-test.ts`
**Line**: 110
**Context**: Random digest length selection in tests
**Impact**: Test reproducibility issues only
**Status**: NOT FIXED

### 6. ⚠️ Base64 Unit Test
**File**: `src/lib/provable/test/base64.unit-test.ts`
**Line**: 20
**Context**: Random string length generation in tests
**Impact**: Test reproducibility issues only
**Status**: NOT FIXED

### 7. ⚠️ Sudoku Example
**File**: `src/examples/zkapps/sudoku/sudoku-lib.js`
**Lines**: 17, 114
**Context**: Sudoku puzzle generation in example code
**Impact**: Sets bad example for users
**Status**: NOT FIXED

## Existing Secure Randomness Infrastructure

✅ The codebase already has proper cryptographic randomness implementations:

1. **Node.js**: `src/bindings/crypto/random.ts`
   - Uses `crypto.randomBytes()`
   - Cryptographically secure

2. **Browser**: `src/bindings/crypto/random.web.ts`
   - Uses `crypto.getRandomValues()`
   - Cryptographically secure

3. **Testing Utils**: `src/lib/testing/random.ts`
   - Properly uses the above secure implementations

## Recommended Actions

1. **IMMEDIATE**: Replace Math.random() in sparky-adapter.js with secure randomness
2. **HIGH PRIORITY**: Audit and replace all production code Math.random() usage
3. **MEDIUM PRIORITY**: Add ESLint rule to ban Math.random()
4. **DOCUMENTATION**: Add security guidelines for contributors

## Security Guidelines

**NEVER** use `Math.random()` for:
- Generating cryptographic keys or nonces
- Creating random field elements
- Generating transaction IDs
- Any security-sensitive randomness

**ALWAYS** use:
- `src/bindings/crypto/random.ts` for Node.js
- `src/bindings/crypto/random.web.ts` for browser
- Or the unified interface in `src/lib/testing/random.ts`

## Tracking

This file should be updated as issues are fixed. Each fix should include:
- Date fixed
- Commit hash
- Brief description of the fix
- Verification that the fix uses appropriate secure randomness

Last audit: 2025-01-29