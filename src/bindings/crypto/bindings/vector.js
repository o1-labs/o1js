import { withPrefix } from './util.js';
export { FpVectorBindings, FqVectorBindings };
const FieldVectorBindings = {
    create() {
        // OCaml tag for arrays, so that we can use the same utility fns on both
        return [0];
    },
    length(v) {
        return v.length - 1;
    },
    emplace_back(v, x) {
        v.push(x);
    },
    get(v, i) {
        let value = v[i + 1];
        if (value === undefined) {
            throw Error(`FieldVector.get(): Index out of bounds, got ${i}/${v.length - 1}`);
        }
        // copying to a new array to break mutable reference
        return [...value];
    },
    set(v, i, x) {
        v[i + 1] = x;
    },
};
const FpVectorBindings = withPrefix('caml_fp_vector', FieldVectorBindings);
const FqVectorBindings = withPrefix('caml_fq_vector', FieldVectorBindings);
