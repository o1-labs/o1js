# Build System Updates for Sparky Integration

## Summary

The build system has been updated to automatically copy Sparky WASM artifacts during the build process, eliminating the need for manual file copying.

## Changes Made

### 1. `src/build/copy-artifacts.js`
Added automatic copying of Sparky WASM artifacts from the compiled directories:
- Copies `sparky_node` bindings for Node.js environment
- Copies `sparky_web` bindings for browser environment
- Gracefully handles missing files with informative messages

### 2. `src/build/copy-to-dist.js`
Updated to copy Sparky files to the dist directory:
- Copies compiled Sparky bindings (both node and web)
- Copies the `sparky-adapter.js` file
- Uses try-catch to continue build if Sparky files don't exist

### 3. `src/build/build-web.js`
Added Sparky support for web builds:
- Copies Sparky web bindings to `dist/web/sparky_web/`
- Copies `sparky-adapter.js` to web distribution
- Handles missing files gracefully

### 4. `src/bindings.web.js`
Updated to support backend switching in web environments:
- Added same backend switching API as Node.js version
- Supports `switchBackend()` and `getCurrentBackend()` functions
- Maintains compatibility with existing web applications

### 5. `src/bindings/sparky-adapter.js`
Fixed top-level await issue:
- Replaced top-level await with lazy initialization
- Added `initializeSparky` export for explicit initialization
- Ensures compatibility with CommonJS builds

## Build Process

The updated build process now:

1. **During `npm run build:update-bindings`**: Builds Sparky WASM from source
2. **During `npm run build`**: 
   - Copies Sparky artifacts to appropriate locations
   - Handles both Node.js and web targets
   - Continues build even if Sparky files are missing

## Usage

No changes required for developers. The build system automatically handles Sparky files:

```bash
# Build everything including Sparky
npm run build:update-bindings
npm run build

# Or just build o1js (Sparky files copied if they exist)
npm run build
```

## Testing

The backend switching test confirms the build system works correctly:

```bash
node test-backend-switching-simple.js
```

## Benefits

1. **Automatic**: No manual file copying required
2. **Robust**: Build continues even without Sparky files
3. **Complete**: Handles both Node.js and web environments
4. **Transparent**: No changes to existing build commands

## Next Steps

The build system is now fully integrated with Sparky. Developers can:
- Build and use Sparky backend without manual steps
- Switch between backends at runtime
- Deploy web applications with backend switching support