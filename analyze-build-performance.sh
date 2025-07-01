#!/bin/bash

echo "=== Build Performance Analysis for o1js2 ==="
echo ""

# Function to time a command
time_command() {
    local name="$1"
    local cmd="$2"
    echo -n "Timing $name... "
    start=$(date +%s.%N)
    eval "$cmd" > /dev/null 2>&1
    end=$(date +%s.%N)
    duration=$(echo "$end - $start" | bc)
    echo "$duration seconds"
}

# Step 1: Check for bindings
time_command "checkForBindings" "npm run checkForBindings"

# Step 2: Copy artifacts
time_command "copy-artifacts" "node src/build/copy-artifacts.js"

# Step 3: TypeScript compilation
time_command "TypeScript compilation" "npx tsc -p tsconfig.test.json"

# Step 4: Copy to dist
time_command "copy-to-dist" "node src/build/copy-to-dist.js"

# Step 5: Build node bundle
time_command "build-node bundle" "node src/build/build-node.js"

echo ""
echo "=== Additional Analysis ==="

# Check directory sizes
echo "Compiled bindings size: $(du -sh src/bindings/compiled/ 2>/dev/null | cut -f1)"
echo "Sparky target size: $(du -sh src/sparky/target/ 2>/dev/null | cut -f1 || echo 'N/A')"
echo "TypeScript files to compile: $(find src -name '*.ts' -not -path '*/examples/*' -not -path '*/build/*' -not -path '*/mina/*' | wc -l)"
echo "Total TypeScript size: $(find src -name '*.ts' -not -path '*/examples/*' -not -path '*/build/*' -not -path '*/mina/*' -exec ls -l {} + | awk '{sum += $5} END {printf "%.2f MB\n", sum/1024/1024}')"

# Check for large generated files
echo ""
echo "Large files in dist (if exists):"
find dist -type f -size +1M 2>/dev/null | xargs ls -lh 2>/dev/null | head -10 || echo "No dist directory yet"