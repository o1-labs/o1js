"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBoolConstructor = exports.setFieldConstructor = exports.getBool = exports.getField = exports.isBool = exports.isField = exports.createBoolUnsafe = exports.createBool = exports.createField = void 0;
let fieldConstructor;
let boolConstructor;
function setFieldConstructor(constructor) {
    fieldConstructor = constructor;
}
exports.setFieldConstructor = setFieldConstructor;
function setBoolConstructor(constructor) {
    boolConstructor = constructor;
}
exports.setBoolConstructor = setBoolConstructor;
function createField(value) {
    if (fieldConstructor === undefined)
        throw Error('Cannot construct a Field before the class was defined.');
    return new fieldConstructor(value);
}
exports.createField = createField;
function createBool(value) {
    if (boolConstructor === undefined)
        throw Error('Cannot construct a Bool before the class was defined.');
    return new boolConstructor(value);
}
exports.createBool = createBool;
function createBoolUnsafe(value) {
    return getBool().Unsafe.fromField(value);
}
exports.createBoolUnsafe = createBoolUnsafe;
function isField(x) {
    if (fieldConstructor === undefined)
        throw Error('Cannot check for instance of Field before the class was defined.');
    return x instanceof fieldConstructor;
}
exports.isField = isField;
function isBool(x) {
    if (boolConstructor === undefined)
        throw Error('Cannot check for instance of Bool before the class was defined.');
    return x instanceof boolConstructor;
}
exports.isBool = isBool;
function getField() {
    if (fieldConstructor === undefined)
        throw Error('Field class not defined yet.');
    return fieldConstructor;
}
exports.getField = getField;
function getBool() {
    if (boolConstructor === undefined)
        throw Error('Bool class not defined yet.');
    return boolConstructor;
}
exports.getBool = getBool;
