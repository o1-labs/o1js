import { expect } from 'expect';
import { Poseidon, hashWithPrefix } from './poseidon-bigint.js';
import { callForestHashGeneric, CallForest } from './sign-zkapp-command.js';
import { prefixes } from '../../bindings/crypto/constants.js';
import { NetworkId } from './types.js';

type Leaf = bigint;

async function testCallForestPaddingCollision() {
  const net: NetworkId = 'testnet';
  const hashLeaf = (leaf: Leaf) => Poseidon.hash([leaf]);
  const hash = (leaf: Leaf, _networkId: NetworkId) => hashLeaf(leaf);

  const forestBase: CallForest<Leaf> = [{ accountUpdate: 1n, children: [] }];
  const forestPadded: CallForest<Leaf> = [
    { accountUpdate: 1n, children: [] },
    { accountUpdate: 0n, children: [] }, // extra trailing zero leaf
  ];

  const baseDigest = callForestHashGeneric(
    forestBase,
    hash,
    hashWithPrefix,
    0n,
    net
  );
  const paddedDigest = callForestHashGeneric(
    forestPadded,
    hash,
    hashWithPrefix,
    0n,
    net
  );

  expect(baseDigest).not.toEqual(paddedDigest);

  // Show the intermediate node hash differs when padding is added, by revealing
  // the cons hash structure explicitly.
  const nodeHashBase = hashWithPrefix(prefixes.accountUpdateNode, [
    hashLeaf(1n),
    0n,
  ]);
  const nodeHashPaddedFirst = nodeHashBase;
  const nodeHashPaddedSecond = hashWithPrefix(prefixes.accountUpdateNode, [
    hashLeaf(0n),
    0n,
  ]);
  const recomposedPadded = hashWithPrefix(prefixes.accountUpdateCons, [
    nodeHashPaddedSecond,
    hashWithPrefix(prefixes.accountUpdateCons, [nodeHashPaddedFirst, 0n]),
  ]);

  expect(paddedDigest).not.toEqual(recomposedPadded);
}

await testCallForestPaddingCollision();
