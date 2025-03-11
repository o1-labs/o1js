import * as Equivalent_ from '../lib/testing/equivalent.js';
import * as Property_ from '../lib/testing/property.js';
import * as ConstraintSystem_ from '../lib/testing/constraint-system.js';

export { Testing };

namespace Testing {
  export namespace Property {
    export let test = Property_.test;
    export let Random = Property_.Random;
    export let sample = Property_.sample;
    export let withHardCoded = Property_.withHardCoded;
  }

  export namespace Equivalent {
    export let equivalent = Equivalent_.equivalent;
    export let equivalentProvable = Equivalent_.equivalentProvable;
    export let equivalentAsync = Equivalent_.equivalentAsync;
    export let oneOf = Equivalent_.oneOf;
    export let throwError = Equivalent_.throwError;
    export let handleErrors = Equivalent_.handleErrors;
    export let defaultAssertEqual = Equivalent_.defaultAssertEqual;
    export let id = Equivalent_.id;
    export let spec = Equivalent_.spec;
    export let field = Equivalent_.field;
    export let fieldWithRng = Equivalent_.fieldWithRng;
    export let bigintField = Equivalent_.bigintField;
    export let bool = Equivalent_.bool;
    export let boolean = Equivalent_.boolean;
    export let unit = Equivalent_.unit;
    export let array = Equivalent_.array;
    export let record = Equivalent_.record;
    export let map = Equivalent_.map;
    export let onlyIf = Equivalent_.onlyIf;
    export let fromRandom = Equivalent_.fromRandom;
    export let first = Equivalent_.first;
    export let second = Equivalent_.second;
    export let constant = Equivalent_.constant;
  }

  export namespace ConstraintSystem {
    export let constraintSystem = ConstraintSystem_.constraintSystem;
    export let not = ConstraintSystem_.not;
    export let and = ConstraintSystem_.and;
    export let or = ConstraintSystem_.or;
    export let fulfills = ConstraintSystem_.fulfills;
    export let equals = ConstraintSystem_.equals;
    export let contains = ConstraintSystem_.contains;
    export let allConstant = ConstraintSystem_.allConstant;
    export let ifNotAllConstant = ConstraintSystem_.ifNotAllConstant;
    export let isEmpty = ConstraintSystem_.isEmpty;
    export let withoutGenerics = ConstraintSystem_.withoutGenerics;
    export let print = ConstraintSystem_.print;
    export let repeat = ConstraintSystem_.repeat;
    export type ConstraintSystemTest = ConstraintSystem_.ConstraintSystemTest;
  }
}