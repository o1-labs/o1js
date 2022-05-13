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
    // TODO: make docs work and use them for doccomments
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

function writeTsContent(types, isJson) {
  let output = '';
  let dependencies = new Set();
  let exports = new Set();
  for (let [key, value] of Object.entries(types)) {
    let inner = writeType(value, isJson);
    exports.add(key);
    mergeSet(dependencies, inner.dependencies);
    output += `type ${key} = ${inner.output};\n\n`;
    if (!isJson) {
      output +=
        `let ${key} = {\n` +
        `  toJson(${key.toLowerCase()}: ${key}): Json.${key} {\n` +
        `    return toJson(jsLayout.${key}, ${key.toLowerCase()});\n` +
        `  },\n` +
        `};\n\n`;
    }
  }
  let importPath = isJson ? './parties-leaves-json' : './parties-leaves';
  return `// this file is auto-generated - don't edit it directly

import { ${[...dependencies].join(', ')} } from '${importPath}';
${
  !isJson
    ? "import { toJson } from './parties-helpers';" +
      "import * as Json from './parties-json';" +
      "import { jsLayout } from './js-layout';"
    : ''
}

export { ${[...exports].join(', ')} };

${output}`;
}

async function writeTsFile(content, relPath) {
  let absPath = path.resolve(selfPath, relPath);
  content = prettier.format(content, {
    filepath: absPath,
    ...prettierRc,
  });
  await fs.writeFile(absPath, content);
}

let jsonTypesContent = writeTsContent(jsLayout, true);
await writeTsFile(jsonTypesContent, '../../snarky/parties-json.ts');

let jsTypesContent = writeTsContent(jsLayout, false);
await writeTsFile(jsTypesContent, '../../snarky/parties.ts');

await writeTsFile(
  `export { jsLayout };

let jsLayout = ${JSON.stringify(jsLayout)};
`,
  '../../snarky/js-layout.ts'
);

function mergeSet(target, source) {
  if (source === undefined) return;
  for (let x of source) {
    target.add(x);
  }
}
