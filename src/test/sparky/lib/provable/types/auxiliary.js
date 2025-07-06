"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomId = void 0;
const RandomId = {
    sizeInFields: () => 0,
    toFields: () => [],
    toAuxiliary: (v = Math.random()) => [v],
    fromFields: (_, [v]) => v,
    check: () => { },
    toValue: (x) => x,
    fromValue: (x) => x,
    toInput: () => ({}),
    empty: () => Math.random(),
};
exports.RandomId = RandomId;
