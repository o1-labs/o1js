import fs from 'node:fs/promises';
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
  let copyPromise = copy({
    './src/node_bindings/': './dist/server/node_bindings/',
    './src/snarky.node.js': './dist/server/snarky.js',
    './src/snarky.d.ts': './dist/server/snarky.d.ts',
    './src/snarky-class-spec.json': './dist/server/snarky-class-spec.json',
  });
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
    target: 'esnext',
    external: ['*.bc.js'],
    resolveExtensions: ['.node.js', '.ts', '.js'],
    allowOverwrite: true,
    plugins: [makeNodeModulesExternal()],
    minify: !!production,
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

function copy(copyMap) {
  let promises = [];
  for (let [source, target] of Object.entries(copyMap)) {
    promises.push(
      fs.cp(source, target, {
        recursive: true,
        force: true,
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
