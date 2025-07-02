#!/usr/bin/env node

/**
 * Test Cleanup Analysis and Execution Script
 * 
 * Analyzes the 60+ floating test files and categorizes them for cleanup.
 * Provides recommendations for deletion vs preservation.
 */

import fs from 'fs';
import path from 'path';

const FLOATING_TEST_PATTERNS = [
  'test-*.mjs',
  'test-*.js', 
  'debug-*.mjs',
  'debug-*.js'
];

const PRESERVE_FILES = [
  // Key diagnostic files that provide unique insights
  'test-backend-routing.mjs', // Identifies the critical routing bug
  'debug-vk-generation.mjs', // Comprehensive VK analysis
  'test-constraint-comparison.mjs', // Good constraint analysis template
  'test-sparky-basic.mjs', // Clean Sparky validation pattern
];

const CATEGORIES = {
  VK_PARITY: [
    'test-vk-parity.mjs', 'test-vk-parity.js', 'test-vk-parity-esm.mjs',
    'test-vk-parity-fixed.mjs', 'test-vk-parity-quick.mjs', 'test-real-vk-parity.mjs',
    'test-vk-detailed-comparison.mjs', 'test-vk-generation-fixed.mjs', 'test-vk-verification.mjs'
  ],
  BACKEND_SWITCHING: [
    'debug-backend-switching.mjs', 'test-backend-routing.mjs', 'test-backend-selection.mjs',
    'test-mode-verification.mjs', 'test-ocaml-backend-detection.mjs', 'debug-backend-switch.js'
  ],
  CONSTRAINT_ANALYSIS: [
    'test-constraint-comparison.mjs', 'test-constraint-comparison-detailed.mjs',
    'test-constraint-analysis.mjs', 'test-constraint-structure.mjs', 'test-constraint-direct.mjs',
    'test-constraint-proper.mjs', 'test-constraint-recording.mjs', 'test-constraint-persistence.mjs',
    'test-constraint-flow.mjs', 'test-constraint-internal-flow.mjs', 'test-constraint-final.mjs',
    'test-constraint-success.mjs', 'test-constraint-export.mjs', 'test-constraint-export-fixed.mjs',
    'test-constraint-json.mjs', 'test-constraint-json-detailed.mjs', 'test-constraint-field.mjs',
    'test-constraint-optimization.mjs', 'test-constraint-system-state.mjs', 'test-constraint-count.cjs',
    'test-constraint-persistence-verification.mjs', 'test-constraint-mismatch-root-cause.mjs'
  ],
  SPARKY_TESTING: [
    'test-sparky-basic.mjs', 'test-sparky-simple.js', 'test-sparky-debug.mjs', 'test-sparky-debug.js',
    'test-sparky-field-methods.mjs', 'test-sparky-missing-methods.mjs', 'test-sparky-constraints-fixed.mjs',
    'test-sparky-constraints-witness.mjs', 'test-sparky-conversions.js'
  ],
  DEBUG_CONSTRAINT: [
    'debug-constraint-bridge.mjs', 'debug-constraint-fix.mjs', 'debug-constraint-format.mjs',
    'debug-constraint-system.mjs', 'debug-constraint-systems.mjs', 'debug-constraint-bridge.js'
  ],
  DEBUG_SPARKY: [
    'debug-sparky-constraints.mjs', 'debug-sparky-mode.mjs', 'debug-sparky-field.mjs',
    'debug-sparky-available.js', 'debug-sparky-cs.js'
  ],
  DEBUG_VK: [
    'debug-vk-generation.mjs', 'debug-vk-investigation.mjs'
  ],
  OPTIMIZATION: [
    'test-optimization-results.mjs', 'test-final-optimization-check.mjs', 'test-debug-optimization.mjs'
  ],
  GATE_FORMAT: [
    'test-gate-format.mjs', 'test-gate-format-comparison.mjs'
  ],
  MISC_TESTS: [
    'test-endianness-analysis.mjs', 'test-simplified-poseidon.js', 'test-snarky-encoding.mjs',
    'test-ffi-backend.js', 'test-pickles-integration.mjs', 'test-coefficient-analysis.mjs',
    'test-compilation-constraints.mjs', 'test-zkprogram-vs-provable.mjs', 'test-direct-constraint-system.mjs'
  ]
};

