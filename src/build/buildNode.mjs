import fs from 'node:fs/promises';
import fse from 'fs-extra';
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
  console.log('building', entry);
  console.log('using bindings from', bindings);
  await buildNode({ production: process.env.NODE_ENV === 'production' });
  console.log('finished build');
}

async function buildNode({ production }) {
  let minify = !!production;

  // copy over files not processed by TS
  let copyPromise = copy({
    [bindings]: './dist/server/node_bindings/',
    './src/snarky.d.ts': './dist/server/snarky.d.ts',
    ...Object.fromEntries(
      (await fs.readdir('./src/snarky/'))
        .filter(
          (f) => f.endsWith('.js') || f.endsWith('.json') || f.endsWith('.d.ts')
        )
        .map((f) => [`./src/snarky/${f}`, `./dist/server/snarky/${f}`])
    ),
  });

  if (minify) {
    let snarkyJsPath = './dist/server/node_bindings/snarky_js_node.bc.js';
    let snarkyJs = await fs.readFile(snarkyJsPath, 'utf8');
    let { code } = await esbuild.transform(snarkyJs, {
      target,
      logLevel: 'error',
      minify,
    });
    await fs.writeFile(snarkyJsPath, code);
  }

  // invoke TS to recreate .ts files as .js + d.ts in /dist/server
  let tscPromise = execPromise('npx tsc -p tsconfig.server.json');
  await Promise.all([copyPromise, tscPromise]);

  // bundle the new index.js file with esbuild and create a new index.js file which conforms to CJS
  let jsEntry = path.resolve(
    'dist/server',
    path.basename(entry).replace('.ts', '.js')
  );
  await esbuild.build({
    entryPoints: [jsEntry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: jsEntry,
    target,
    external: ['*.bc.js'],
    resolveExtensions: ['.node.js', '.ts', '.js'],
    allowOverwrite: true,
    plugins: [makeNodeModulesExternal()],
    minify,
  });

  // import the new index.js to get a list of its exports
  // the list of exports is used to create an ESM entry-point index.mjs
  let index = await import('../../dist/server/index.js');
  let exportString = Object.keys(index)
    .filter((x) => x !== 'default')
    .join(', ');
  let indexMjs = await fs.readFile('./src/index.mjs.template', 'utf8');
  indexMjs = indexMjs.replace(/__EXPORTS__/g, exportString);
  await fs.writeFile('./dist/server/index.mjs', indexMjs);
  index.shutdown();
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

function copy(copyMap) {
  let promises = [];
  for (let [source, target] of Object.entries(copyMap)) {
    if (path.resolve(source) === path.resolve(target)) continue;
    promises.push(
      fse.copy(source, target, {
        recursive: true,
        overwrite: true,
        dereference: true,
      })
    );
  }
  return Promise.all(promises);
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
