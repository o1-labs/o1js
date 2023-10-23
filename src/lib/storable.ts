import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  resolve,
  cacheDir,
} from './util/fs.js';
import { jsEnvironment } from '../bindings/crypto/bindings/env.js';

export { Storable };

/**
 * Interface for storing and retrieving values, for caching.
 * `read()` and `write()` can just throw errors on failure.
 */
type Storable = {
  /**
   * Read a value from the cache.
   *
   * @param key The key to read from the cache. Can safely be used as a file path.
   * @param type Specifies whether the data to be read is a utf8-encoded string or raw binary data. This was added
   * because node's `fs.readFileSync` returns garbage when reading string files without specifying the encoding.
   */
  read(key: string, type: 'string' | 'bytes'): Uint8Array;
  /**
   * Write a value to the cache.
   *
   * @param key The key of the data to write to the cache. This will be used by `read()` to retrieve the data. Can safely be used as a file path.
   * @param value The value to write to the cache, as a byte array.
   * @param type Specifies whether the value originated from a utf8-encoded string or raw binary data.
   */
  write(key: string, value: Uint8Array, type: 'string' | 'bytes'): void;
};

const None: Storable = {
  read() {
    throw Error('not available');
  },
  write() {
    throw Error('not available');
  },
};

const FileSystem = (cacheDirectory: string): Storable => ({
  read(key, type: 'string' | 'bytes') {
    if (jsEnvironment !== 'node') throw Error('file system not available');
    console.log('READ', key);
    if (type === 'string') {
      let string = readFileSync(resolve(cacheDirectory, key), 'utf8');
      return new TextEncoder().encode(string);
    } else {
      let buffer = readFileSync(resolve(cacheDirectory, key));
      return new Uint8Array(buffer.buffer);
    }
  },
  write(key, value, type: 'string' | 'bytes') {
    if (jsEnvironment !== 'node') throw Error('file system not available');
    console.log('WRITE', key);
    mkdirSync(cacheDirectory, { recursive: true });
    writeFileSync(resolve(cacheDirectory, key), value, {
      encoding: type === 'string' ? 'utf8' : undefined,
    });
  },
});

const FileSystemDefault = FileSystem(cacheDir('pickles'));

const Storable = {
  /**
   * Store data on the file system, in a directory of your choice.
   *
   * Note: this {@link Storable} only caches data in Node.js.
   */
  FileSystem,
  /**
   * Store data on the file system, in a standard cache directory depending on the OS.
   *
   * Note: this {@link Storable} only caches data in Node.js.
   */
  FileSystemDefault,
  /**
   * Don't store anything.
   */
  None,
};
