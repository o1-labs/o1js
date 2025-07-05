import { assert } from './errors.js';
export { Tuple, TupleN };
const Tuple = {
    map(tuple, f) {
        return tuple.map(f);
    },
};
const TupleN = {
    map(tuple, f) {
        return tuple.map(f);
    },
    fromArray(n, arr) {
        assert(arr.length === n, `Expected array of length ${n}, got ${arr.length}`);
        return arr;
    },
    hasLength(n, tuple) {
        return tuple.length === n;
    },
};
