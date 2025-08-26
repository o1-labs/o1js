# o1js TypeScript Framework for zk-SNARKs and zkApps

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap Requirements
- Node.js 18.14.0+ (current tested: v20.19.4)
- npm 10+ (current tested: 10.8.2) 
- GitHub CLI (`gh`) for downloading pre-compiled artifacts
- Git with submodules support

### Initial Setup
Always run these commands first on a fresh clone:
```bash
# Initialize git submodules (NEVER CANCEL - takes 3-5 minutes)
GIT_LFS_SKIP_SMUDGE=1 git submodule update --init --recursive

# Install dependencies (18 seconds)
npm install
```

### Core Build Process
**CRITICAL**: o1js requires pre-compiled OCaml and Rust bindings that are only available from CI builds or main branch commits where artifacts exist.

**For External Contributors:**
```bash
# This will FAIL without GitHub authentication
npm run build

# Error message indicates you need to:
# - Switch to a commit where bindings have been built (main branch)
# - Trigger remote build: npm run build:bindings-remote
# - Open a PR to run CI
```

**Build Commands and Timing:**
- `npm install` -- 18 seconds
- `npm run build` -- **REQUIRES GITHUB AUTH AND ARTIFACTS** or will fail
- `npm run build:bindings-download` -- **REQUIRES GITHUB AUTH** to download CI artifacts
- `npm run dev` -- **REQUIRES EXISTING BINDINGS** - fails without them (~13 seconds when working)

### Validation Commands (Work Without Full Build)

**Linting and Formatting:**
```bash
# Run linter (works independently - 2 seconds)
npm run lint
# Shows 418 warnings, 3 errors currently - this is normal

# Check TypeScript/JavaScript format (specify files)
npx prettier --check --ignore-unknown "src/**/*.ts"

# Check markdown formatting (1.4 seconds)
npm run format:md:check

# Clean build artifacts (0.3 seconds) 
npm run clean
```

**Mina-Signer Subpackage (WORKS INDEPENDENTLY):**
```bash
cd src/mina-signer

# Install dependencies (2 seconds)
npm install

# Build successfully (5 seconds)
npm run build

# Run full test suite (30 seconds - 6 test suites, 73 tests pass)
npm test
```

### Test Commands
**CRITICAL**: Most tests require a full build first and will FAIL without bindings.

**Working Tests:**
```bash
# Mina-signer tests (from src/mina-signer/)
npm test  # 30 seconds, all tests pass

# Main project tests - REQUIRE FULL BUILD:
npm run test:unit     # FAILS - needs build
npm run test:integration  # FAILS - needs build  
npm run test:e2e      # FAILS - needs build
```

### CI Validation Commands
Always run these before committing changes:
```bash
# Format check (works without build)
npm run format:md:check

# Lint check (works without build) 
npm run lint

# NOTE: Most CI checks require the full build process with artifacts
```

## Build Timeouts and Timing Expectations

**NEVER CANCEL these operations** - Set timeouts appropriately:
- Git submodule init: **5-10 minutes** (set timeout 600+ seconds)
- npm install: **20-60 seconds** (set timeout 120+ seconds)
- Full build (when working): **10-45 minutes** (set timeout 3600+ seconds)
- Unit tests (when working): **15-30 minutes** (set timeout 2400+ seconds)
- Integration tests: **45+ minutes** (set timeout 3600+ seconds)
- E2E tests: **30+ minutes** (set timeout 2400+ seconds)

## Development Workflow

### Making Changes
1. **Always test mina-signer first** if making crypto/signing changes:
   ```bash
   cd src/mina-signer
   npm install && npm run build && npm test
   ```

2. **Use linting to validate syntax** without full build:
   ```bash
   npm run lint
   npm run format:md:check
   ```

3. **For TypeScript compilation testing** (limited):
   ```bash
   # Most files will fail due to missing bindings, but syntax errors will show
   npx tsc --noEmit --skipLibCheck src/examples/simple-zkapp.ts
   ```

### Alternative Build Methods

**Nix Build (if nix available):**
```bash
./pin.sh  # Initialize nix flakes
nix develop o1js#default  # Enter nix shell
npm run build:update-bindings  # Build bindings with nix
```

**Remote Build Trigger:**
```bash
npm run build:bindings-remote  # Trigger self-hosted runner build
```

## Validation Scenarios

### Basic Development Validation
After making changes, always run:
1. `npm run lint` - should complete without new errors
2. `npm run format:md:check` - should pass
3. `cd src/mina-signer && npm test` - if touching crypto/signing code

### Full Validation (Requires Build)
If you have access to bindings/artifacts:
1. `npm run build` - should complete in 10-45 minutes  
2. `npm run test:unit` - should complete in 15-30 minutes
3. Test key examples: `./run src/examples/simple-zkapp.ts --bundle`

### Manual Validation Steps
**ALWAYS** manually test functionality by:
1. Building and running examples in `src/examples/`
2. Testing both Node.js and web builds when applicable
3. Verifying zkApp compilation and proof generation

## Project Structure

### Key Directories
- `src/examples/` - Working examples and demos
  - `src/examples/zkapps/hello-world/` - Basic zkApp example
  - `src/examples/simple-zkapp.ts` - Simple zkApp implementation
- `src/mina-signer/` - **BUILDABLE INDEPENDENTLY** - Transaction signing library
- `src/bindings/` - OCaml/Rust binding interfaces (generated)
  - `src/bindings/compiled/` - Pre-compiled artifacts (from CI)
- `tests/` - End-to-end and integration tests
- `.github/workflows/` - CI/CD pipeline definitions

### Common Tasks Reference

**Repository Root Contents:**
```
.github/          - GitHub workflows and templates  
src/              - Main source code
  examples/       - Working examples and demos
  mina-signer/    - Independent signing library
  bindings/       - OCaml/Rust bindings (requires CI artifacts)
tests/            - Integration and E2E tests
package.json      - Main project dependencies
README*.md        - Documentation files
```

**Build Artifacts:**
- `dist/` - Built JavaScript/TypeScript outputs
- `src/bindings/compiled/` - Pre-compiled OCaml/Rust artifacts
- `node_modules/` - npm dependencies

## Troubleshooting

### Common Issues
- **"bindings have not been built for this commit"** - Need GitHub auth + CI artifacts
- **TypeScript compilation errors** - Usually due to missing bindings, not syntax
- **Test failures** - Most require full build, try mina-signer tests first
- **Long build times** - Normal, NEVER cancel operations

### Working Around Build Issues
1. Use `src/mina-signer` for testing crypto/signing functionality
2. Use linting for syntax validation without full build  
3. Switch to main branch commit with existing artifacts
4. Focus on TypeScript changes that don't require proof system bindings

### CI Pipeline Understanding
- Build jobs run for 210+ minutes with timeouts
- Multiple test matrices run in parallel
- Artifacts are cached per commit SHA
- External contributors cannot trigger CI builds without PR

## NEVER DO
- Cancel long-running build operations
- Skip submodule initialization
- Try to build without bindings or GitHub auth
- Commit without running format:md:check
- Make changes to `src/bindings/compiled/` (auto-generated)