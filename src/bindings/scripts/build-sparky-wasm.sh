#!/usr/bin/env bash

# Build Sparky WASM bindings and copy to o1js

set -e

SPARKY_PATH="src/sparky"
SPARKY_WASM_PATH="$SPARKY_PATH/sparky-wasm"
SPARKY_BINDINGS_WEB="src/bindings/compiled/sparky_web"
SPARKY_BINDINGS_NODE="src/bindings/compiled/sparky_node"

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack not found. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build Sparky WASM for web
echo "Building Sparky WASM for web..."
pushd "$SPARKY_WASM_PATH"
    wasm-pack build --target web --out-dir pkg-web
popd

# Build Sparky WASM for Node.js (CommonJS)
echo "Building Sparky WASM for Node.js..."
pushd "$SPARKY_WASM_PATH"
    wasm-pack build --target nodejs --out-dir pkg-node
popd

# Create directories if they don't exist
mkdir -p "$SPARKY_BINDINGS_WEB"
mkdir -p "$SPARKY_BINDINGS_NODE"

# Copy web bindings
echo "Copying web bindings..."
cp "$SPARKY_WASM_PATH"/pkg-web/*.js "$SPARKY_BINDINGS_WEB"/
cp "$SPARKY_WASM_PATH"/pkg-web/*.wasm "$SPARKY_BINDINGS_WEB"/
cp "$SPARKY_WASM_PATH"/pkg-web/*.ts "$SPARKY_BINDINGS_WEB"/ 2>/dev/null || true
cp "$SPARKY_WASM_PATH"/pkg-web/*.d.ts "$SPARKY_BINDINGS_WEB"/ 2>/dev/null || true

# Copy Node.js bindings
echo "Copying Node.js bindings..."
# Copy the nodejs target file directly (it's already in CommonJS format)
cp "$SPARKY_WASM_PATH"/pkg-node/sparky_wasm.js "$SPARKY_BINDINGS_NODE/sparky_wasm.cjs"
cp "$SPARKY_WASM_PATH"/pkg-node/*.wasm "$SPARKY_BINDINGS_NODE"/
cp "$SPARKY_WASM_PATH"/pkg-node/*.ts "$SPARKY_BINDINGS_NODE"/ 2>/dev/null || true
cp "$SPARKY_WASM_PATH"/pkg-node/*.d.ts "$SPARKY_BINDINGS_NODE"/ 2>/dev/null || true

# Function to convert ES modules to CommonJS
convert_es_to_cjs() {
    local input_file="$1"
    local output_file="$2"
    
    echo "Converting ES module to CommonJS: $input_file -> $output_file"
    
    # Start with the original file
    cp "$input_file" "$output_file"
    
    # Convert export function to module.exports.function
    sed -i 's/^export function \([^(]*\)/module.exports.\1 = function/g' "$output_file"
    
    # Convert export class to class (we'll add exports later)
    sed -i 's/^export class /class /g' "$output_file"
    
    # Remove all export statements at the end of the file
    sed -i '/^export { .* };$/d' "$output_file"
    sed -i '/^export default /d' "$output_file"
    sed -i '/^export {/d' "$output_file"
    
    # Fix import.meta.url references
    sed -i "s/new URL('sparky_wasm_bg.wasm', import.meta.url)/require('path').join(__dirname, 'sparky_wasm_bg.wasm')/g" "$output_file"
    
    # Add CommonJS initialization and exports at the end
    cat >> "$output_file" << 'EOF'

// CommonJS initialization
const imports = __wbg_get_imports();
const path = require('path').join(__dirname, 'sparky_wasm_bg.wasm');
const bytes = require('fs').readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

// Export all classes
module.exports.ModeHandle = ModeHandle;
module.exports.PoseidonCompat = PoseidonCompat;
module.exports.RunState = RunState;
module.exports.Snarky = Snarky;
module.exports.SnarkyConstraintSystemCompat = SnarkyConstraintSystemCompat;
module.exports.SnarkyFieldCompat = SnarkyFieldCompat;
module.exports.SnarkyGatesCompat = SnarkyGatesCompat;
module.exports.SnarkyRunCompat = SnarkyRunCompat;
module.exports.SparkyRunState = SparkyRunState;
EOF
}

# Copy Node.js bindings directly to _node_bindings for compatibility
echo "Copying Node.js bindings to _node_bindings..."
cp "$SPARKY_WASM_PATH"/pkg-node/sparky_wasm.js src/bindings/compiled/_node_bindings/sparky_wasm.cjs
cp "$SPARKY_WASM_PATH"/pkg-node/*.wasm src/bindings/compiled/_node_bindings/
cp "$SPARKY_WASM_PATH"/pkg-node/*.ts src/bindings/compiled/_node_bindings/ 2>/dev/null || true
cp "$SPARKY_WASM_PATH"/pkg-node/*.d.ts src/bindings/compiled/_node_bindings/ 2>/dev/null || true

# Make files readable
chmod -R 666 "$SPARKY_BINDINGS_WEB"/*
chmod -R 666 "$SPARKY_BINDINGS_NODE"/*

echo "Sparky WASM build complete!"

# Update SPARKY_COMMIT file
if [ -z "${SKIP_SPARKY_COMMIT}" ]; then
    SPARKY_COMMIT=$(git -C "$SPARKY_PATH" rev-parse HEAD)
    echo "The sparky commit used to generate the WASM bindings is $SPARKY_COMMIT" > src/bindings/SPARKY_COMMIT
fi