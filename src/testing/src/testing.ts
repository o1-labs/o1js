import * as Equivalent_ from '../../lib/testing/equivalent.js';
import * as Property_ from '../../lib/testing/property.js';
import * as ConstraintSystem_ from '../../lib/testing/constraint-system.js';

export {
  test,
  Random,
  sample,
  withHardCoded,
  equivalent,
  equivalentProvable,
  equivalentAsync,
  oneOf,
  throwError,
  handleErrors,
  defaultAssertEqual,
  id,
  spec,
  field,
  fieldWithRng,
  bigintField,
  bool,
  boolean,
  unit,
  array,
  record,
  map,
  onlyIf,
  fromRandom,
  first,
  second,
  constant,
  constraintSystem,
  not,
  and,
  or,
  fulfills,
  equals,
  contains,
  allConstant,
  ifNotAllConstant,
  isEmpty,
  withoutGenerics,
  print,
  repeat,
};
export {
  Spec,
  ToSpec,
  FromSpec,
  SpecFromFunctions,
  ProvableSpec,
  First,
  Second,
  ConstraintSystemTest,
};

let test = Property_.test;

let Random = Property_.Random;
let sample = Property_.sample;
let withHardCoded = Property_.withHardCoded;

let equivalent = Equivalent_.equivalent;
let equivalentProvable = Equivalent_.equivalentProvable;
let equivalentAsync = Equivalent_.equivalentAsync;
let oneOf = Equivalent_.oneOf;
let throwError = Equivalent_.throwError;
let handleErrors = Equivalent_.handleErrors;
let defaultAssertEqual = Equivalent_.defaultAssertEqual;
let id = Equivalent_.id;

let spec = Equivalent_.spec;
let field = Equivalent_.field;
let fieldWithRng = Equivalent_.fieldWithRng;
let bigintField = Equivalent_.bigintField;
let bool = Equivalent_.bool;
let boolean = Equivalent_.boolean;
let unit = Equivalent_.unit;
let array = Equivalent_.array;
let record = Equivalent_.record;
let map = Equivalent_.map;
let onlyIf = Equivalent_.onlyIf;
let fromRandom = Equivalent_.fromRandom;
let first = Equivalent_.first;
let second = Equivalent_.second;
let constant = Equivalent_.constant;

type Spec<T1, T2> = Equivalent_.Spec<T1, T2>;
type ToSpec<Out1, Out2> = Equivalent_.ToSpec<Out1, Out2>;
type FromSpec<In1, In2> = Equivalent_.FromSpec<In1, In2>;
type SpecFromFunctions<
  F1 extends Equivalent_.AnyTupleFunction,
  F2 extends Equivalent_.AnyTupleFunction
> = Equivalent_.SpecFromFunctions<F1, F2>;
type ProvableSpec<T1, T2> = Equivalent_.ProvableSpec<T1, T2>;
type First<Out extends ToSpec<any, any>> = Equivalent_.First<Out>;
type Second<Out extends ToSpec<any, any>> = Equivalent_.Second<Out>;

let constraintSystem = ConstraintSystem_.constraintSystem;
let not = ConstraintSystem_.not; // Negates a test
let and = ConstraintSystem_.and; // Checks that all input tests pass.
let or = ConstraintSystem_.or; // Checks that at least one input test passes.
let fulfills = ConstraintSystem_.fulfills;
let equals = ConstraintSystem_.equals; // Checks precise equality of the constraint system with a given list of gates.
let contains = ConstraintSystem_.contains; // Checks that constraint system contains each of a list of gates consecutively
let allConstant = ConstraintSystem_.allConstant; // Checks whether all inputs are constant.
let ifNotAllConstant = ConstraintSystem_.ifNotAllConstant; // Modifies a test so that it doesn't fail if all inputs are constant, and instead checks that the constraint system is empty in that case.
let isEmpty = ConstraintSystem_.isEmpty; // Checks whether constraint system is empty.
let withoutGenerics = ConstraintSystem_.withoutGenerics; // Modifies a test so that it runs on the constraint system with generic gates filtered out.
let print = ConstraintSystem_.print; // Pretty-prints the constraint system.
let repeat = ConstraintSystem_.repeat; // Repeats a gate or list of gates a number of times.
type ConstraintSystemTest = ConstraintSystem_.ConstraintSystemTest; // ConstraintSystemTest type
