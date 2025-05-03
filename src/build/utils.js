/**
 * utils.js - Utility functions for o1js build scripts
 *
 * This module provides common utility functions that are used by various
 * build scripts in the o1js project.
 */

import fse from 'fs-extra';

export { copyFromTo };

/**
 * Copies files or directories from source to target locations
 *
 * This function takes an array of source paths and copies each one to a
 * corresponding target path. The target path is determined by replacing
 * the srcDir prefix with the targetDir prefix in the source path.
 *
 * @param {string[]} files - Array of source file/directory paths to copy
 * @param {string} [srcDir=undefined] - Source directory prefix to replace
 * @param {string} [targetDir=undefined] - Target directory prefix to insert
 * @returns {Promise<void[]>} A promise that resolves when all copy operations 
 *                            complete
 *
 * @example
 * // Copy one directory, replacing a prefix
 * copyFromTo(['src/bindings/compiled/node_bindings/'], 
 *           'node_bindings', '_node_bindings')
 *
 * @example
 * // Copy multiple files from src to dist
 * copyFromTo(['src/file1.js', 'src/file2.js'], 'src/', 'dist/')
 */
function copyFromTo(files, srcDir = undefined, targetDir = undefined) {
  return Promise.all(
    files.map((source) => {
      let target = source.replace(srcDir, targetDir);
      return fse.copy(source, target, {
        recursive: true,  // Copy directories recursively
        overwrite: true,  // Overwrite existing files
        dereference: true, // Follow symbolic links
      });
    })
  );
}
