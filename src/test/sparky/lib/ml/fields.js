"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MlFieldConstArray = exports.MlFieldArray = void 0;
const field_js_1 = require("../provable/field.js");
const base_js_1 = require("./base.js");
const MlFieldArray = {
    to(arr) {
        return base_js_1.MlArray.to(arr.map((x) => x.value));
    },
    from([, ...arr]) {
        return arr.map((x) => new field_js_1.Field(x));
    },
};
exports.MlFieldArray = MlFieldArray;
const MlFieldConstArray = {
    to(arr) {
        return base_js_1.MlArray.to(arr.map((x) => x.toConstant().value[1]));
    },
    from([, ...arr]) {
        return arr.map((x) => new field_js_1.Field(x));
    },
};
exports.MlFieldConstArray = MlFieldConstArray;