async function analyzeFloatingTests() {
  console.log('🔍 ANALYZING FLOATING TEST FILES');
  console.log('='.repeat(50));

  const rootDir = '.';
  const allFiles = fs.readdirSync(rootDir);
  
  // Find all floating test files
  const floatingTests = allFiles.filter(file => {
    return FLOATING_TEST_PATTERNS.some(pattern => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(file);
    });
  });

  console.log(`Found ${floatingTests.length} floating test files\n`);

  // Categorize files
  const categorized = {};
  const uncategorized = [];

  for (const [category, files] of Object.entries(CATEGORIES)) {
    categorized[category] = files.filter(file => floatingTests.includes(file));
  }

  // Find uncategorized files
  const allCategorized = Object.values(CATEGORIES).flat();
  floatingTests.forEach(file => {
    if (!allCategorized.includes(file)) {
      uncategorized.push(file);
    }
  });

  // Print analysis
  console.log('📊 CATEGORIZATION RESULTS:');
  console.log('-'.repeat(30));
  
  for (const [category, files] of Object.entries(categorized)) {
    if (files.length > 0) {
      console.log(`\n${category} (${files.length} files):`);
      files.forEach(file => {
        const preserve = PRESERVE_FILES.includes(file);
        console.log(`  ${preserve ? '📌' : '🗑️ '} ${file} ${preserve ? '(PRESERVE)' : '(DELETE)'}`);
      });
    }
  }

  if (uncategorized.length > 0) {
    console.log(`\nUNCATEGORIZED (${uncategorized.length} files):`);
    uncategorized.forEach(file => console.log(`  ❓ ${file}`));
  }

  // Generate cleanup recommendations
  console.log('\n🧹 CLEANUP RECOMMENDATIONS:');
  console.log('='.repeat(50));
  
  const toDelete = floatingTests.filter(file => !PRESERVE_FILES.includes(file));
  const toPreserve = floatingTests.filter(file => PRESERVE_FILES.includes(file));
  
  console.log(`📌 PRESERVE (${toPreserve.length} files):`);
  toPreserve.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  console.log(`\n🗑️  DELETE (${toDelete.length} files):`);
  console.log('   (Functionality replaced by new test framework)');
  
  // Group deletions by category for clarity
  for (const [category, files] of Object.entries(categorized)) {
    const deletableInCategory = files.filter(file => !PRESERVE_FILES.includes(file));
    if (deletableInCategory.length > 0) {
      console.log(`\n   ${category}:`);
      deletableInCategory.forEach(file => console.log(`     - ${file}`));
    }
  }

  return { toDelete, toPreserve, floatingTests };
}

async function executeCleanup(dryRun = true) {
  console.log('\n🧹 EXECUTING CLEANUP');
  console.log('='.repeat(50));
  
  const { toDelete } = await analyzeFloatingTests();
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No files will be deleted\n');
    console.log('Files that would be deleted:');
    toDelete.forEach(file => console.log(`  - ${file}`));
    console.log(`\nTotal: ${toDelete.length} files`);
    console.log('\nTo execute actual cleanup, run: node cleanup-tests.mjs --execute');
  } else {
    console.log('\n⚠️  EXECUTING ACTUAL CLEANUP\n');
    
    let deleted = 0;
    let errors = 0;
    
    for (const file of toDelete) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`✅ Deleted: ${file}`);
          deleted++;
        } else {
          console.log(`⚠️  Not found: ${file}`);
        }
      } catch (error) {
        console.log(`❌ Error deleting ${file}: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n📊 CLEANUP SUMMARY:');
    console.log(`  Deleted: ${deleted} files`);
    console.log(`  Errors: ${errors} files`);
    console.log(`  Success rate: ${((deleted / toDelete.length) * 100).toFixed(1)}%`);
  }
}

async function createPreservationArchive() {
  console.log('\n📦 CREATING PRESERVATION ARCHIVE');
  console.log('='.repeat(50));
  
  const archiveDir = './test-archive';
  
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir);
    console.log(`Created archive directory: ${archiveDir}`);
  }
  
  // Copy preserved files to archive with analysis
  for (const file of PRESERVE_FILES) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const archivePath = path.join(archiveDir, file);
      
      // Add header with analysis
      const header = `/*
 * PRESERVED TEST FILE: ${file}
 * 
 * PRESERVATION REASON: ${getPreservationReason(file)}
 * ORIGINAL PATH: ./${file}
 * ARCHIVED: ${new Date().toISOString()}
 * 
 * This file was preserved during test cleanup as a reference for
 * understanding the constraint routing bug and backend switching issues.
 */

`;
      
      fs.writeFileSync(archivePath, header + content);
      console.log(`📦 Archived: ${file} -> ${archivePath}`);
    }
  }
  
  // Create README for archive
  const readmeContent = `# Test Archive

This directory contains preserved test files from the floating test cleanup.

## Preserved Files

${PRESERVE_FILES.map(file => `- **${file}**: ${getPreservationReason(file)}`).join('\n')}

## Context

These files were preserved during the systematic cleanup of 60+ floating test files
that were replaced by the new consolidated test framework in \`src/test/\`.

The preserved files contain unique insights into the constraint routing bug and
backend switching infrastructure that are valuable for future debugging.

## Date

Archived: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(path.join(archiveDir, 'README.md'), readmeContent);
  console.log('📝 Created archive README.md');
}

function getPreservationReason(file) {
  const reasons = {
    'test-backend-routing.mjs': 'Identifies critical globalThis.__snarky routing bug',
    'debug-vk-generation.mjs': 'Comprehensive VK analysis with detailed diagnostics',
    'test-constraint-comparison.mjs': 'Good template for constraint system analysis',
    'test-sparky-basic.mjs': 'Clean Sparky validation pattern'
  };
  return reasons[file] || 'Unique diagnostic insights';
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const archive = args.includes('--archive');
  
  if (archive) {
    await createPreservationArchive();
  } else if (execute) {
    await executeCleanup(false);
  } else {
    await analyzeFloatingTests();
    console.log('\n💡 NEXT STEPS:');
    console.log('  1. Review the analysis above');
    console.log('  2. Create archive: node cleanup-tests.mjs --archive');
    console.log('  3. Execute cleanup: node cleanup-tests.mjs --execute');
  }
}

main().catch(console.error);