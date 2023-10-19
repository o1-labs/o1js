import { writeFileSync, readFileSync, mkdirSync } from './util/fs.js';
import { jsEnvironment } from '../bindings/crypto/bindings/env.js';

export { Storable };

/**
 * Interface for storing and retrieving values for caching.
 * `read()` and `write()` can just throw errors on failure.
 */
type Storable<T> = {
  read(key: string): T;
  write(key: string, value: T): void;
};

const FileSystem = (cacheDirectory: string): Storable<Uint8Array> => ({
  read(key) {
    if (jsEnvironment !== 'node') throw Error('file system not available');
    console.log('READ', key);
    let buffer = readFileSync(`${cacheDirectory}/${key}`);
    return new Uint8Array(buffer.buffer);
  },
  write(key, value) {
    if (jsEnvironment !== 'node') throw Error('file system not available');
    console.log('WRITE', key);
    mkdirSync(cacheDirectory, { recursive: true });
    writeFileSync(`${cacheDirectory}/${key}`, value);
  },
});

const FileSystemDefault = FileSystem('/tmp');

const Storable = {
  FileSystem,
  FileSystemDefault,
};
