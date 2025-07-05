export { withPrefix, mapTuple };
function withPrefix(prefix, obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => {
        return [`${prefix}_${k}`, v];
    }));
}
function mapTuple(tuple, f) {
    return tuple.map(f);
}
