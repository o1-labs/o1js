import { writeFileSync, readFileSync, mkdirSync } from './util/fs.js';
import { jsEnvironment } from '../bindings/crypto/bindings/env.js';

export { Storable };

type Storable<T> = {
  write(key: string, value: T): boolean;
  read(key: string): T | undefined;
};

const FileSystem = (cacheDirectory: string): Storable<Uint8Array> => ({
  read(key) {
    if (jsEnvironment !== 'node') return undefined;
    console.log('READ', key);
    try {
      let buffer = readFileSync(`${cacheDirectory}/${key}`);
      return new Uint8Array(buffer.buffer);
    } catch (e: any) {
      console.log('read failed', e.message);
      return undefined;
    }
  },
  write(key, value) {
    if (jsEnvironment !== 'node') return false;
    console.log('WRITE', key);
    try {
      mkdirSync(cacheDirectory, { recursive: true });
      writeFileSync(`${cacheDirectory}/${key}`, value);
      return true;
    } catch (e: any) {
      console.log('write failed', e.message);
      return false;
    }
  },
});

const FileSystemDefault = FileSystem('/tmp');

const Storable = {
  FileSystem,
  FileSystemDefault,
};
