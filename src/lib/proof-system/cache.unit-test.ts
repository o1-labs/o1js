import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Cache, CacheHeader } from 'o1js';
import os from 'os';

function makeFakeHeader(): CacheHeader {
  return {
    version: 0,
    kind: 'lagrange-basis',
    persistentId: "fake-persistent-id",
    uniqueId: "fake-unique-id",
    dataType: "string",
  }
}

describe('Expected cache behaviour', () => {
  it('should throw on read and write with a none cache', () => {
    const cache = Cache.None
    const header: CacheHeader = makeFakeHeader();
    assert.throws(() => cache.read(header), "none cache should throw on read");


    const value: Uint8Array = new Uint8Array();

    assert.throws(() => cache.write(header, value), "none cache should throw on write");
  })

  it('should read and write to a temporary filesystem cache', () => {
    const tmpdir = os.tmpdir();
    const cache = Cache.FileSystem(tmpdir, true)
    const header: CacheHeader = makeFakeHeader();

    const value: Uint8Array = new Uint8Array(
      [1, 2, 3]
    )

    cache.write(header, value)

    const readValue = cache.read(header)

    assert.deepEqual(readValue, value, "filesystem cache read should match cache write")
    assert.deepEqual(readValue, new Uint8Array([1, 2, 3]), "filesystem cache read should match identically constructed data")
  })

  it('should read and write to the default filesystem cache', () => {
    const cache = Cache.FileSystemDefault
    const header: CacheHeader = makeFakeHeader();
    const value: Uint8Array = new Uint8Array([4, 5, 6])
    cache.write(header, value)
    const readValue = cache.read(header)
    assert.deepEqual(readValue, value, "filesystemDefault cache read should match cache write")
    assert.deepEqual(readValue, new Uint8Array([4, 5, 6]), "filesystemDefault cache read should match identically constructed data")
  });
});