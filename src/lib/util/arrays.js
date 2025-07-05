import { assert } from './errors.js';
export { chunk, chunkString, zip, pad, mapObject, mapToObject };
function chunk(array, size) {
    assert(array.length % size === 0, `chunk(): invalid input length, it must be a multiple of ${size}`);
    return Array.from({ length: array.length / size }, (_, i) => array.slice(size * i, size * (i + 1)));
}
function chunkString(str, size) {
    return chunk([...str], size).map((c) => c.join(''));
}
function zip(a, b) {
    assert(a.length <= b.length, 'zip(): second array must be at least as long as the first array');
    return a.map((a, i) => [a, b[i]]);
}
function pad(array, size, value) {
    assert(array.length <= size, `target size ${size} should be greater or equal than the length of the array ${array.length}`);
    return array.concat(Array.from({ length: size - array.length }, () => value));
}
function mapObject(t, fn) {
    let s = {};
    let i = 0;
    for (let key in t) {
        s[key] = fn(t[key], key, i);
        i++;
    }
    return s;
}
function mapToObject(keys, fn) {
    let s = {};
    keys.forEach((key, i) => {
        s[key] = fn(key, i);
    });
    return s;
}
