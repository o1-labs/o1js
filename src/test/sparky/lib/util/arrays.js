"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapToObject = exports.mapObject = exports.pad = exports.zip = exports.chunkString = exports.chunk = void 0;
const errors_js_1 = require("./errors.js");
function chunk(array, size) {
    (0, errors_js_1.assert)(array.length % size === 0, `chunk(): invalid input length, it must be a multiple of ${size}`);
    return Array.from({ length: array.length / size }, (_, i) => array.slice(size * i, size * (i + 1)));
}
exports.chunk = chunk;
function chunkString(str, size) {
    return chunk([...str], size).map((c) => c.join(''));
}
exports.chunkString = chunkString;
function zip(a, b) {
    (0, errors_js_1.assert)(a.length <= b.length, 'zip(): second array must be at least as long as the first array');
    return a.map((a, i) => [a, b[i]]);
}
exports.zip = zip;
function pad(array, size, value) {
    (0, errors_js_1.assert)(array.length <= size, `target size ${size} should be greater or equal than the length of the array ${array.length}`);
    return array.concat(Array.from({ length: size - array.length }, () => value));
}
exports.pad = pad;
function mapObject(t, fn) {
    let s = {};
    let i = 0;
    for (let key in t) {
        s[key] = fn(t[key], key, i);
        i++;
    }
    return s;
}
exports.mapObject = mapObject;
function mapToObject(keys, fn) {
    let s = {};
    keys.forEach((key, i) => {
        s[key] = fn(key, i);
    });
    return s;
}
exports.mapToObject = mapToObject;
