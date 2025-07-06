// Simple test to examine VK behavior without full execution
import { execSync } from 'child_process';

console.log('=== Simple VK Test Analysis ===\n');

try {
  // Test 1: Check if we can run any sparky tests
  console.log('1. Testing Sparky test infrastructure...');
  
  try {
    const result = execSync('npm run test:sparky-smoke 2>&1', { 
      timeout: 60000,
      encoding: 'utf8',
      cwd: '/home/fizzixnerd/src/o1labs/o1js2'
    });
    console.log('   Sparky smoke tests result:');
    console.log('   ' + result.slice(-200) + '...(truncated)');
  } catch (error) {
    console.log('   Sparky smoke tests failed:', error.message.slice(0, 200));
  }
  
  // Test 2: Check if we can run the VK digest tests specifically
  console.log('\n2. Testing VK digest suite...');
  
  try {
    const result = execSync('node dist/node/test/sparky/run-parallel-tests.js --verbose --tier integration --suite vk-digest 2>&1', { 
      timeout: 120000,
      encoding: 'utf8',
      cwd: '/home/fizzixnerd/src/o1labs/o1js2'
    });
    console.log('   VK digest test result:');
    console.log('   ' + result.slice(-300));
  } catch (error) {
    console.log('   VK digest tests failed:', error.message.slice(0, 300));
  }
  
  // Test 3: Search for existing VK hash comparison results in files
  console.log('\n3. Searching for existing VK hash results...');
  
  try {
    const grepResult = execSync('find . -name "*.md" -exec grep -l "hash.*match\\|VK.*hash\\|verification.*key.*hash" {} \\; 2>/dev/null | head -5', {
      encoding: 'utf8',
      cwd: '/home/fizzixnerd/src/o1labs/o1js2'
    });
    console.log('   Files with VK hash information:');
    console.log('   ' + grepResult);
  } catch (error) {
    console.log('   No VK hash files found:', error.message);
  }
  
  // Test 4: Check test logs or reports
  console.log('\n4. Checking for test report files...');
  
  try {
    const findResult = execSync('find . -name "*test*" -name "*.log" -o -name "*report*" -o -name "*result*" | grep -v node_modules | head -10', {
      encoding: 'utf8',
      cwd: '/home/fizzixnerd/src/o1labs/o1js2'
    });
    console.log('   Test-related files found:');
    console.log('   ' + findResult);
  } catch (error) {
    console.log('   No test report files found');
  }
  
} catch (error) {
  console.error('Test analysis failed:', error.message);
}

console.log('\n=== Test Analysis Complete ===');