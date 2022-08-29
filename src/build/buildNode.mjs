import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import esbuild from 'esbuild';
import minimist from 'minimist';

let { bindings = './src/node_bindings/' } = minimist(process.argv.slice(2));

export { buildNode };

const entry = './src/index.ts';
const target = 'es2021';

let nodePath = path.resolve(process.argv[1]);
let modulePath = path.resolve(fileURLToPath(import.meta.url));
let isMain = nodePath === modulePath;

if (isMain) {
  console.log('building cjs version of', entry);
  console.log('using bindings from', bindings);
  await buildNode({ production: process.env.NODE_ENV === 'production' });
  console.log('finished build');
}

async function buildNode({ production }) {
  // bundle the index.js file with esbuild and create a new index.cjs file which conforms to CJS
  let jsEntry = path.resolve(
    'dist/node',
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
    minify: false,
  });
}

function makeNodeModulesExternal() {
  let isNodeModule = /^[^./]|^\.[^./]|^\.\.[^/]/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isNodeModule }, ({ path }) => ({
        path,
        external: true,
      }));
    },
  };
}

function makeJsooExternal() {
  let isJsoo = /bc.cjs$/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isJsoo }, ({ path }) => ({
        path: path.replace('../', './'),
        external: true,
      }));
    },
  };
}

function execPromise(cmd) {
  return new Promise((res, rej) =>
    exec(cmd, (err, stdout) => {
      if (err) {
        console.log(stdout);
        return rej(err);
      }
      res(stdout);
    })
  );
}
