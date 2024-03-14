/**
 * Stub module to break dependency cycle between Field and Bool classes and
 * core gadgets which they depend on but which need to create Fields and Bools,
 * or check if a value is a Field or a Bool.
 */
import type { Field, FieldVar, FieldConst } from '../field.js';
import type { Bool } from '../bool.js';

export {
  createField,
  createBool,
  isField,
  isBool,
  setFieldConstructor,
  setBoolConstructor,
};

let fieldConstructor: typeof Field | undefined;
let boolConstructor: typeof Bool | undefined;

function setFieldConstructor(constructor: typeof Field) {
  fieldConstructor = constructor;
}
function setBoolConstructor(constructor: typeof Bool) {
  boolConstructor = constructor;
}

function createField(
  value: string | number | bigint | Field | FieldVar | FieldConst
): Field {
  if (fieldConstructor === undefined)
    throw Error('Bug: Cannot construct a Field before the class was defined.');
  return new fieldConstructor(value);
}

function createBool(value: boolean | Bool | FieldVar): Bool {
  if (boolConstructor === undefined)
    throw Error('Bug: Cannot construct a Bool before the class was defined.');
  return new boolConstructor(value);
}

function isField(x: unknown): x is Field {
  if (fieldConstructor === undefined)
    throw Error('Bug: Cannot construct a Field before the class was defined.');
  return x instanceof fieldConstructor;
}

function isBool(x: unknown): x is Bool {
  if (boolConstructor === undefined)
    throw Error('Bug: Cannot construct a Bool before the class was defined.');
  return x instanceof boolConstructor;
}
