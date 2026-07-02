import esbuild from 'esbuild';
import fse, { move } from 'fs-extra';
import glob from 'glob';
import { exec } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export { buildWeb };

const entry = './src/index.ts';
const target = 'es2022';

let nodePath = path.resolve(process.argv[1]);
let modulePath = path.resolve(fileURLToPath(import.meta.url));
let isMain = nodePath === modulePath;

if (isMain) {
  console.log('building', entry);
  await buildWeb({ production: process.env.NODE_ENV === 'production' });
  console.log('finished build');
}

async function buildWeb({ production }) {
  let minify = !!production;

  // run typescript
  await execPromise('npx tsc -p tsconfig.web.json');

  // copy over pure js files
  await copy({
    './src/bindings.d.ts': './dist/web/bindings.d.ts',
    './src/bindings.web.js': './dist/web/bindings.js',
    './src/bindings/js/web/': './dist/web/bindings/js/web/',
  });

  // bundle the napi-rs wasm loaders so that their `@napi-rs/wasm-runtime`
  // imports are resolved; the .wasm binary itself stays a separate file which
  // the loader fetches relative to `import.meta.url`
  await esbuild.build({
    entryPoints: ['./src/bindings/compiled/web_bindings/kimchi_napi.wasi-browser.js'],
    bundle: true,
    format: 'esm',
    outfile: './dist/web/web_bindings/kimchi_napi.wasi-browser.js',
    target: 'esnext',
    external: ['*.wasm', '*.mjs'],
    logLevel: 'error',
    minify,
    sourcemap: true,
  });
  await esbuild.build({
    entryPoints: ['./src/bindings/compiled/web_bindings/wasi-worker-browser.mjs'],
    bundle: true,
    format: 'esm',
    outfile: './dist/web/web_bindings/wasi-worker-browser.mjs',
    target: 'esnext',
    external: ['*.wasm'],
    logLevel: 'error',
    minify,
    sourcemap: true,
  });
  await copy({
    './src/bindings/compiled/web_bindings/kimchi_napi.wasm32-wasi.wasm':
      './dist/web/web_bindings/kimchi_napi.wasm32-wasi.wasm',
    './src/bindings/compiled/web_bindings/o1js_web.bc.js': './dist/web/web_bindings/o1js_web.bc.js',
  });

  if (minify) {
    let o1jsWebPath = './dist/web/web_bindings/o1js_web.bc.js';
    let o1jsWeb = await readFile(o1jsWebPath, 'utf8');
    let { code } = await esbuild.transform(o1jsWeb, {
      target,
      logLevel: 'error',
      minify,
    });
    await writeFile(o1jsWebPath, code);
  }

  // move all .web.js files to their .js counterparts
  let webFiles = glob.sync('./dist/web/**/*.web.js');
  await Promise.all(
    webFiles.map((file) => move(file, file.replace('.web.js', '.js'), { overwrite: true }))
  );

  // run esbuild on the js entrypoint
  let jsEntry = path.basename(entry).replace('.ts', '.js');
  await esbuild.build({
    entryPoints: [`./dist/web/${jsEntry}`],
    bundle: true,
    format: 'esm',
    outfile: 'dist/web/index.js',
    resolveExtensions: ['.js', '.ts'],
    plugins: [makeWasiLoaderExternal(), srcStringPlugin()],
    dropLabels: ['CJS'],
    external: ['*.bc.js'],
    target,
    allowOverwrite: true,
    logLevel: 'error',
    minify,
    sourcemap: true,
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

// keep the (pre-bundled) napi-rs wasm loader external to the main bundle, and
// rewrite its import path relative to the bundle output (dist/web/index.js)
function makeWasiLoaderExternal() {
  let isWasiLoader = /kimchi_napi\.wasi-browser\.js$/;
  return {
    name: 'plugin-wasi-external',
    setup(build) {
      build.onResolve({ filter: isWasiLoader }, ({ path: filePath, resolveDir }) => ({
        path:
          './' +
          path.relative(
            path.resolve('.', 'dist/web'),
            path.resolve(resolveDir, filePath).replace('/compiled/web_bindings/', '/web_bindings/')
          ),
        external: true,
      }));
    },
  };
}

function srcStringPlugin() {
  return {
    name: 'src-string-plugin',
    setup(build) {
      build.onResolve({ filter: /^string:/ }, async ({ path: importPath, resolveDir }) => {
        let absPath = path.resolve(resolveDir, importPath.replace('string:', ''));
        return {
          path: absPath,
          namespace: 'src-string',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'src-string' }, async ({ path }) => {
        return {
          contents: await readFile(path, 'utf8'),
          loader: 'text',
        };
      });
    },
  };
}
