export { createField, createBool, createBoolUnsafe, isField, isBool, getField, getBool, setFieldConstructor, setBoolConstructor, };
let fieldConstructor;
let boolConstructor;
function setFieldConstructor(constructor) {
    fieldConstructor = constructor;
}
function setBoolConstructor(constructor) {
    boolConstructor = constructor;
}
function createField(value) {
    if (fieldConstructor === undefined)
        throw Error('Cannot construct a Field before the class was defined.');
    return new fieldConstructor(value);
}
function createBool(value) {
    if (boolConstructor === undefined)
        throw Error('Cannot construct a Bool before the class was defined.');
    return new boolConstructor(value);
}
function createBoolUnsafe(value) {
    return getBool().Unsafe.fromField(value);
}
function isField(x) {
    if (fieldConstructor === undefined)
        throw Error('Cannot check for instance of Field before the class was defined.');
    return x instanceof fieldConstructor;
}
function isBool(x) {
    if (boolConstructor === undefined)
        throw Error('Cannot check for instance of Bool before the class was defined.');
    return x instanceof boolConstructor;
}
function getField() {
    if (fieldConstructor === undefined)
        throw Error('Field class not defined yet.');
    return fieldConstructor;
}
function getBool() {
    if (boolConstructor === undefined)
        throw Error('Bool class not defined yet.');
    return boolConstructor;
}
