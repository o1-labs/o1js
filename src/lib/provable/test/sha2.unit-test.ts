// In-circuit tests of the SHA2 family of hash functions together with
// test vectors extracted from https://www.di-mgt.com.au/sha_testvectors.html

import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Bytes } from '../wrapped-classes.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { sha256 as nobleSha256, sha224 as nobleSha224 } from '@noble/hashes/sha256';
import { sha384 as nobleSha384, sha512 as nobleSha512 } from '@noble/hashes/sha512';
import { bytes } from './test-utils.js';
import { equivalentAsync, equivalentProvable } from '../../testing/equivalent.js';
import { Random, sample } from '../../testing/random.js';
import { expect } from 'expect';

// SHA2-224 TESTS
{
  sample(Random.nat(400), 5).forEach((preimageLength) => {
    let inputBytes = bytes(preimageLength);
    let outputBytes = bytes(224 / 8);

    equivalentProvable({ from: [inputBytes], to: outputBytes, verbose: true })(
      (x) => nobleSha224(x),
      (x) => Gadgets.SHA2.hash(224, x),
      `sha224 preimage length ${preimageLength}`
    );
  });

  const Sha2_224Program = ZkProgram({
    name: `sha2-224`,
    publicOutput: Bytes(28),
    methods: {
      sha224: {
        privateInputs: [Bytes(192)],
        async method(preImage: Bytes) {
          return {
            publicOutput: Gadgets.SHA2.hash(224, preImage),
          };
        },
      },
    },
  });

  const RUNS = 2;

  await Sha2_224Program.compile();

  await equivalentAsync(
    {
      from: [bytes(192)],
      to: bytes(28),
    },
    { runs: RUNS }
  )(nobleSha224, async (x) => {
    const { proof } = await Sha2_224Program.sha224(x);
    await Sha2_224Program.verify(proof);
    return proof.publicOutput;
  });

  for (let { preimage, hash } of testVectors()) {
    let actual = Gadgets.SHA2.hash(224, Bytes.fromString(preimage));
    expect(actual.toHex()).toEqual(hash);
  }

  function testVectors() {
    return [
      {
        preimage: 'abc',
        hash: '23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7',
      },
      {
        preimage: 'a'.repeat(1000000),
        hash: '20794655980c91d8bbb4c1ea97618a4bf03f42581948b2ee4ee7ad67',
      },
      {
        preimage: '',
        hash: 'd14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f',
      },
      {
        preimage:
          'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
        hash: 'c97ca9a559850ce97a04a96def6d99a9e0e0e2ab14e6b8df265fc0b3',
      },
    ];
  }
}

