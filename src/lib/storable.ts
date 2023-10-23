import { writeFileSync, readFileSync, mkdirSync, cacheDir } from './util/fs.js';
import { jsEnvironment } from '../bindings/crypto/bindings/env.js';

export { Storable };

/**
 * Interface for storing and retrieving values for caching.
 * `read()` and `write()` can just throw errors on failure.
 */
type Storable = {
  read(key: string, type: 'string' | 'bytes'): Uint8Array;
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
      let string = readFileSync(`${cacheDirectory}/${key}`, 'utf8');
      return new TextEncoder().encode(string);
    } else {
      let buffer = readFileSync(`${cacheDirectory}/${key}`);
      return new Uint8Array(buffer.buffer);
    }
  },
  write(key, value, type: 'string' | 'bytes') {
    if (jsEnvironment !== 'node') throw Error('file system not available');
    console.log('WRITE', key);
    mkdirSync(cacheDirectory, { recursive: true });
    writeFileSync(`${cacheDirectory}/${key}`, value, {
      encoding: type === 'string' ? 'utf8' : undefined,
    });
  },
});

const FileSystemDefault = FileSystem(cacheDir('pickles'));

const Storable = {
  FileSystem,
  FileSystemDefault,
  None,
};
