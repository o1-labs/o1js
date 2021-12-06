import esbuild from 'esbuild';
import fse from 'fs-extra';
import { readFile, writeFile, unlink } from 'node:fs/promises';
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

  // prepare plonk_wasm.js with bundled wasm in function-wrapped form
  let bindings = await readFile('./src/chrome_bindings/plonk_wasm.js', 'utf8');
  bindings = rewriteWasmBindings(bindings);
  let tmpBindingsPath = 'src/chrome_bindings/plonk_wasm.tmp.js';
  await writeFile(tmpBindingsPath, bindings);
  await esbuild.build({
    entryPoints: [tmpBindingsPath],
    bundle: true,
    format: 'esm',
    outfile: tmpBindingsPath,
    target: 'esnext',
    plugins: [wasmPlugin()],
    allowOverwrite: true,
  });
  bindings = await readFile(tmpBindingsPath, 'utf8');
  bindings = rewriteBundledWasmBindings(bindings);
  await writeFile(tmpBindingsPath, bindings);

  // run typescript
  let json = JSON.stringify({
    extends: './tsconfig.json',
    include: [entry],
    compilerOptions: {
      outDir: 'dist/web',
    },
  });
  await writeFile('./tsconfig.web-tmp.json', json);
  await execPromise('npx tsc -p tsconfig.web-tmp.json');
  await execPromise('rm ./tsconfig.web-tmp.json');

  // copy over pure js files
  await copy({
    './src/snarky.js': './dist/web/snarky.js',
    './src/snarky.d.ts': './dist/web/snarky.d.ts',
    './src/proxyClasses.js': './dist/web/proxyClasses.js',
    './src/snarky-class-spec.json': './dist/web/snarky-class-spec.json',
    './src/chrome_bindings': './dist/web/chrome_bindings/',
  });

  if (minify) {
    let snarkyJsChromePath =
      './dist/web/chrome_bindings/snarky_js_chrome.bc.js';
    let snarkyJsChrome = await readFile(snarkyJsChromePath, 'utf8');
    let { code } = await esbuild.transform(snarkyJsChrome, {
      target: 'es2021',
      logLevel: 'error',
      minify,
    });
    await writeFile(snarkyJsChromePath, code);
  }

  // overwrite plonk_wasm with bundled version
  await copy({ [tmpBindingsPath]: './dist/web/chrome_bindings/plonk_wasm.js' });
  await unlink(tmpBindingsPath);

  // run esbuild on the js entrypoint
  let jsEntry = path.basename(entry).replace('.ts', '.js');
  await esbuild.build({
    entryPoints: [`./dist/web/${jsEntry}`],
    bundle: true,
    format: 'esm',
    outfile: 'dist/web/index.js',
    resolveExtensions: ['.js', '.ts'],
    plugins: [wasmPlugin(), srcStringPlugin()],
    external: ['*.bc.js'],
    target: 'es2021',
    allowOverwrite: true,
    logLevel: 'error',
    minify,
    // watch: true,
  });

  // copy auxiliary files
  await copy({
    './src/chrome_bindings/plonk_wasm.d.ts': './dist/web/plonk_wasm.d.ts',
    './src/chrome_bindings/plonk_wasm_bg.wasm.d.ts':
      './dist/web/plonk_wasm_bg.wasm.d.ts',
    './src/chrome_bindings/index.html': './dist/web/index.html',
    './src/chrome_bindings/server.py': './dist/web/server.py',
  });
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

function execPromise(cmd) {
  return new Promise((r) =>
    exec(cmd, (_, stdout) => {
      r(stdout);
    })
  );
}

function rewriteWasmBindings(src) {
  src = src
    .replace("new URL('plonk_wasm_bg.wasm', import.meta.url)", 'wasmCode')
    .replace('import.meta.url', '"/"')
    .replace(
      "import { startWorkers } from './snippets/wasm-bindgen-rayon-7afa899f36665473/src/workerHelpers.no-bundler.js';",
      `import wasmCode from './plonk_wasm_bg.wasm';
let startWorkers;
`
    );
  return src;
}
function rewriteBundledWasmBindings(src) {
  let i = src.indexOf('export {');
  let exportSlice = src.slice(i);
  let defaultExport = exportSlice.match(/\w* as default/)[0];
  exportSlice = exportSlice
    .replace(defaultExport, `default: init`)
    .replace('export', 'return');
  src = src.slice(0, i) + exportSlice;

  src = src.replace('var startWorkers;\n', '');
  return `import {startWorkers} from './workerHelpers.js'
export {plonkWasm as default};
function plonkWasm() {
  ${src}
}
plonkWasm.deps = [startWorkers]`;
}

function wasmPlugin() {
  return {
    name: 'wasm-plugin',
    setup(build) {
      build.onLoad({ filter: /\.wasm$/ }, async ({ path }) => {
        return {
          contents: await readFile(path),
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
            contents: await readFile(path, 'utf8'),
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
          let code = await readFile(path, 'utf8');
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
