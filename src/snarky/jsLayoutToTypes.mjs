// let jsLayout = JSON.parse(process.argv[2]);
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let selfPath = fileURLToPath(import.meta.url);
let jsonPath = path.resolve(selfPath, '../jsLayout.json');
let dTsPath = path.resolve(selfPath, '../types.d.ts');
let jsLayout = JSON.parse(await fs.readFile(jsonPath, 'utf8'));

let builtinLeafTypes = new Set(['number', 'string', 'boolean', 'bigint']);
let indent = '';

function writeType(typeData) {
  let { type, inner, layout } = typeData;
  if (type === 'array') {
    let { output, dependencies } = writeType(inner);
    return {
      output: `(${output})[]`,
      dependencies,
    };
  }
  if (type === 'object') {
    let output = '{\n';
    let dependencies = new Set();
    indent += '  ';
    for (let { key, value, docs } of layout) {
      let questionMark = '';
      if (value.type === 'orundefined') {
        value = value.inner;
        questionMark = '?';
      }
      let inner = writeType(value);
      for (let dep of inner.dependencies) {
        dependencies.add(dep);
      }
      output += indent + `${key}${questionMark}: ${inner.output};\n`;
    }
    indent = indent.slice(2);
    output += indent + '}';
    return { output, dependencies };
  }
  return {
    output: type,
    dependencies: builtinLeafTypes.has(type) ? new Set() : new Set([type]),
  };
}

function writeAllTypes(types) {
  let output = '';
  let dependencies = new Set();
  for (let [key, value] of Object.entries(types)) {
    let inner = writeType(value);
    output += `type ${key} = ${inner.output};\n\n`;
  }
  return { output };
}

let { output } = writeAllTypes(jsLayout);
await fs.writeFile(dTsPath, output);
