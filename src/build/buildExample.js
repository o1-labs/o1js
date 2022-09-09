import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import esbuild from 'esbuild';

export { buildAndImport, build };

async function buildAndImport(srcPath, { keepFile = false }) {
  let absPath = await build(srcPath);
  let importedModule;
  try {
    importedModule = await import(absPath);
  } finally {
    if (!keepFile) await fs.unlink(absPath);
  }
  return importedModule;
}

async function build(srcPath) {
  let tsConfig = findTsConfig() ?? defaultTsConfig;

  let outfile = srcPath.replace('.ts', '.tmp.js');

  await esbuild.build({
    entryPoints: [srcPath],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    target: 'esnext',
    resolveExtensions: ['.node.js', '.ts', '.js'],
    logLevel: 'error',
    plugins: [typescriptPlugin(tsConfig), makeNodeModulesExternal()],
  });

  let absPath = path.resolve('.', outfile);
  return absPath;
}

const defaultTsConfig = {
  compilerOptions: {
    module: 'esnext',
    lib: ['dom', 'esnext'],
    target: 'esnext',
    importHelpers: true,
    strict: true,
    moduleResolution: 'node',
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowSyntheticDefaultImports: true,
  },
};

function typescriptPlugin(tsConfig) {
  return {
    name: 'plugin-typescript',
    setup(build) {
      build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
        let src = await fs.readFile(args.path, { encoding: 'utf8' });
        let { outputText: contents } = ts.transpileModule(src, tsConfig);
        return { contents };
      });
    },
  };
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

function findTsConfig() {
  let tsConfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);
  if (tsConfigPath === undefined) return;
  let text = ts.sys.readFile(tsConfigPath);
  if (text === undefined) throw new Error(`failed to read '${tsConfigPath}'`);
  return ts.parseConfigFileTextToJson(tsConfigPath, text).config;
}