// SHA2-256 TESTS
{
  sample(Random.nat(400), 5).forEach((preimageLength) => {
    let inputBytes = bytes(preimageLength);
    let outputBytes = bytes(256 / 8);

    equivalentProvable({ from: [inputBytes], to: outputBytes, verbose: true })(
      (x) => nobleSha256(x),
      (x) => Gadgets.SHA2.hash(256, x),
      `sha256 preimage length ${preimageLength}`
    );
  });

  const Sha2_256Program = ZkProgram({
    name: `sha2-256`,
    publicOutput: Bytes(32),
    methods: {
      sha256: {
        privateInputs: [Bytes(192)],
        async method(preImage: Bytes) {
          return {
            publicOutput: Gadgets.SHA2.hash(256, preImage),
          };
        },
      },
    },
  });

  const RUNS = 2;

  await Sha2_256Program.compile();

  await equivalentAsync(
    {
      from: [bytes(192)],
      to: bytes(32),
    },
    { runs: RUNS }
  )(nobleSha256, async (x) => {
    const { proof } = await Sha2_256Program.sha256(x);
    await Sha2_256Program.verify(proof);
    return proof.publicOutput;
  });

  for (let { preimage, hash } of testVectors()) {
    let actual = Gadgets.SHA2.hash(256, Bytes.fromString(preimage));
    expect(actual.toHex()).toEqual(hash);
  }

  function testVectors() {
    return [
      {
        preimage: 'abc',
        hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      },
      {
        preimage: 'a'.repeat(1000000),
        hash: 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
      },
      {
        preimage: '',
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
      {
        preimage:
          'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
        hash: 'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1',
      },
    ];
  }
}

// SHA2-384 TESTS
{
  sample(Random.nat(400), 5).forEach((preimageLength) => {
    let inputBytes = bytes(preimageLength);
    let outputBytes = bytes(384 / 8);

    equivalentProvable({ from: [inputBytes], to: outputBytes, verbose: true })(
      (x) => nobleSha384(x),
      (x) => Gadgets.SHA2.hash(384, x),
      `sha384 preimage length ${preimageLength}`
    );
  });

  const Sha2_384Program = ZkProgram({
    name: `sha2-384`,
    publicOutput: Bytes(48),
    methods: {
      sha384: {
        privateInputs: [Bytes(192)],
        async method(preImage: Bytes) {
          return {
            publicOutput: Gadgets.SHA2.hash(384, preImage),
          };
        },
      },
    },
  });

  const RUNS = 2;

  await Sha2_384Program.compile();

  await equivalentAsync(
    {
      from: [bytes(192)],
      to: bytes(48),
    },
    { runs: RUNS }
  )(nobleSha384, async (x) => {
    const { proof } = await Sha2_384Program.sha384(x);
    await Sha2_384Program.verify(proof);
    return proof.publicOutput;
  });

  for (let { preimage, hash } of testVectors()) {
    let actual = Gadgets.SHA2.hash(384, Bytes.fromString(preimage));
    expect(actual.toHex()).toEqual(hash);
  }

  function testVectors() {
    return [
      {
        preimage: 'abc',
        hash: 'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
      },
      {
        preimage: 'a'.repeat(1000000),
        hash: '9d0e1809716474cb086e834e310a4a1ced149e9c00f248527972cec5704c2a5b07b8b3dc38ecc4ebae97ddd87f3d8985',
      },
      {
        preimage: '',
        hash: '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b',
      },
      {
        preimage:
          'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
        hash: '09330c33f71147e83d192fc782cd1b4753111b173b3b05d22fa08086e3b0f712fcc7c71a557e2db966c3e9fa91746039',
      },
    ];
  }
}

// SHA2-512 TESTS
{
  sample(Random.nat(400), 5).forEach((preimageLength) => {
    let inputBytes = bytes(preimageLength);
    let outputBytes = bytes(512 / 8);

    equivalentProvable({ from: [inputBytes], to: outputBytes, verbose: true })(
      (x) => nobleSha512(x),
      (x) => Gadgets.SHA2.hash(512, x),
      `sha512 preimage length ${preimageLength}`
    );
  });

  const Sha2_512Program = ZkProgram({
    name: `sha2-512`,
    publicOutput: Bytes(64),
    methods: {
      sha512: {
        privateInputs: [Bytes(192)],
        async method(preImage: Bytes) {
          return {
            publicOutput: Gadgets.SHA2.hash(512, preImage),
          };
        },
      },
    },
  });

  const RUNS = 2;

  await Sha2_512Program.compile();

  await equivalentAsync(
    {
      from: [bytes(192)],
      to: bytes(64),
    },
    { runs: RUNS }
  )(nobleSha512, async (x) => {
    const { proof } = await Sha2_512Program.sha512(x);
    await Sha2_512Program.verify(proof);
    return proof.publicOutput;
  });

  for (let { preimage, hash } of testVectors()) {
    let actual = Gadgets.SHA2.hash(512, Bytes.fromString(preimage));
    expect(actual.toHex()).toEqual(hash);
  }

  function testVectors() {
    return [
      {
        preimage: 'abc',
        hash: 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
      },
      {
        preimage: 'a'.repeat(1000000),
        hash: 'e718483d0ce769644e2e42c7bc15b4638e1f98b13b2044285632a803afa973ebde0ff244877ea60a4cb0432ce577c31beb009c5c2c49aa2e4eadb217ad8cc09b',
      },
      {
        preimage: '',
        hash: 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
      },
      {
        preimage:
          'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
        hash: '8e959b75dae313da8cf4f72814fc143f8f7779c6eb9f7fa17299aeadb6889018501d289e4900f7e4331b99dec4b5433ac7d329eeb6dd26545e96e55b874be909',
      },
    ];
  }
}
