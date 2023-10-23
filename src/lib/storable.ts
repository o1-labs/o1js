import { writeFileSync, readFileSync, mkdirSync } from './util/fs.js';
import { jsEnvironment } from '../bindings/crypto/bindings/env.js';

export { Storable };

/**
 * Interface for storing and retrieving values for caching.
 * `read()` and `write()` can just throw errors on failure.
 */
type Storable<T> = {
  read(key: string, type: 'string' | 'bytes'): T;
  write(key: string, value: T, type: 'string' | 'bytes'): void;
};

const FileSystem = (cacheDirectory: string): Storable<Uint8Array> => ({
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

const FileSystemDefault = FileSystem('/tmp');

const Storable = {
  FileSystem,
  FileSystemDefault,
};
