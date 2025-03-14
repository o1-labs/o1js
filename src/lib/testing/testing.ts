import * as Property from './property.js';
import * as Equivalent from './equivalent.js';
import * as ConstraintSystem from './constraint-system.js';

export { Testing };

namespace Testing {
  export let test = Property.test;
  export let Random = Property.Random;
  export let sample = Property.sample;
  export let withHardCoded = Property.withHardCoded;

  export let equivalent = Equivalent.equivalent;
  export let equivalentProvable = Equivalent.equivalentProvable;
  export let equivalentAsync = Equivalent.equivalentAsync;
  export let oneOf = Equivalent.oneOf;
  export let throwError = Equivalent.throwError;
  export let handleErrors = Equivalent.handleErrors;
  export let defaultAssertEqual = Equivalent.defaultAssertEqual;
  export let id = Equivalent.id;
  export let spec = Equivalent.spec;
  export let field = Equivalent.field;
  export let fieldWithRng = Equivalent.fieldWithRng;
  export let bigintField = Equivalent.bigintField;
  export let bool = Equivalent.bool;
  export let boolean = Equivalent.boolean;
  export let unit = Equivalent.unit;
  export let array = Equivalent.array;
  export let record = Equivalent.record;
  export let map = Equivalent.map;
  export let onlyIf = Equivalent.onlyIf;
  export let fromRandom = Equivalent.fromRandom;
  export let first = Equivalent.first;
  export let second = Equivalent.second;
  export let constant = Equivalent.constant;

  export let constraintSystem = ConstraintSystem.constraintSystem;
  export let not = ConstraintSystem.not;
  export let and = ConstraintSystem.and;
  export let or = ConstraintSystem.or;
  export let fulfills = ConstraintSystem.fulfills;
  export let equals = ConstraintSystem.equals;
  export let contains = ConstraintSystem.contains;
  export let allConstant = ConstraintSystem.allConstant;
  export let ifNotAllConstant = ConstraintSystem.ifNotAllConstant;
  export let isEmpty = ConstraintSystem.isEmpty;
  export let withoutGenerics = ConstraintSystem.withoutGenerics;
  export let print = ConstraintSystem.print;
  export let repeat = ConstraintSystem.repeat;
  export type ConstraintSystemTest = ConstraintSystem.ConstraintSystemTest;
}
