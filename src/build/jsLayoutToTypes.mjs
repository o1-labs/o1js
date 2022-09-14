import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import prettierRc from '../../.prettierrc.cjs';

// let jsLayout = JSON.parse(process.argv[2]);
let selfPath = fileURLToPath(import.meta.url);
let jsonPath = path.resolve(selfPath, '../../../../jsLayout.json');
let jsLayout = JSON.parse(await fs.readFile(jsonPath, 'utf8'));

console.log(`jsLayoutToTypes.mjs: generating TS types from ${jsonPath}`);

let builtinLeafTypes = new Set([
  'number',
  'string',
  'null',
  'undefined',
  'bigint',
]);
let indent = '';

function writeType(typeData, isJson, withTypeMap) {
  let converters = {};
  if (!isJson && typeData.checkedType) {
    let name = typeData.checkedTypeName;
    converters[name] = {
      typeName: name,
      type: writeType(typeData.checkedType, false, withTypeMap).output,
      jsonType: writeType(typeData, true, true).output,
    };
    typeData = typeData.checkedType;
  }
  let { type, inner, entries, keys, optionType, docEntries } = typeData;
  if (type === 'array') {
    let {
      output,
      dependencies,
      converters: j,
    } = writeType(inner, isJson, withTypeMap);
    mergeObject(converters, j);
    return {
      output: `${output}[]`,
      dependencies,
      converters,
    };
  }
  if (type === 'option') {
    let {
      output,
      dependencies,
      converters: j,
    } = writeType(inner, isJson, withTypeMap);
    if (optionType === 'flaggedOption') {
      dependencies ??= new Set();
      dependencies.add('Bool');
    }
    mergeObject(converters, j);
    return {
      output: isJson
        ? `(${output} | null)`
        : optionType === 'implicit'
        ? output
        : optionType === 'flaggedOption'
        ? `{isSome: Bool, value: ${output}}`
        : `(${output} | undefined)`,
      dependencies,
      converters,
    };
  }
  if (type === 'object') {
    let dependencies = new Set();
    let output = '{\n';
    indent += '  ';
    // TODO: make docs work and use them for doccomments
    for (let key of keys) {
      let value = entries[key];
      let questionMark = '';
      if (
        !isJson &&
        value.type === 'option' &&
        value.optionType === 'orUndefined'
      ) {
        value = value.inner;
        questionMark = '?';
      }
      let inner = writeType(value, isJson, withTypeMap);
      mergeSet(dependencies, inner.dependencies);
      mergeObject(converters, inner.converters);
      output += indent + `${key}${questionMark}: ${inner.output};\n`;
    }
    indent = indent.slice(2);
    output += indent + '}';
    return { output, dependencies, converters };
  }
  if (withTypeMap) {
    type = `${isJson ? 'Json.' : ''}TypeMap["${type}"]`;
  }
  // built in type
  if (builtinLeafTypes.has(type)) return { output: type, converters };
  // else: leaf type that has to be specified manually
  return {
    output: type,
    dependencies: builtinLeafTypes.has(type) ? new Set() : new Set([type]),
    converters,
  };
}

function writeTsContent(types, isJson) {
  let output = '';
  let dependencies = new Set();
  let converters = {};
  let exports = new Set(isJson ? [] : ['customTypes']);
  for (let [Type, value] of Object.entries(types)) {
    let inner = writeType(value, isJson);
    exports.add(Type);
    mergeSet(dependencies, inner.dependencies);
    mergeObject(converters, inner.converters);
    output += `type ${Type} = ${inner.output};\n\n`;
    if (!isJson) {
      output += `let ${Type} = asFieldsAndAux<${Type}, Json.${Type}>(jsLayout.${Type} as any, customTypes);\n\n`;
    }
  }

  let customTypes = Object.values(converters);
  let customTypeNames = Object.values(converters).map((c) => c.typeName);
  let imports = new Set();
  mergeSet(imports, dependencies);
  mergeSet(imports, new Set(customTypeNames));

  let importPath = isJson
    ? '../transaction-leaves-json.js'
    : '../transaction-leaves.js';
  return `// @generated this file is auto-generated - don't edit it directly

import { ${[...imports].join(', ')} } from '${importPath}';
${
  !isJson
    ? "import { asFieldsAndAux, AsFieldsAndAux } from '../transaction-helpers.js';\n" +
      "import * as Json from './transaction-json.js';\n" +
      "import { jsLayout } from './js-layout.js';\n"
    : ''
}

export { ${[...exports].join(', ')} };
${
  !isJson
    ? 'export { Json };\n' + "export * from '../transaction-leaves.js';\n"
    : "export * from '../transaction-leaves-json.js';\n"
}

${
  (!isJson || '') &&
  `
type CustomTypes = { ${customTypes
    .map((c) => `${c.typeName}: AsFieldsAndAux<${c.type}, ${c.jsonType}>;`)
    .join(' ')} }
let customTypes: CustomTypes = { ${customTypeNames.join(', ')} };
`
}

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

let genPath = '../../snarky/gen';
await ensureDir(genPath);

let jsonTypesContent = writeTsContent(jsLayout, true);
await writeTsFile(jsonTypesContent, `${genPath}/transaction-json.ts`);

let jsTypesContent = writeTsContent(jsLayout, false);
await writeTsFile(jsTypesContent, `${genPath}/transaction.ts`);

await writeTsFile(
  `// @generated this file is auto-generated - don't edit it directly
export { jsLayout };

let jsLayout = ${JSON.stringify(jsLayout)};
`,
  `${genPath}/js-layout.ts`
);

function mergeSet(target, source) {
  if (source === undefined) return;
  for (let x of source) {
    target.add(x);
  }
}

function mergeObject(target, source) {
  if (source === undefined) return;
  for (let key in source) {
    target[key] = source[key];
  }
}

async function ensureDir(relPath) {
  let absPath = path.resolve(selfPath, relPath);
  let exists = false;
  try {
    await fs.stat(absPath);
    exists = true;
  } catch {}
  if (!exists) {
    await fs.mkdir(absPath, { recursive: true });
  }
}
