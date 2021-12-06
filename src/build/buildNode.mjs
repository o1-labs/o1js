import fs from 'node:fs/promises';
import fse from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import esbuild from 'esbuild';

export { buildNode };

let nodePath = path.resolve(process.argv[1]);
let modulePath = path.resolve(fileURLToPath(import.meta.url));
let isMain = nodePath === modulePath;

if (isMain) {
  let entry = process.argv[2] ?? './src/index.ts';
  console.log('building', entry);
  let production = process.env.NODE_ENV === 'production';
  await buildNode({ entry, production });
}

async function buildNode({ entry, production }) {
  let minify = !!production;

  // copy over files not processed by TS
  let copyPromise = copy({
    './src/node_bindings/': './dist/server/node_bindings/',
    './src/snarky.node.js': './dist/server/snarky.js',
    './src/proxyClasses.js': './dist/server/proxyClasses.js',
    './src/snarky.d.ts': './dist/server/snarky.d.ts',
    './src/snarky-class-spec.json': './dist/server/snarky-class-spec.json',
  });

  if (minify) {
    let snarkyJsPath = './dist/server/node_bindings/snarky_js_node.bc.js';
    let snarkyJs = await fs.readFile(snarkyJsPath, 'utf8');
    let { code } = await esbuild.transform(snarkyJs, {
      target: 'es2021',
      logLevel: 'error',
      minify,
    });
    await fs.writeFile(snarkyJsPath, code);
  }

  // invoke TS to recreate .ts files as .js + d.ts in /dist/server
  let json = JSON.stringify({
    extends: './tsconfig.json',
    include: [entry],
    compilerOptions: {
      outDir: 'dist/server',
    },
  });
  await fs.writeFile('./tsconfig.server-tmp.json', json);
  let tscPromise = execPromise('npx tsc -p tsconfig.server-tmp.json').then(() =>
    fs.unlink('./tsconfig.server-tmp.json')
  );
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
    target: 'es2021',
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

  console.log('finished build');
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
  return new Promise((r) =>
    exec(cmd, (_, stdout) => {
      r(stdout);
    })
  );
}
