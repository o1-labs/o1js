/**
 * Stub module to break dependency cycle between Field and Bool classes and
 * core gadgets which they depend on but which need to create Fields and Bools,
 * or check if a value is a Field or a Bool.
 */
import type { Field } from '../field.js';
import type { Bool } from '../bool.js';
import type { FieldVar, FieldConst } from './fieldvar.js';

export {
  createField,
  createBool,
  createBoolUnsafe,
  isField,
  isBool,
  getField,
  getBool,
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
    throw Error('Cannot construct a Field before the class was defined.');
  return new fieldConstructor(value);
}

function createBool(value: boolean | Bool): Bool {
  if (boolConstructor === undefined)
    throw Error('Cannot construct a Bool before the class was defined.');
  return new boolConstructor(value);
}

function createBoolUnsafe(value: Field): Bool {
  return getBool().Unsafe.fromField(value);
}

function isField(x: unknown): x is Field {
  if (fieldConstructor === undefined)
    throw Error(
      'Cannot check for instance of Field before the class was defined.'
    );
  return x instanceof fieldConstructor;
}

function isBool(x: unknown): x is Bool {
  if (boolConstructor === undefined)
    throw Error(
      'Cannot check for instance of Bool before the class was defined.'
    );
  return x instanceof boolConstructor;
}

function getField(): typeof Field {
  if (fieldConstructor === undefined)
    throw Error('Field class not defined yet.');
  return fieldConstructor;
}

function getBool(): typeof Bool {
  if (boolConstructor === undefined) throw Error('Bool class not defined yet.');
  return boolConstructor;
}
