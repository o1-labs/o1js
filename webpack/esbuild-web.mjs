import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

export { buildWeb };

let nodePath = path.resolve(process.argv[1]);
let modulePath = path.resolve(fileURLToPath(import.meta.url));
let isMain = nodePath === modulePath;

if (isMain) {
  let entry = process.argv[2] ?? './src/index.ts';
  console.log('building', entry);
  let production = process.env.NODE_ENV === 'production';
  await buildWeb({ entry, production });
}

async function buildWeb({ entry, production }) {
  let minify = !!production;
  // run esbuild on plonk_wasm.js and create non-module version for worker
  let plonkWasmModified = rewriteWasmBindings(
    await fs.promises.readFile('./src/chrome_bindings/plonk_wasm.js', {
      encoding: 'utf8',
    })
  );
  await fs.promises.writeFile(
    'src/chrome_bindings/plonk_wasm.esbuild.js',
    plonkWasmModified,
    { encoding: 'utf8' }
  );
  await esbuild.build({
    entryPoints: ['./src/chrome_bindings/plonk_wasm.esbuild.js'],
    bundle: true,
    format: 'esm',
    outfile: 'src/chrome_bindings/plonk_wasm.esbuild.js',
    target: 'esnext',
    plugins: [wasmPlugin()],
    allowOverwrite: true,
    minify,
  });
  let plonkWasmBundled = await fs.promises.readFile(
    'src/chrome_bindings/plonk_wasm.esbuild.js',
    { encoding: 'utf8' }
  );
  // strip away trailing export statement
  let plonkWasmWorker = plonkWasmBundled.slice(
    0,
    plonkWasmBundled.indexOf('export {')
  );
  await fs.promises.writeFile(
    'src/chrome_bindings/plonk_wasm.esbuild.worker.js',
    plonkWasmWorker,
    { encoding: 'utf8' }
  );

  // run typescript
  let json = JSON.stringify({
    extends: './tsconfig.json',
    include: [entry],
    compilerOptions: {
      outDir: 'dist/web',
    },
  });
  await fs.promises.writeFile('./tsconfig.web-tmp.json', json);
  await execPromise('npx tsc -p tsconfig.web-tmp.json');
  await execPromise('rm ./tsconfig.web-tmp.json');
  // process.on('SIGINT', async () => {
  //   await execPromise('rm ./tsconfig.web-tmp.json');
  //   process.exit();
  // });

  // copy over pure js files
  copy({
    './src/snarky.js': './dist/web/snarky.js',
    './src/snarky.d.ts': './dist/web/snarky.d.ts',
    './src/chrome_bindings': './dist/web/chrome_bindings/',
  });
  // overwrite plonk_wasm with bundled version
  copy({
    'src/chrome_bindings/plonk_wasm.esbuild.js':
      './dist/web/chrome_bindings/plonk_wasm.js',
  });
  await fs.promises.unlink('src/chrome_bindings/plonk_wasm.esbuild.js');

  // run esbuild on worker_init.js
  await esbuild.build({
    entryPoints: [`./dist/web/chrome_bindings/worker_init.js`],
    bundle: true,
    format: 'esm',
    outfile: 'dist/web/chrome_bindings/worker_init.js',
    target: 'esnext',
    plugins: [wasmPlugin()],
    allowOverwrite: true,
    minify,
  });

  // run esbuild on the js entrypoint
  let jsEntry = path.basename(entry).replace('.ts', '.js');
  await esbuild.build({
    entryPoints: [`./dist/web/${jsEntry}`],
    bundle: true,
    format: 'esm',
    outfile: 'dist/web/index.js',
    resolveExtensions: ['.js', '.ts'],
    plugins: [wasmPlugin(), srcStringPlugin(), deferExecutionPlugin()],
    external: ['*.bc.js'],
    target: 'esnext',
    allowOverwrite: true,
    logLevel: 'error',
    minify,
    // watch: true,
  });

  // copy auxiliary files
  copy({
    './src/chrome_bindings/plonk_wasm.d.ts': './dist/web/plonk_wasm.d.ts',
    './src/chrome_bindings/plonk_wasm_bg.wasm.d.ts':
      './dist/web/plonk_wasm_bg.wasm.d.ts',
    './src/chrome_bindings/index.html': './dist/web/index.html',
    './src/chrome_bindings/server.py': './dist/web/server.py',
    // TODO: remove dependency on this last worker file
    './src/chrome_bindings/plonk_wasm.esbuild.worker.js':
      './dist/web/plonk_wasm.esbuild.worker.js',
  });
}

