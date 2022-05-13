// let jsLayout = JSON.parse(process.argv[2]);
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import prettierRc from '../../.prettierrc.js';

let selfPath = fileURLToPath(import.meta.url);
let jsonPath = path.resolve(selfPath, '../jsLayout.json');
let jsLayout = JSON.parse(await fs.readFile(jsonPath, 'utf8'));

let builtinLeafTypes = new Set([
  'number',
  'string',
  'boolean',
  'null',
  'undefined',
  'bigint',
]);
let indent = '';

function writeType(typeData, isJson) {
  let { type, inner, layout } = typeData;
  if (type === 'array') {
    let { output, dependencies } = writeType(inner, isJson);
    return {
      output: `${output}[]`,
      dependencies,
    };
  }
  if (type === 'orundefined') {
    let { output, dependencies } = writeType(inner, isJson);
    return {
      output: isJson ? `(${output} | null)` : `(${output} | undefined)`,
      dependencies,
    };
  }
  if (type === 'object') {
    let output = '{\n';
    let dependencies = new Set();
    indent += '  ';
    for (let { key, value, docs } of layout) {
      let questionMark = '';
      if (!isJson && value.type === 'orundefined') {
        value = value.inner;
        questionMark = '?';
      }
      let inner = writeType(value, isJson);
      mergeSet(dependencies, inner.dependencies);
      output += indent + `${key}${questionMark}: ${inner.output};\n`;
    }
    indent = indent.slice(2);
    output += indent + '}';
    return { output, dependencies };
  }
  // built in type
  if (builtinLeafTypes.has(type)) return { output: type };
  // else: leaf type that has to be specified manually
  return {
    output: type,
    dependencies: builtinLeafTypes.has(type) ? new Set() : new Set([type]),
  };
}

function writeAllTypes(types, isJson) {
  let output = '';
  let dependencies = new Set();
  let exports = new Set();
  for (let [key, value] of Object.entries(types)) {
    let inner = writeType(value, isJson);
    exports.add(key);
    mergeSet(dependencies, inner.dependencies);
    output += `type ${key} = ${inner.output};\n\n`;
  }
  let importPath = isJson ? './parties-leaves-json' : './parties-leaves';
  return `// this file is auto-generated - don't edit it directly

import { ${[...dependencies].join(', ')} } from '${importPath}';

export { ${[...exports].join(', ')} };

${output}`;
}

let jsonTypesOutput = writeAllTypes(jsLayout, true);
let jsonTypesPath = path.resolve(selfPath, '../../snarky/parties-json.d.ts');
jsonTypesOutput = prettier.format(jsonTypesOutput, {
  filepath: jsonTypesPath,
  ...prettierRc,
});
await fs.writeFile(jsonTypesPath, jsonTypesOutput);

let jsTypesOutput = writeAllTypes(jsLayout, false);
let jsTypesPath = path.resolve(selfPath, '../../snarky/parties.d.ts');
jsTypesOutput = prettier.format(jsTypesOutput, {
  filepath: jsTypesPath,
  ...prettierRc,
});
await fs.writeFile(jsTypesPath, jsTypesOutput);

function mergeSet(target, source) {
  if (source === undefined) return;
  for (let x of source) {
    target.add(x);
  }
}
