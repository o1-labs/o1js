"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAGRANGE_BASIS_PREFIX = exports.cacheHeaderVersion = exports.withVersion = exports.writeCache = exports.readCache = exports.Cache = void 0;
const fs_js_1 = require("../util/fs.js");
const env_js_1 = require("../../bindings/crypto/bindings/env.js");
const cacheHeaderVersion = 1;
exports.cacheHeaderVersion = cacheHeaderVersion;
const LAGRANGE_BASIS_PREFIX = 'lagrange-basis';
exports.LAGRANGE_BASIS_PREFIX = LAGRANGE_BASIS_PREFIX;
function withVersion(header, version = cacheHeaderVersion) {
    let uniqueId = `${header.uniqueId}-${version}`;
    return { ...header, version, uniqueId };
}
exports.withVersion = withVersion;
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
exports.readCache = readCache;
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
exports.writeCache = writeCache;
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
        if (env_js_1.jsEnvironment !== 'node')
            throw Error('file system not available');
        // read current uniqueId, return data if it matches
        let currentId = (0, fs_js_1.readFileSync)((0, fs_js_1.resolve)(cacheDirectory, `${persistentId}.header`), 'utf8');
        if (currentId !== uniqueId)
            return undefined;
        if (dataType === 'string') {
            let string = (0, fs_js_1.readFileSync)((0, fs_js_1.resolve)(cacheDirectory, persistentId), 'utf8');
            return new TextEncoder().encode(string);
        }
        else {
            let buffer = (0, fs_js_1.readFileSync)((0, fs_js_1.resolve)(cacheDirectory, persistentId));
            return new Uint8Array(buffer.buffer);
        }
    },
    write({ persistentId, uniqueId, dataType }, data) {
        if (env_js_1.jsEnvironment !== 'node')
            throw Error('file system not available');
        (0, fs_js_1.mkdirSync)(cacheDirectory, { recursive: true });
        (0, fs_js_1.writeFileSync)((0, fs_js_1.resolve)(cacheDirectory, `${persistentId}.header`), uniqueId, {
            encoding: 'utf8',
        });
        (0, fs_js_1.writeFileSync)((0, fs_js_1.resolve)(cacheDirectory, persistentId), data, {
            encoding: dataType === 'string' ? 'utf8' : undefined,
        });
    },
    canWrite: env_js_1.jsEnvironment === 'node',
    debug,
});
const FileSystemDefault = FileSystem((0, fs_js_1.cacheDir)('o1js'));
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
exports.Cache = Cache;
