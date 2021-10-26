const { parse } = require('@babel/parser');
const { default: generate } = require('@babel/generator');
const { default: template } = require('@babel/template');
const { default: traverse } = require('@babel/traverse');
const t = require('@babel/types');
const fs = require('fs');
const path = require('path');
const process = require('process');

function moduleNameFromPath(filepath) {
  const parts = filepath.split(path.sep);
  const last = parts[parts.length-1];
  return last.endsWith('.js') ? last.slice(0, last.length-3) : last;
}

class ImportMap {
  constructor() {}

  add(path) {
    let name = moduleNameFromPath(path);
    if(this.hasOwnProperty(name)) {
      if(this[name] !== path)
        throw new Error('overlapping import module names');
    } else {
      this[name] = path;
    }
  }

  getFilepath(name) {
    return this[name];
  }

  names() {
    return Object.keys(this)
  }
}

function loadModule(modulePath) {
  const moduleId = path.resolve(modulePath);
  require(moduleId);
  const childModule = module.children.find((mod) => mod.id == moduleId);
  if(childModule !== null) {
    return childModule
  } else {
    throw new Error(`failed to load module: ${moduleId}`)
  }
}

function resolveImportModulePath(relativeTo, moduleId) {
  if(!fs.existsSync(moduleId)) {
    throw new Error(`failed to resolve import module path: ${moduleId}`);
  }

  let modulePath = path.relative('.', moduleId).split(path.sep);

  // strip index.js references for cleanliness
  if(modulePath[modulePath.length-1] === 'index.js') {
    modulePath.splice(modulePath.length-1, 1);
  }

  // treat paths in node_modules as global, and other paths as local
  if(modulePath[0] === 'node_modules') {
    modulePath.splice(0, 1);
  } else {
    // re-resolve relative paths to be relative to their respective file
    modulePath = path.relative(relativeTo, path.resolve('.', modulePath.join(path.sep))).split(path.sep);
    if(modulePath[0] !== '.') modulePath.unshift('.');
  }

  return modulePath.join(path.sep);
}

function matchesPattern(value, pattern) {
  if(typeof pattern === 'object') {
    if(typeof value !== 'object') return false;

    if(Array.isArray(pattern)) {
      if(!Array.isArray(value) || pattern.length !== value.length) return false;
      for(let i in value) if(!matchesPattern(value[i], pattern[i])) return false;
    } else {
      for(let k in pattern) {
        if(!value.hasOwnProperty(k)) return false;
        if(!matchesPattern(value[k], pattern[k])) return false;
      }
    }

    return true;
  } else {
    return value === pattern;
  }
}

const loadAst = (filepath) => parse(fs.readFileSync(filepath).toString())

function analyzeModule(filepath, ast) {
  const dir = path.dirname(filepath);
  const mod = loadModule(filepath);
  const imports = new ImportMap();
  const exports = Object.keys(mod.exports);

  mod.children.forEach((child) => imports.add(resolveImportModulePath(dir, child.id)));

  traverse(ast, {
    CallExpression: (path) => {
      const {callee, arguments} = path.node;

      if(t.isIdentifier(callee, {name: 'require'})) {
        if(arguments.length !== 1 || !t.isStringLiteral(arguments[0]))
          throw new Error('unable to handle require function call input');
        imports.add(arguments[0].value)
      }
    },
    // apply one-off fix for an evaluation hack in the generated code
    StringLiteral: (path) => {
      if(path.node.value === "require('strftime')")
        imports.add('strftime');
    }
  });

  return {imports, exports};
}

// this function mutates the ast input
function translateJOOModuleToES6({imports, exports}, ast) {
  const exportNames = exports.map((exportedName) => ({
    localName: t.identifier(`__export__${exportedName}`),
    exportedName: t.identifier(exportedName)
  }));

  // matches expressions of the form (function() { ... }(function() { return this }()))
  const scopeInjectionPattern = {
    type: 'CallExpression',
    callee: { type: 'FunctionExpression' },
    arguments: [
      {
        type: 'CallExpression',
        callee: {
          type: 'FunctionExpression',
          params: [],
          body: {
            type: 'BlockStatement',
            body: [
              {
                type: 'ReturnStatement',
                argument: { type: 'ThisExpression' }
              }
            ]
          }
        },
        arguments: []
      }
    ]
  };

  traverse(ast, {
    // rewrite sub-module evaluation scope
    ExpressionStatement: (path) => {
      if(matchesPattern(path.node.expression, scopeInjectionPattern)) 
        path.node.expression.arguments[0] = t.identifier('__moduleScope');
    },
    // rewrite require function calls
    CallExpression: (path) => {
      const {callee, arguments} = path.node;

      if(t.isIdentifier(callee, {name: 'require'})) {
        if(arguments.length !== 1 || !t.isStringLiteral(arguments[0]))
          throw new Error('unable to handle require function call input');
        callee.name = '__requireStub';
      }
    },
    // apply one-off fix for an evaluation hack in the generated code
    StringLiteral: (path) => {
      if(path.node.value === "require('strftime')")
        path.node.value = "__requireStub('strftime')";
    }
  });

  ast.program.body = [
    ...imports.names().map((importName) =>
      template('import * as %%id%% from %%filepath%%')({
        id: t.identifier(importName),
        filepath: t.stringLiteral(imports.getFilepath(importName))
      })
    ),
    template('const __moduleImportMappings = %%mappings%%')({
      mappings: t.objectExpression(
        imports.names().map((importName) =>
          t.objectProperty(
            t.stringLiteral(imports.getFilepath(importName)),
            t.identifier(importName)
          )
        )
      )
    }),
    ...template(`
      const __moduleScope = {};

      function __requireStub(path) {
        if(path in __moduleImportMappings) {
          return __moduleImportMappings[path];
        } else {
          throw new Error('require stub module mapping not found for "\${path}"');
        }
      }
    `)(),
    ...ast.program.body,
    ...exportNames.map((names) =>
      template('const %%localName%% = __moduleScope.%%exportedName%%')(names)
    ),
    t.exportNamedDeclaration(null, exportNames.map(({localName, exportedName}) =>
      t.exportSpecifier(localName, exportedName)))
  ];
}

function writeTranslatedEs6Module(originalFilepath, ast) {
  const targetFilepath = originalFilepath.replace(/.bc.js$/, '.bc.es6.js')
  fs.writeFileSync(targetFilepath, generate(ast).code);
}

const nodeBindingsPath = './src/node_bindings/snarky_js_node.bc.js';
const chromeBindingsPath = './src/chrome_bindings/snarky_js_chrome.bc.js';
const nodeBindingsAst = loadAst(nodeBindingsPath);
const chromeBindingsAst = loadAst(chromeBindingsPath);

const moduleAnalysis = analyzeModule(nodeBindingsPath, nodeBindingsAst);

translateJOOModuleToES6(moduleAnalysis, nodeBindingsAst);
translateJOOModuleToES6(moduleAnalysis, chromeBindingsAst);

writeTranslatedEs6Module(nodeBindingsPath, nodeBindingsAst)
writeTranslatedEs6Module(chromeBindingsPath, chromeBindingsAst)
process.exit(0);