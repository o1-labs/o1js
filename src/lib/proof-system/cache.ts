import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  resolve,
  cacheDir,
} from '../util/fs.js';
import { jsEnvironment } from '../../bindings/crypto/bindings/env.js';

// external API
export { Cache, CacheHeader };

// internal API
export { readCache, writeCache, withVersion, cacheHeaderVersion };

/**
 * Interface for storing and retrieving values, for caching.
 * `read()` and `write()` can just throw errors on failure.
 */
type Cache = {
  /**
   * Read a value from the cache.
   *
   * @param header A small header to identify what is read from the cache.
   */
  read(header: CacheHeader): Uint8Array | undefined;
  /**
   * Write a value to the cache.
   *
   * @param header A small header to identify what is written to the cache. This will be used by `read()` to retrieve the data.
   * @param value The value to write to the cache, as a byte array.
   */
  write(header: CacheHeader, value: Uint8Array): void;
  /**
   * Indicates whether the cache is writable.
   */
  canWrite: boolean;
  /**
   * If `isDebug` is toggled, cache read and write errors are logged to the console.
   *
   * By default, cache errors are silent, because they don't necessarily represent an error condition,
   * but could just be a cache miss or file system permissions incompatible with writing data.
   */
  debug?: boolean;
};

const cacheHeaderVersion = 1;

type CommonHeader = {
  /**
   * Header version to avoid parsing incompatible headers.
   */
  version: number;
  /**
   * An identifier that is persistent even as versions of the data change. Safe to use as a file path.
   */
  persistentId: string;
  /**
   * A unique identifier for the data to be read. Safe to use as a file path.
   */
  uniqueId: string;
  /**
   * Specifies whether the data to be read is a utf8-encoded string or raw binary data. This was added
   * because node's `fs.readFileSync` returns garbage when reading string files without specifying the encoding.
   */
  dataType: 'string' | 'bytes';
};

type StepKeyHeader<Kind> = {
  kind: Kind;
  programName: string;
  methodName: string;
  methodIndex: number;
  hash: string;
};
type WrapKeyHeader<Kind> = { kind: Kind; programName: string; hash: string };
type PlainHeader<Kind> = { kind: Kind };

/**
 * A header that is passed to the caching layer, to support rich caching strategies.
 *
 * Both `uniqueId` and `programId` can safely be used as a file path.
 */
type CacheHeader = (
  | StepKeyHeader<'step-pk'>
  | StepKeyHeader<'step-vk'>
  | WrapKeyHeader<'wrap-pk'>
  | WrapKeyHeader<'wrap-vk'>
  | PlainHeader<'srs'>
  | PlainHeader<'lagrange-basis'>
) &
  CommonHeader;

function withVersion(
  header: Omit<CacheHeader, 'version'>,
  version = cacheHeaderVersion
): CacheHeader {
  let uniqueId = `${header.uniqueId}-${version}`;
  return { ...header, version, uniqueId } as CacheHeader;
}

// default methods to interact with a cache

function readCache(cache: Cache, header: CacheHeader): Uint8Array | undefined;
function readCache<T>(
  cache: Cache,
  header: CacheHeader,
  transform: (x: Uint8Array) => T
): T | undefined;
function readCache<T>(
  cache: Cache,
  header: CacheHeader,
  transform?: (x: Uint8Array) => T
): T | undefined {
  try {
    let result = cache.read(header);
    if (result === undefined) {
      if (cache.debug) console.trace('cache miss');
      return undefined;
    }
    if (transform === undefined) return result as any as T;
    return transform(result);
  } catch (e) {
    if (cache.debug) console.log('Failed to read cache', e);
    return undefined;
  }
}

function writeCache(cache: Cache, header: CacheHeader, value: Uint8Array) {
  if (!cache.canWrite) return false;
  try {
    cache.write(header, value);
    return true;
  } catch (e) {
    if (cache.debug) console.log('Failed to write cache', e);
    return false;
  }
}

const None: Cache = {
  read() {
    throw Error('not available');
  },
  write() {
    throw Error('not available');
  },
  canWrite: false,
};

const FileSystem = (cacheDirectory: string): Cache => ({
  read({ persistentId, uniqueId, dataType }) {
    if (jsEnvironment !== 'node') throw Error('file system not available');

    // read current uniqueId, return data if it matches
    let currentId = readFileSync(
      resolve(cacheDirectory, `${persistentId}.header`),
      'utf8'
    );
    if (currentId !== uniqueId) return undefined;

    if (dataType === 'string') {
      let string = readFileSync(resolve(cacheDirectory, persistentId), 'utf8');
      return new TextEncoder().encode(string);
    } else {
      let buffer = readFileSync(resolve(cacheDirectory, persistentId));
      return new Uint8Array(buffer.buffer);
    }
  },
  write({ persistentId, uniqueId, dataType }, data) {
    if (jsEnvironment !== 'node') throw Error('file system not available');
    mkdirSync(cacheDirectory, { recursive: true });
    writeFileSync(resolve(cacheDirectory, `${persistentId}.header`), uniqueId, {
      encoding: 'utf8',
    });
    writeFileSync(resolve(cacheDirectory, persistentId), data, {
      encoding: dataType === 'string' ? 'utf8' : undefined,
    });
  },
  canWrite: jsEnvironment === 'node',
});

const FileSystemDefault = FileSystem(cacheDir('o1js'));

const Cache = {
  /**
   * Store data on the file system, in a directory of your choice.
   *
   * Note: this {@link Cache} only caches data in Node.js.
   */
  FileSystem,
  /**
   * Store data on the file system, in a standard cache directory depending on the OS.
   *
   * Note: this {@link Cache} only caches data in Node.js.
   */
  FileSystemDefault,
  /**
   * Don't store anything.
   */
  None,
};
