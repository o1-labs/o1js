"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inTable = exports.rangeCheck3x12 = void 0;
const field_js_1 = require("../field.js");
const gates_js_1 = require("../gates.js");
function rangeCheck3x12(v0, v1, v2) {
    // Checks that all three input values exist in the RANGE_CHECK_TABLE (tableId: 1)
    // v0, v1, v2 are used as the table keys
    // The table "values" (inputs no 3, 5, 7) are 0 because the table only has one column
    gates_js_1.Gates.lookup(
    // table id
    field_js_1.Field.from(1), v0, field_js_1.Field.from(0), v1, field_js_1.Field.from(0), v2, field_js_1.Field.from(0));
}
exports.rangeCheck3x12 = rangeCheck3x12;
/**
 * In-circuit check that up to 3 pairs of index and value are in the runtime
 * table given by the identifier. Each given pair is a tuple composed of a
 * bigint and a Field.
 *
 * **Note**: The runtime table must be configured before calling this function.
 *
 * **Note**: Table id 0 and 1 are reserved values, do not use them.
 *
 * @param id
 * @param pair0
 * @param pair1
 * @param pair2
 */
function inTable(id, pair0, pair1, pair2) {
    let [idx0, v0] = pair0;
    let [idx1, v1] = pair1 === undefined ? pair0 : pair1;
    let [idx2, v2] = pair2 === undefined ? pair0 : pair2;
    gates_js_1.Gates.lookup(field_js_1.Field.from(id), field_js_1.Field.from(idx0), v0, field_js_1.Field.from(idx1), v1, field_js_1.Field.from(idx2), v2);
}
exports.inTable = inTable;
