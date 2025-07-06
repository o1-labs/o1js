"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MlTuple = exports.MlResult = exports.MlBool = exports.MlOption = exports.MlPair = exports.MlArray = void 0;
const MlArray = {
    to(arr) {
        return [0, ...arr];
    },
    from([, ...arr]) {
        return arr;
    },
    map([, ...arr], map) {
        return [0, ...arr.map(map)];
    },
    mapTo(arr, map) {
        return [0, ...arr.map(map)];
    },
    mapFrom([, ...arr], map) {
        return arr.map(map);
    },
};
exports.MlArray = MlArray;
const MlPair = Object.assign(function MlTuple(x, y) {
    return [0, x, y];
}, {
    from([, x, y]) {
        return [x, y];
    },
    first(t) {
        return t[1];
    },
    second(t) {
        return t[2];
    },
});
exports.MlPair = MlPair;
const MlBool = Object.assign(function MlBool(b) {
    return b ? 1 : 0;
}, {
    from(b) {
        return !!b;
    },
});
exports.MlBool = MlBool;
const MlOption = Object.assign(function MlOption(x) {
    return x === undefined ? 0 : [0, x];
}, {
    from(option) {
        return option === 0 ? undefined : option[1];
    },
    map(option, map) {
        if (option === 0)
            return 0;
        return [0, map(option[1])];
    },
    mapFrom(option, map) {
        if (option === 0)
            return undefined;
        return map(option[1]);
    },
    mapTo(option, map) {
        if (option === undefined)
            return 0;
        return [0, map(option)];
    },
    isNone(option) {
        return option === 0;
    },
    isSome(option) {
        return option !== 0;
    },
});
exports.MlOption = MlOption;
const MlResult = {
    ok(t) {
        return [0, t];
    },
    unitError() {
        return [1, 0];
    },
};
exports.MlResult = MlResult;
const MlTuple = {
    map([, ...mlTuple], f) {
        return [0, ...mlTuple.map(f)];
    },
    mapFrom([, ...mlTuple], f) {
        return mlTuple.map(f);
    },
    mapTo(tuple, f) {
        return [0, ...tuple.map(f)];
    },
};
exports.MlTuple = MlTuple;
