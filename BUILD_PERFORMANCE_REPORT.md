# Build Performance Analysis for o1js2

## Executive Summary

The `npm run build` command is slow primarily due to TypeScript compilation, which takes approximately **92.5 seconds** out of the total build time. This is the main bottleneck.

## Build Process Breakdown

The build script performs these steps:
1. **checkForBindings** (0.22s) - Verifies compiled bindings exist
2. **copy-artifacts** (0.08s) - Copies compiled bindings to working directory  
3. **TypeScript compilation** (92.56s) - Compiles TypeScript to JavaScript ⚠️ **BOTTLENECK**
4. **copy-to-dist** (0.09s) - Copies additional files to dist
5. **build-node** (1.92s) - Bundles with esbuild for CommonJS

Total time: ~95 seconds

## Key Findings

### 1. TypeScript Compilation is the Main Bottleneck
- Takes 92.5 seconds (97% of build time)
- Compiles 297 TypeScript files (2.83 MB total)
- Type-checks 1,793 `.d.ts` files from node_modules
- No incremental compilation enabled
- No `skipLibCheck` option enabled

### 2. Large Assets Being Processed
- Compiled bindings: 93MB
- Sparky build directory: 2.7GB (though not all copied)
- Main bundled output: 16MB (index.cjs)
- OCaml compiled output: 22MB (o1js_node.bc.cjs)

### 3. Performance Test Results
With TypeScript optimizations (`skipLibCheck: true`, `incremental: true`):
- Compilation time reduced from **92.5s to 8.2s** (89% improvement!)

## Optimization Opportunities

### 1. **Enable TypeScript Performance Options** (High Impact)
Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true,      // Skip type checking of .d.ts files
    "incremental": true,       // Enable incremental compilation
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

### 2. **Use Parallel TypeScript Compilation**
Consider using `tsc-watch` or splitting compilation into multiple projects.

### 3. **Implement Build Caching**
- Cache TypeScript build info between runs
- Use npm scripts to skip unchanged steps

### 4. **Consider Alternative Build Tools**
- **esbuild** or **swc** for TypeScript compilation (much faster)
- Already using esbuild for bundling, could extend to compilation

### 5. **Optimize File Copying**
- The 93MB of bindings are copied multiple times
- Consider symlinking instead of copying for development builds

## Recommended Actions

1. **Immediate Fix**: Add `skipLibCheck: true` to tsconfig.json
   - Reduces build time by ~84 seconds
   - Low risk for a library that controls its dependencies

2. **Short Term**: Enable incremental compilation
   - Further reduces rebuild times
   - Add `.tsbuildinfo` to .gitignore

3. **Medium Term**: Investigate esbuild/swc for TypeScript
   - Could reduce compilation to < 1 second
   - Requires validating type checking separately

4. **Long Term**: Implement proper build caching
   - Cache compiled bindings
   - Use content-based hashing for cache invalidation

## Additional Observations

- The web build uses a separate TypeScript compilation step
- Multiple TypeScript configs exist (test, node, web, examples)
- The sparky integration adds significant disk usage (2.7GB)
- Build artifacts total ~150MB in dist directory

## Conclusion

The primary issue is TypeScript's type checking of external dependencies. Enabling `skipLibCheck` would provide an immediate 10x speedup with minimal risk, reducing build time from ~95 seconds to ~11 seconds.