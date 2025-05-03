/**
 * e2e-tests-build-helper.js - Prepares files for E2E testing
 *
 * This script adjusts import paths in compiled JavaScript files before running E2E 
 * tests. It replaces references to the 'o1js' package with relative paths to the 
 * local build, allowing E2E tests to use the current version of the code rather 
 * than an installed package.
 *
 * This script is typically run after compiling examples but before running E2E tests.
 * It modifies files in the ./dist/web/examples/ directory.
 */

import replace from 'replace-in-file';

// Configuration for replacements to make in different file sets
const replaceOptions = [
  // zkapp examples (3 levels deep from index.js)
  {
    files: './dist/web/examples/zkapps/**/*.js',
    from: /from 'o1js'/g,
    to: "from '../../../index.js'",
  },
  // zkprogram examples (2 levels deep from index.js)
  {
    files: './dist/web/examples/zkprogram/*.js',
    from: /from 'o1js'/g,
    to: "from '../../index.js'",
  },
];

/**
 * Performs a single replacement operation on a set of files
 *
 * @param {Object} options - Options for the replacement (files, from, to)
 * @returns {Promise<void>} A promise that resolves when the replacement is complete
 */
async function performReplacement(options) {
  try {
    const results = await replace(options);
    console.log(`Replacement results for ${options.files}:`, results);
  } catch (error) {
    console.error(`Error occurred while replacing in ${options.files}:`, error);
  }
}

/**
 * Main function that processes all replacement operations
 */
async function main() {
  for (const options of replaceOptions) {
    await performReplacement(options);
  }
}

// Execute the replacements
main();
