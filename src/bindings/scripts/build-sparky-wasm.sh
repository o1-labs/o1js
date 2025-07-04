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
# Copy .js files and rename them to .cjs for ES module compatibility
for file in "$SPARKY_WASM_PATH"/pkg-node/*.js; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .js)
        cp "$file" "$SPARKY_BINDINGS_NODE/${filename}.cjs"
    fi
done
cp "$SPARKY_WASM_PATH"/pkg-node/*.wasm "$SPARKY_BINDINGS_NODE"/
cp "$SPARKY_WASM_PATH"/pkg-node/*.ts "$SPARKY_BINDINGS_NODE"/ 2>/dev/null || true
cp "$SPARKY_WASM_PATH"/pkg-node/*.d.ts "$SPARKY_BINDINGS_NODE"/ 2>/dev/null || true

# Make files readable
chmod -R 666 "$SPARKY_BINDINGS_WEB"/*
chmod -R 666 "$SPARKY_BINDINGS_NODE"/*

echo "Sparky WASM build complete!"

# Update SPARKY_COMMIT file
if [ -z "${SKIP_SPARKY_COMMIT}" ]; then
    SPARKY_COMMIT=$(git -C "$SPARKY_PATH" rev-parse HEAD)
    echo "The sparky commit used to generate the WASM bindings is $SPARKY_COMMIT" > src/bindings/SPARKY_COMMIT
fi