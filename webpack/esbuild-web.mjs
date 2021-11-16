import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';

// run esbuild on plonk_wasm.js and create non-module version for worker
await esbuild.build({
  entryPoints: [`./src/chrome_bindings/plonk_wasm.esbuild.js`],
  bundle: true,
  format: 'esm',
  outfile: 'src/chrome_bindings/plonk_wasm.esbuild.bundled.js',
  target: 'esnext',
  plugins: [wasmPlugin()],
});
let plonkWasm = await fs.promises.readFile(
  'src/chrome_bindings/plonk_wasm.esbuild.bundled.js',
  { encoding: 'utf8' }
);
// strip away trailing export statement
let plonkWasmWorker = plonkWasm.slice(0, plonkWasm.indexOf('export {'));
await fs.promises.writeFile(
  'src/chrome_bindings/plonk_wasm.esbuild.worker.js',
  plonkWasmWorker,
  { encoding: 'utf8' }
);

// run typescript
let entry = process.argv[2] ?? './src/index.ts';
let json = JSON.stringify({
  extends: './tsconfig.json',
  include: [entry],
  compilerOptions: {
    outDir: 'dist/web-esbuild',
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
  './src/snarky.js': './dist/web-esbuild/snarky.js',
  './src/chrome_bindings': './dist/web-esbuild/chrome_bindings/',
});
// overwrite plonk_wasm with bundled version
copy({
  'src/chrome_bindings/plonk_wasm.esbuild.bundled.js':
    './dist/web-esbuild/chrome_bindings/plonk_wasm.esbuild.js',
});
await fs.promises.unlink('src/chrome_bindings/plonk_wasm.esbuild.bundled.js');

// run esbuild on worker_init.js
await esbuild.build({
  entryPoints: [`./dist/web-esbuild/chrome_bindings/worker_init.js`],
  bundle: true,
  format: 'esm',
  outfile: 'dist/web-esbuild/chrome_bindings/worker_init.js',
  target: 'esnext',
  plugins: [wasmPlugin()],
  allowOverwrite: true,
});

// run esbuild on the js entrypoint
let jsEntry = path.basename(entry).replace('.ts', '.js');
await esbuild.build({
  entryPoints: [`./dist/web-esbuild/${jsEntry}`],
  bundle: true,
  format: 'esm',
  outfile: 'dist/web-esbuild/index.js',
  resolveExtensions: ['.js', '.ts'],
  plugins: [wasmPlugin(), srcStringPlugin()],
  external: ['*.bc.js'],
  target: 'esnext',
  allowOverwrite: true,
  // watch: true,
});

// copy auxiliary files
copy({
  './src/chrome_bindings/plonk_wasm.d.ts': './dist/web-esbuild/plonk_wasm.d.ts',
  './src/chrome_bindings/plonk_wasm_bg.wasm.d.ts':
    './dist/web-esbuild/plonk_wasm_bg.wasm.d.ts',
  './src/chrome_bindings/index.html': './dist/web-esbuild/index.html',
  './src/chrome_bindings/server.py': './dist/web-esbuild/server.py',
  // TODO: remove dependency on this last worker file
  './src/chrome_bindings/plonk_wasm.esbuild.worker.js':
    './dist/web-esbuild/plonk_wasm.esbuild.worker.js',
});

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
