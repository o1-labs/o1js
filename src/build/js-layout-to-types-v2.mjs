// TODO: refactor hack

import assert from 'node:assert';
import fs from 'node:fs/promises';
import prettier from 'prettier';
import prettierRc from '../../.prettierrc.cjs';

const leafTypes = {
  number: 'number',
  string: 'string',
  Actions: 'Actions',
  AuthRequired: 'AuthRequired',
  Bool: 'Bool',
  BalanceChange: 'Int64',
  Events: 'Events',
  Field: 'Field',
  Int64: 'Int64',
  PublicKey: 'PublicKey',
  Sign: 'Sign',
  StateHash: 'StateHash',
  TokenId: 'TokenId',
  TokenSymbol: 'TokenSymbol',
  UInt32: 'UInt32',
  UInt64: 'UInt64',
  ZkappUri: 'ZkappUri',
};

// TMP HACK
const ignoredCheckedTypes = new Set(['BalanceChange', 'MayUseToken']);

// strict shallow array equality
function arraysEqual(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function setsEqual(a, b) {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function layoutNodeIsLeaf(node) {
  return node.type in leafTypes || ('name' in node && node.name in leafTypes);
}

function leafName(node) {
  const key = 'name' in node && node.name in leafTypes ? node.name : node.type;
  return leafTypes[key];
}

// we have special cases for handling ranges
function layoutNodeIsRange(node) {
  return arraysEqual(node.keys, ['lower', 'upper']);
}

function forEachLayoutNode(node, f) {
  if (!('type' in node)) {
    throw new Error('invalid layout node');
  }

  f(node);

  switch (node.type) {
    case 'object':
      for (const key of node.keys) {
        forEachLayoutNode(node.entries[key], f);
      }
      break;
    case 'array':
    case 'option':
      forEachLayoutNode(node.inner, f);
      break;
  }
}

function catalogTypes(layout) {
  const jsTypes = {};

  function add(name, node) {
    if (name in jsTypes) {
      assert.deepStrictEqual(jsTypes[name], node);
    } else {
      jsTypes[name] = node;
    }
  }

  function catalog(node) {
    if (node.type === 'object') {
      if (layoutNodeIsLeaf(node)) return;
      // TODO: fix this new special case we hit after merging the updating bindings layout
      if ('checkedType' in node && !ignoredCheckedTypes.has(node.name)) {
        console.log(JSON.stringify(node));
        throw new Error('unexpected checkedType on object layout node');
      }
      // special case: ignore custom range types
      if (layoutNodeIsRange(node)) return;
      add(node.name, node);
    } else if ('checkedType' in node) {
      // hack
      let checkedType = node.checkedType;
      if ('checkedTypeName' in node) checkedType = { ...checkedType, name: node.checkedTypeName };
      forEachLayoutNode(checkedType, catalog);
    }
  }

  for (const root in layout) forEachLayoutNode(layout[root], catalog);

  return jsTypes;
}

function analyzeTypeDependencies(layout) {
  const deps = {};

  // returns undefined if this node shouldn't be tracked as a type definition dependency
  function castDep(node) {
    if ('checkedType' in node && !ignoredCheckedTypes.has(node.name)) {
      // hack
      let checkedType = node.checkedType;
      if ('checkedTypeName' in node) checkedType = { ...checkedType, name: node.checkedTypeName };
      return castDep(checkedType);
    } else {
      switch (node.type) {
        case 'object':
          if (layoutNodeIsLeaf(node)) return;
          // special case: don't track dependencies for range types
          if (layoutNodeIsRange(node)) return;
          return node.name;
        case 'array':
        case 'option':
          return castDep(node.inner);
      }
    }
  }

  function addDeps(node) {
    if (node.type === 'object') {
      if (layoutNodeIsLeaf(node)) return;
      // special case: don't track dependencies for range types
      if (layoutNodeIsRange(node)) return;

      const nodeDeps = node.keys.map((key) => castDep(node.entries[key])).filter((x) => !!x);
      const nodeDepSet = new Set(nodeDeps);

      if (node.name in deps) {
        assert(setsEqual(deps[node.name], nodeDepSet));
      } else {
        deps[node.name] = nodeDepSet;
      }
    } else if ('checkedType' in node) {
      // hack
      let checkedType = node.checkedType;
      if ('checkedTypeName' in node) checkedType = { ...checkedType, name: node.checkedTypeName };
      castDep(checkedType);
      forEachLayoutNode(checkedType, addDeps);
    }
  }

  for (const root in layout) forEachLayoutNode(layout[root], addDeps);

  const ranks = {};

  function assignRank(name, visited) {
    if (visited.has(name)) throw new Error('ecnountered a dependency loop');

    if (deps[name].size > 0) {
      visited.add(name);
      const depRanks = [...deps[name]].map((dep) => assignRank(dep, new Set(visited)));
      ranks[name] = 1 + Math.max(...depRanks);
    } else {
      ranks[name] = 0;
    }

    return ranks[name];
  }

  for (const name in deps) assignRank(name, new Set());

  const maxRank = Math.max(...Object.values(ranks));

  const typesByRank = new Array(maxRank + 1);
  for (let i = 0; i <= maxRank; i++) typesByRank[i] = [];
  for (const name in deps) typesByRank[ranks[name]].push(name);

  return typesByRank.flat();
}

// assumes keys are already escaped (or did not require escaping)
function renderObjectLiteral(entries) {
  const body = entries.map(({ key, value }) => `"${key}": ${value}`).join(', ');
  return `{${body}}`;
}

function renderJsType(node) {
  if ('checkedType' in node && !ignoredCheckedTypes.has(node.name)) {
    // hack
    let checkedType = node.checkedType;
    if ('checkedTypeName' in node) checkedType = { ...checkedType, name: node.checkedTypeName };
    return renderJsType(checkedType);
  } else if (layoutNodeIsLeaf(node)) {
    return leafName(node);
  } else {
    switch (node.type) {
      case 'object':
        return renderObjectLiteral(
          node.keys.map((key) => ({ key, value: renderJsType(node.entries[key]) }))
        );
      case 'array': {
        return `${renderJsType(node.inner)}[]`;
      }
      case 'option': {
        switch (node.optionType) {
          case 'orUndefined':
            return `${renderJsType(node.inner)} | undefined`;
          case 'flaggedOption':
            return `Option<${renderJsType(node.inner)}>`;
          case 'closedInterval':
            assert.strictEqual(node.inner.type, 'object');
            assert.deepEqual(node.inner.keys, ['lower', 'upper']);
            assert.deepEqual(node.inner.entries.lower, node.inner.entries.upper);
            return `Option<Range<${renderJsType(node.inner.entries.lower)}>>`;
        }
      }
      default:
        throw new Error(`unhandled layout node type: ${node.type}`);
    }
  }
}

function renderLayoutType(node) {
  if ('checkedType' in node && !ignoredCheckedTypes.has(node.name)) {
    // hack
    let checkedType = node.checkedType;
    if ('checkedTypeName' in node) checkedType = { ...checkedType, name: node.checkedTypeName };
    return renderLayoutType(checkedType);
  } else if (layoutNodeIsLeaf(node)) {
    const name = leafName(node);
    return `new BindingsType.Leaf.${capitalize(name)}`;
  } else {
    switch (node.type) {
      case 'object':
        return node.name;
      case 'array': {
        const inner = renderLayoutType(node.inner);
        const len =
          'staticLength' in node && !!node.staticLength ? node.staticLength.toString() : 'null';
        return `new BindingsType.Array({
          staticLength: ${len},
          inner: ${inner}
        })`;
      }
      case 'option': {
        switch (node.optionType) {
          case 'orUndefined':
            return `new BindingsType.Option.OrUndefined<${renderJsType(
              node.inner
            )}>(${renderLayoutType(node.inner)})`;
          case 'flaggedOption':
            return `new BindingsType.Option.Flagged(${renderLayoutType(node.inner)})`;
          case 'closedInterval':
            assert.strictEqual(node.inner.type, 'object');
            assert.deepEqual(node.inner.keys, ['lower', 'upper']);
            assert.deepEqual(node.inner.entries.lower, node.inner.entries.upper);
            return `new BindingsType.Option.ClosedInterval(${renderLayoutType(
              node.inner.entries.lower
            )})`;
        }
      }
      default:
        throw new Error(`unhandled layout node type: ${node.type}`);
    }
  }
}

function renderLayoutTypeDefinition(node) {
  assert.equal(node.type, 'object');

  const objType = renderObjectLiteral(
    node.keys.map((key) => ({ key, value: renderJsType(node.entries[key]) }))
  );

  const entries = renderObjectLiteral(
    node.keys.map((key) => ({ key, value: renderLayoutType(node.entries[key]) }))
  );

  return `\
    \ type ${node.name} = ${objType};
    \ const ${node.name}: BindingsType.Object<${node.name}> = new BindingsType.Object({
    \   name: '${node.name}',
    \   keys: ${JSON.stringify(node.keys)},
    \   entries: ${entries}
    \ });`;
}

if (process.argv.length < 3) {
  throw new Error('not enough arguments');
}

const inputFilepath = process.argv[2];
const outputFilepath = 3 in process.argv ? process.argv[3] : null;

const jsLayout = JSON.parse(await fs.readFile(inputFilepath, 'utf8'));
const jsTypes = catalogTypes(jsLayout);
const depOrderTypeNames = analyzeTypeDependencies(jsLayout);

let out = '';

out += "// @generated this file is auto-generated - don't edit it directly\n";
out += "import { BindingsType } from '../../v2/type.js';\n";
out += `\
  \ import {
  \   Actions,
  \   AuthRequired,
  \   Bool,
  \   Events,
  \   Field,
  \   Int64,
  \   Option,
  \   PublicKey,
  \   Range,
  \   Sign,
  \   StateHash,
  \   TokenId,
  \   TokenSymbol,
  \   UInt32,
  \   UInt64,
  \   ZkappUri
  \ } from '../../v2/leaves.js';\n`;

out += `export { Types, ${Object.keys(jsTypes).join(', ')} };\n`;

for (const typeName of depOrderTypeNames) {
  const jsType = jsTypes[typeName];
  if (jsType.type === 'object') {
    out += renderLayoutTypeDefinition(jsType);
    out += '\n';
  }
}

out += `\
  \ const Types: {[key: string]: BindingsType<any>} = {${Object.keys(jsTypes).join(', ')}};\n`;

const prettyOut = prettier.format(out, {
  parser: 'typescript',
  ...prettierRc,
});

if (outputFilepath !== null) {
  await fs.writeFile(outputFilepath, prettyOut);
} else {
  console.log(prettyOut);
}
