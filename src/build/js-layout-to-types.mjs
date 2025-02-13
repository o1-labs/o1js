import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import prettierRc from '../../.prettierrc.cjs';

// let jsLayout = JSON.parse(process.argv[2]);
let selfPath = fileURLToPath(import.meta.url);
let jsonPath = path.resolve(selfPath, '../../bindings/ocaml/jsLayout.json');
let jsLayout = JSON.parse(await fs.readFile(jsonPath, 'utf8'));

console.log(`js-layout-to-types.mjs: generating TS types from ${jsonPath}`);

let builtinLeafTypes = new Set(['number', 'string', 'null', 'undefined', 'bigint']);
let indent = '';

function leafTypes(typeData) {
  let leaves = new Set();
  if (typeData.checkedType) {
    mergeSet(leaves, leafTypes(typeData.checkedType));
  }
  let { type, inner, entries, keys } = typeData;
  if (type === 'array' || type === 'option') {
    mergeSet(leaves, leafTypes(inner));
  } else if (type === 'object') {
    for (let key of keys) {
      mergeSet(leaves, leafTypes(entries[key]));
    }
  } else if (!builtinLeafTypes.has(type)) {
    leaves.add(type);
  }
  return leaves;
}

function writeType(typeData, isValue, isJson, withTypeMap) {
  let converters = {};
  if (!(isJson || isValue) && typeData.checkedType) {
    let name = typeData.checkedTypeName;
    converters[name] = {
      typeName: name,
      type: writeType(typeData.checkedType, false, false, withTypeMap).output,
      valueType: writeType(typeData.checkedType, true, false, true).output,
      jsonType: writeType(typeData, false, true, true).output,
    };
    typeData = typeData.checkedType;
  }
  let { type, inner, entries, keys, optionType, docEntries } = typeData;
  if (type === 'array') {
    let { output, dependencies, converters: j } = writeType(inner, isValue, isJson, withTypeMap);
    mergeObject(converters, j);
    return {
      output: `${output}[]`,
      dependencies,
      converters,
    };
  }
  if (type === 'option') {
    let { output, dependencies, converters: j } = writeType(inner, isValue, isJson, withTypeMap);
    if (optionType === 'flaggedOption' || optionType === 'closedInterval') {
      dependencies ??= new Set();
      dependencies.add('Bool');
    }
    mergeObject(converters, j);
    return {
      output: isJson
        ? `(${output} | null)`
        : optionType === 'implicit'
        ? output
        : optionType === 'flaggedOption' || optionType === 'closedInterval'
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
      if (!isJson && value.type === 'option' && value.optionType === 'orUndefined') {
        value = value.inner;
        questionMark = '?';
      }
      let inner = writeType(value, isValue, isJson, withTypeMap);
      mergeSet(dependencies, inner.dependencies);
      mergeObject(converters, inner.converters);
      output += indent + `${key}${questionMark}: ${inner.output};\n`;
    }
    indent = indent.slice(2);
    output += indent + '}';
    return { output, dependencies, converters };
  }
  if (withTypeMap && !builtinLeafTypes.has(type)) {
    type = `${isJson ? 'Json.' : isValue ? 'Value.' : ''}TypeMap["${type}"]`;
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

function writeTsContent({ jsLayout: types, isJson, isProvable, leavesRelPath }) {
  let output = '';
  let dependencies = new Set();
  let converters = {};
  let exports = new Set(isJson ? [] : ['customTypes']);

  let fromLayout = isProvable ? 'provableFromLayout' : 'signableFromLayout';
  let FromLayout = isProvable ? 'ProvableFromLayout' : 'SignableFromLayout';
  let Type = (Name, T, TValue, ...args) =>
    `${Name}<${(isProvable ? [T, TValue, ...args] : [T, ...args]).join(', ')}>`;

  let GenericType = isProvable ? 'GenericProvableExtended' : 'GenericSignable';
  let GeneratedType = isProvable ? 'ProvableExtended' : 'Signable';

  for (let [T, value] of Object.entries(types)) {
    let inner = writeType(value, false, isJson);
    exports.add(T);
    mergeSet(dependencies, inner.dependencies);
    mergeObject(converters, inner.converters);
    output += `type ${T} = ${inner.output};\n\n`;
    if (!isJson) {
      output += `let ${T} = ${Type(
        fromLayout,
        T,
        `Value.${T}`,
        `Json.${T}`
      )}(jsLayout.${T} as any);\n\n`;
    }
  }

  let typeMapKeys = new Set();
  for (let [, value] of Object.entries(types)) {
    mergeSet(typeMapKeys, leafTypes(value));
  }

  let customTypes = Object.values(converters);
  let customTypeNames = Object.values(converters).map((c) => c.typeName);
  let imports = new Set();
  mergeSet(imports, typeMapKeys);
  mergeSet(imports, dependencies);
  mergeSet(imports, new Set(customTypeNames));

  let importPath = leavesRelPath;
  return `// @generated this file is auto-generated - don't edit it directly

import { ${[...imports].join(', ')} } from '${importPath}';
${
  !isJson
    ? `import { ${GenericType} } from '../../lib/generic.js';\n` +
      `import { ${FromLayout}, GenericLayout } from '../../lib/from-layout.js';\n` +
      "import * as Json from './transaction-json.js';\n" +
      (isProvable ? "import * as Value from './transaction-bigint.js';\n" : '') +
      "import { jsLayout } from './js-layout.js';\n"
    : ''
}

export { ${[...exports].join(', ')} };
${
  !isJson
    ? 'export { Json };\n' +
      `export * from '${leavesRelPath}';\n` +
      `export { ${fromLayout}, toJSONEssential, empty, Layout, TypeMap };\n`
    : `export * from '${leavesRelPath}';\n` + 'export { TypeMap };\n'
}

type TypeMap = {
  ${[...typeMapKeys].map((type) => `${type}: ${type};`).join('\n')}
}
${
  (!isJson || '') &&
  `
const TypeMap: {
  [K in keyof TypeMap]: ${Type(GeneratedType, 'TypeMap[K]', 'Value.TypeMap[K]', 'Json.TypeMap[K]')};
} = {
  ${[...typeMapKeys].join(', ')}
}
`
}

${
  (!isJson || '') &&
  `
type ${Type(GeneratedType, 'T', 'TValue', 'TJson')} = ${Type(
    GenericType,
    'T',
    'TValue',
    'TJson',
    'Field'
  )};
type Layout = GenericLayout<TypeMap>;

type CustomTypes = { ${customTypes
    .map((c) => `${c.typeName}: ${Type(GeneratedType, c.type, c.valueType, c.jsonType)};`)
    .join(' ')} }
let customTypes: CustomTypes = { ${customTypeNames.join(', ')} };
let { ${fromLayout}, toJSONEssential, empty } = ${Type(
    FromLayout,
    'TypeMap',
    'Value.TypeMap',
    'Json.TypeMap'
  )}(TypeMap, customTypes);
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
let genPath = '../../bindings/mina-transaction/gen';
await ensureDir(genPath);

let jsonTypesContent = writeTsContent({
  jsLayout,
  isJson: true,
  leavesRelPath: '../transaction-leaves-json.js',
});
await writeTsFile(jsonTypesContent, `${genPath}/transaction-json.ts`);

let jsTypesContent = writeTsContent({
  jsLayout,
  isJson: false,
  isProvable: true,
  leavesRelPath: '../transaction-leaves.js',
});
await writeTsFile(jsTypesContent, `${genPath}/transaction.ts`);

jsTypesContent = writeTsContent({
  jsLayout,
  isJson: false,
  isProvable: false,
  leavesRelPath: '../transaction-leaves-bigint.js',
});
await writeTsFile(jsTypesContent, `${genPath}/transaction-bigint.ts`);

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
function diffSets(s0, s1) {
  let s = new Set(s0);
  for (let x of s1) {
    s.delete(x);
  }
  return s;
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
