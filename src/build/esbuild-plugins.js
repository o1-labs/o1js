import { platform } from 'node:process';
import path from 'node:path';

export { makeNodeModulesExternal, makeJsooExternal, makeO1jsExternal };

function makeNodeModulesExternal() {
  let isNodeModule = /^[^./\\]|^\.[^./\\]|^\.\.[^/\\]/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isNodeModule }, ({ path }) => ({
        path,
        external: !(platform === 'win32' && path.endsWith('index.js')),
      }));
    },
  };
}

function makeJsooExternal(options = {}) {
  let isJsoo = /(bc.cjs|plonk_wasm.cjs)$/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isJsoo }, ({ path: filePath, resolveDir }) => {
        const resolvedPath = path.resolve(resolveDir, filePath);
        return {
          path: options.useRelativePath
            ? './' + path.relative(path.resolve('.', 'dist/node'), resolvedPath)
            : resolvedPath,
          external: true,
        };
      });
    },
  };
}

function makeO1jsExternal() {
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: /^o1js$/ }, () => ({
        path: './index.js',
        external: true,
      }));
    },
  };
}
