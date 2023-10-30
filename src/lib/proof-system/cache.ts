import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  resolve,
  cacheDir,
} from '../util/fs.js';
import { jsEnvironment } from '../../bindings/crypto/bindings/env.js';

export { Cache, CacheHeader, cacheHeaderVersion };

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
};

const cacheHeaderVersion = 0.1;

type CommonHeader = {
  /**
   * Header version to avoid parsing incompatible headers.
   */
  version: number;
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
  programId: string;
  methodName: string;
  methodIndex: number;
  hash: string;
};
type WrapKeyHeader<Kind> = { kind: Kind; programId: string; hash: string };

/**
 * A header that is passed to the caching layer, to support richer caching strategies.
 *
 * Both `uniqueId` and `programId` can safely be used as a file path.
 */
type CacheHeader = (
  | StepKeyHeader<'step-pk'>
  | StepKeyHeader<'step-vk'>
  | WrapKeyHeader<'wrap-pk'>
  | WrapKeyHeader<'wrap-vk'>
) &
  CommonHeader;

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
  read({ uniqueId, dataType }) {
    if (jsEnvironment !== 'node') throw Error('file system not available');
    if (dataType === 'string') {
      let string = readFileSync(resolve(cacheDirectory, uniqueId), 'utf8');
      return new TextEncoder().encode(string);
    } else {
      let buffer = readFileSync(resolve(cacheDirectory, uniqueId));
      return new Uint8Array(buffer.buffer);
    }
  },
  write({ uniqueId, dataType }, data) {
    if (jsEnvironment !== 'node') throw Error('file system not available');
    mkdirSync(cacheDirectory, { recursive: true });
    writeFileSync(resolve(cacheDirectory, uniqueId), data, {
      encoding: dataType === 'string' ? 'utf8' : undefined,
    });
  },
  canWrite: jsEnvironment === 'node',
});

const FileSystemDefault = FileSystem(cacheDir('pickles'));

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
