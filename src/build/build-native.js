import fse, { move } from 'fs-extra';
import path from 'node:path';
import { platform } from 'node:process';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import minimist from 'minimist';

let { bindings = './src/bindings/compiled/native_bindings/' } = minimist(
  process.argv.slice(2)
);

export { buildNative };

const entry = './src/index.ts';
const target = 'es2021';

let nodePath = path.resolve(process.argv[1]);
let modulePath = path.resolve(fileURLToPath(import.meta.url));
let isMain = nodePath === modulePath;

if (isMain) {
  console.log('building cjs version of', entry, '(native)');
  console.log('using native bindings from', bindings);
  await buildNative({ production: process.env.NODE_ENV === 'production' });
  console.log('finished build (native)');
}

async function buildNative({ production }) {
  let jsEntry = path.resolve(
    'dist/native',
    path.basename(entry).replace('.ts', '.js')
  );

  let outfile = jsEntry.replace('.js', '.cjs');

  await esbuild.build({
    entryPoints: [jsEntry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile,
    target,
    resolveExtensions: ['.node.js', '.ts', '.js'],
    allowOverwrite: true,
    plugins: [makeNodeModulesExternal(), makeJsooExternal()],
    dropLabels: ['ESM'],
    minify: !!production,
  });
}

function makeNodeModulesExternal() {
  let isNodeModule = /^[^./\\]|^\.[^./\\]|^\.\.[^/\\]/;

  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isNodeModule }, ({ path: importPath }) => ({
        path: importPath,
        external: !(platform === 'win32' && importPath.endsWith('index.js')),
      }));
    },
  };
}
function makeJsooExternal() {
  let isJsoo = /(bc.cjs)$/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isJsoo }, ({ path: filePath, resolveDir }) => ({
        path:
          './' +
          path.relative(
            path.resolve('.', 'dist/native'),
            path.resolve(resolveDir, filePath)
          ),
        external: true,
      }));
    },
  };
}
async function copy(copyMap) {
  let promises = [];
  for (let [source, target] of Object.entries(copyMap)) {
    promises.push(
      fse.copy(source, target, {
        recursive: true,
        overwrite: true,
        dereference: true,
      })
    );
  }
  await Promise.all(promises);
}
