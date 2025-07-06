"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHashHelpers = void 0;
const binable_js_1 = require("../../../bindings/lib/binable.js");
function createHashHelpers(Field, Hash) {
    function salt(prefix) {
        return Hash.update(Hash.initialState(), [(0, binable_js_1.prefixToField)(Field, prefix)]);
    }
    function emptyHashWithPrefix(prefix) {
        return salt(prefix)[0];
    }
    function hashWithPrefix(prefix, input) {
        let init = salt(prefix);
        return Hash.update(init, input)[0];
    }
    return { salt, emptyHashWithPrefix, hashWithPrefix };
}
exports.createHashHelpers = createHashHelpers;