function copy(copyMap) {
  for (let [source, target] of Object.entries(copyMap)) {
    fs.cpSync(source, target, {
      recursive: true,
      force: true,
      dereference: true,
    });
  }
}

function execPromise(cmd) {
  return new Promise((r) =>
    exec(cmd, (_, stdout) => {
      r(stdout);
    })
  );
}

function rewriteWasmBindings(src) {
  src = src
    .replace("new URL('./plonk_wasm_bg.wasm', import.meta.url)", 'wasmCode')
    .replace('import.meta.url', 'CDN_LOCATION')
    .replace(
      "import { startWorkers } from './snippets/wasm-bindgen-rayon-7afa899f36665473/src/workerHelpers.no-bundler.js';",
      `import { startWorkers } from './snippets/wasm-bindgen-rayon-7afa899f36665473/src/workerHelpers.esbuild.js';
import wasmCode from './plonk_wasm_bg.wasm';
export let CDN_LOCATION = 'https://cdn.jsdelivr.net/gh/o1-labs/snarkyjs@feature/better-web-build/src/chrome_bindings/plonk_wasm.esbuild.worker.js';
`
    );
  // export let CDN_LOCATION = 'http://localhost:8000/plonk_wasm.esbuild.worker.js';
  return src;
}

function wasmPlugin() {
  return {
    name: 'wasm-plugin',
    setup(build) {
      build.onLoad({ filter: /\.wasm$/ }, async ({ path }) => {
        return {
          contents: await fs.promises.readFile(path),
          loader: 'binary',
        };
      });
    },
  };
}

function srcStringPlugin() {
  return {
    name: 'src-string-plugin',
    setup(build) {
      build.onResolve(
        { filter: /^string:/ },
        async ({ path: importPath, resolveDir }) => {
          let absPath = path.resolve(
            resolveDir,
            importPath.replace('string:', '')
          );
          return {
            path: absPath,
            namespace: 'src-string',
          };
        }
      );

      build.onLoad(
        { filter: /.*/, namespace: 'src-string' },
        async ({ path }) => {
          return {
            contents: await fs.promises.readFile(path, { encoding: 'utf8' }),
            loader: 'text',
          };
        }
      );
    },
  };
}

function deferExecutionPlugin() {
  return {
    name: 'defer-execution-plugin',
    setup(build) {
      build.onResolve(
        { filter: /^defer:/ },
        async ({ path: importPath, resolveDir }) => {
          let absPath = path.resolve(
            resolveDir,
            importPath.replace('defer:', '')
          );
          return {
            path: absPath,
            namespace: 'defer-execution',
          };
        }
      );

      build.onLoad(
        { filter: /.*/, namespace: 'defer-execution' },
        async ({ path }) => {
          let code = await fs.promises.readFile(path, { encoding: 'utf8' });
          // replace direct eval, because esbuild refuses to bundle it
          // code = code.replace(/eval\(/g, '(0, eval)(');
          code = code.replace(
            /function\(\)\s*\{\s*return this\s*\}\(\)/g,
            'window'
          );
          code = code.replace(
            /function\(\)\s*\{\s*return this;\s*\}\(\)/g,
            'window'
          );
          let deferedCode = `
          let require = () => {};
          export default () => {\n${code}\n};`;
          return {
            contents: deferedCode,
            loader: 'js',
          };
        }
      );
    },
  };
}
