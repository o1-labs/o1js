// Simple wrapper to run the correctness test with CommonJS imports
const { execSync } = require('child_process');

try {
  // Try to set NODE_OPTIONS to force CommonJS resolution
  process.env.NODE_OPTIONS = '--input-type=module --experimental-loader ./dist/node/index.cjs';
  
  console.log('🔧 Running correctness test with CommonJS resolution...');
  
  // Try a different approach - use the CJS version directly
  const result = execSync('node -r ./dist/node/index.cjs ./dist/node/test/sparky/run-zkprogram-correctness-benchmark.js', {
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: './dist/node' }
  });
  
} catch (error) {
  console.error('Test execution failed:', error.message);
}