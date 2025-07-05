# Test Implementation Pattern (.impl.ts files)

Created: July 5, 2025, 02:53 UTC
Last Modified: July 5, 2025, 02:53 UTC

## Why We Need .impl.ts Files

The Sparky test infrastructure requires a specific pattern for test files that use TypeScript decorators (like `@method`, `@state`) with o1js types. This document explains why we split tests into `.suite.ts` and `.impl.ts` files.

## The Problem

When using TypeScript decorators with dynamically imported modules, TypeScript's reflection metadata system fails to properly capture parameter types. Specifically:

1. The `@method` decorator uses `Reflect.getMetadata('design:paramtypes', ...)` to determine parameter types
2. With dynamic imports (`await import('../../../../index.js')`), TypeScript emits `Object` or `undefined` instead of the actual types like `Field` or `UInt64`
3. This causes runtime errors like:
   - "Argument 1 of method updateCounter is not a provable type: function Object() { [native code] }"
   - "Argument 1 of method updateCounter is not a provable type: undefined"

## The Solution

We use a two-file pattern:

### 1. Suite File (.suite.ts)
- Lightweight metadata-only file
- Contains test definitions with names, types, and timeouts
- Uses dynamic imports to load the implementation
- No static imports of o1js types

Example:
```typescript
export const tests: CompilationTestCase[] = [
  {
    name: 'basic-smartcontract-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const impl = await import('./circuit-compilation.impl.js');
      return impl.basicSmartContractCompilation(backend);
    },
    timeout: 120000
  }
];
```

### 2. Implementation File (.impl.ts)
- Contains actual test logic
- Uses static imports for o1js types at the top
- This ensures TypeScript reflection metadata works correctly
- Dynamically imports o1js for runtime use (avoiding module format conflicts)

Example:
```typescript
// Static imports for TypeScript metadata
import { Field, UInt64 } from '../../../../index.js';

export const basicSmartContractCompilation = async (backend?: string) => {
  // Dynamic import for runtime
  const o1js = await import('../../../../index.js');
  const { SmartContract, State, state, Field: DynamicField, method } = o1js;
  
  class TestContract extends SmartContract {
    @state(DynamicField) value = State();
    
    // TypeScript knows the parameter type is Field from static import
    @method async updateValue(newValue: Field) {
      // Use dynamic types in implementation
      const current = this.value.getAndRequireEquals();
      const sum = (current as any).add(newValue);
      this.value.set(sum);
    }
  }
};
```

## Key Points

1. **Static imports are for TypeScript only** - They provide type information at compile time
2. **Dynamic imports are for runtime** - They avoid module format conflicts in the test environment
3. **Don't shadow variable names** - Use aliases like `DynamicField` to avoid conflicts
4. **Parameter types must use static imports** - This is what the decorator reflection needs
5. **Method bodies use dynamic imports** - This ensures runtime compatibility

## Common Mistakes to Avoid

### ❌ Using `any` types
```typescript
@method async updateValue(newValue: any) { // Don't do this!
```

### ❌ Wrapping already-typed values
```typescript
@method async updateValue(newValue: Field) {
  // newValue is already a Field, don't wrap it!
  const wrapped = DynamicField(newValue); // This causes errors
}
```

### ❌ Using only dynamic imports
```typescript
// This won't work - TypeScript can't determine parameter types
const { Field } = await import('../../../../index.js');
@method async updateValue(newValue: Field) { // Field is undefined here
```

### ✅ Correct pattern
```typescript
import { Field } from '../../../../index.js'; // Static for types

export const test = async () => {
  const { Field: DynamicField } = await import('../../../../index.js'); // Dynamic for runtime
  
  class Contract extends SmartContract {
    @method async updateValue(newValue: Field) { // Static type
      // Use dynamic types in body
      const result = (newValue as any).add(DynamicField(1));
    }
  }
};
```

## Why This Works

1. TypeScript sees the static imports and generates correct metadata
2. The decorator can read the proper type information
3. At runtime, we use dynamic imports which work with our test infrastructure
4. Module format conflicts are avoided by keeping static imports minimal

This pattern allows us to use TypeScript's powerful decorator system while maintaining compatibility with our complex test infrastructure that supports backend switching and parallel execution.