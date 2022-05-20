import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import prettierRc from '../../.prettierrc.js';

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
    let typeString = writeType(
      typeData.checkedType,
      isJson,
      withTypeMap
    ).output;
    converters[name] = {
      toJsonName: `convert${name}ToJson`,
      toFieldsName: `convert${name}ToFields`,
      typeName: name,
      toJsonType: `(${name.toLowerCase()}: ${typeString}) => ${
        writeType(typeData, true, true).output
      }`,
      toFieldsType: `(${name.toLowerCase()}: ${typeString}) => Field[]`,
    };
    typeData = typeData.checkedType;
  }
  let { type, inner, layout, optionType } = typeData;
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
    for (let { key, value, docs } of layout) {
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
  let exports = new Set();
  for (let [key, value] of Object.entries(types)) {
    let inner = writeType(value, isJson);
    exports.add(key);
    mergeSet(dependencies, inner.dependencies);
    mergeObject(converters, inner.converters);
    output += `type ${key} = ${inner.output};\n\n`;

    if (!isJson) {
      output +=
        `let ${key} = {\n` +
        `  toJson(${key.toLowerCase()}: ${key}): Json.${key} {\n` +
        `    return toJson(jsLayout.${key}, ${key.toLowerCase()}, jsonConverters);\n` +
        `  },\n` +
        `  toFields(${key.toLowerCase()}: ${key}): Field[] {\n` +
        `    return toFields(jsLayout.${key}, ${key.toLowerCase()}, fieldsConverters);\n` +
        `  },\n` +
        `};\n\n`;
    }
  }

  let jsonConverters_ = Object.values(converters).map((c) => c.toJsonName);
  let fieldsConverters = Object.values(converters).map((c) => c.toFieldsName);
  let imports = new Set();
  mergeSet(imports, dependencies);
  mergeSet(imports, new Set(jsonConverters_));
  mergeSet(imports, new Set(fieldsConverters));

  let importPath = isJson ? '../parties-leaves-json' : '../parties-leaves';
  return `// @generated this file is auto-generated - don't edit it directly

import { ${[...imports].join(', ')} } from '${importPath}';
${
  !isJson
    ? "import { toJson, toFields } from '../parties-helpers';\n" +
      "import * as Json from './parties-json';\n" +
      "import { jsLayout } from './js-layout';\n"
    : ''
}

export { ${[...exports].join(', ')} };
${
  !isJson
    ? 'export { Json };\n' + "export * from '../parties-leaves';\n"
    : "export * from '../parties-leaves-json';\n"
}

${
  !isJson
    ? `type JsonConverters = { ${Object.values(converters)
        .map((c) => `${c.typeName}: ${c.toJsonType}`)
        .join(';\n')} };
let jsonConverters: JsonConverters = { ${Object.values(converters)
        .map((c) => `${c.typeName}: ${c.toJsonName}`)
        .join(',\n')} };

type FieldsConverters = { ${Object.values(converters)
        .map((c) => `${c.typeName}: ${c.toFieldsType}`)
        .join(';\n')} };
let fieldsConverters: FieldsConverters = { ${Object.values(converters)
        .map((c) => `${c.typeName}: ${c.toFieldsName}`)
        .join(',\n')} };
`
    : ''
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
await writeTsFile(jsonTypesContent, `${genPath}/parties-json.ts`);

let jsTypesContent = writeTsContent(jsLayout, false);
await writeTsFile(jsTypesContent, `${genPath}/parties.ts`);

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
