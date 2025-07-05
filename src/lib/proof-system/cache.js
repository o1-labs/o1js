import { writeFileSync, readFileSync, mkdirSync, resolve, cacheDir } from '../util/fs.js';
import { jsEnvironment } from '../../bindings/crypto/bindings/env.js';
// external API
export { Cache };
// internal API
export { readCache, writeCache, withVersion, cacheHeaderVersion, LAGRANGE_BASIS_PREFIX };
const cacheHeaderVersion = 1;
const LAGRANGE_BASIS_PREFIX = 'lagrange-basis';
function withVersion(header, version = cacheHeaderVersion) {
    let uniqueId = `${header.uniqueId}-${version}`;
    return { ...header, version, uniqueId };
}
function readCache(cache, header, transform) {
    try {
        let result = cache.read(header);
        if (result === undefined) {
            if (cache.debug)
                console.trace('cache miss');
            return undefined;
        }
        if (transform === undefined)
            return result;
        return transform(result);
    }
    catch (e) {
        if (cache.debug)
            console.log('Failed to read cache', e);
        return undefined;
    }
}
function writeCache(cache, header, value) {
    if (!cache.canWrite)
        return false;
    try {
        cache.write(header, value);
        return true;
    }
    catch (e) {
        if (cache.debug)
            console.log('Failed to write cache', e);
        return false;
    }
}
const None = {
    read() {
        throw Error('not available');
    },
    write() {
        throw Error('not available');
    },
    canWrite: false,
};
const FileSystem = (cacheDirectory, debug) => ({
    read({ persistentId, uniqueId, dataType }) {
        if (jsEnvironment !== 'node')
            throw Error('file system not available');
        // read current uniqueId, return data if it matches
        let currentId = readFileSync(resolve(cacheDirectory, `${persistentId}.header`), 'utf8');
        if (currentId !== uniqueId)
            return undefined;
        if (dataType === 'string') {
            let string = readFileSync(resolve(cacheDirectory, persistentId), 'utf8');
            return new TextEncoder().encode(string);
        }
        else {
            let buffer = readFileSync(resolve(cacheDirectory, persistentId));
            return new Uint8Array(buffer.buffer);
        }
    },
    write({ persistentId, uniqueId, dataType }, data) {
        if (jsEnvironment !== 'node')
            throw Error('file system not available');
        mkdirSync(cacheDirectory, { recursive: true });
        writeFileSync(resolve(cacheDirectory, `${persistentId}.header`), uniqueId, {
            encoding: 'utf8',
        });
        writeFileSync(resolve(cacheDirectory, persistentId), data, {
            encoding: dataType === 'string' ? 'utf8' : undefined,
        });
    },
    canWrite: jsEnvironment === 'node',
    debug,
});
const FileSystemDefault = FileSystem(cacheDir('o1js'));
const Cache = {
    /**
     * Store data on the file system, in a directory of your choice.
     *
     * Data will be stored in two files per cache entry: a data file and a `.header` file.
     * The header file just contains a unique string which is used to determine whether we can use the cached data.
     *
     * Note: this {@link Cache} only caches data in Node.js.
     */
    FileSystem,
    /**
     * Store data on the file system, in a standard cache directory depending on the OS.
     *
     * Data will be stored in two files per cache entry: a data file and a `.header` file.
     * The header file just contains a unique string which is used to determine whether we can use the cached data.
     *
     * Note: this {@link Cache} only caches data in Node.js.
     */
    FileSystemDefault,
    /**
     * Don't store anything.
     */
    None,
};
