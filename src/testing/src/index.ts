import * as Equivalent_ from '../../lib/testing/equivalent.js';
import * as Property_ from '../../lib/testing/property.js';
import * as ConstraintSystem_ from '../../lib/testing/constraint-system.js';

export const { test, Random, sample, withHardCoded } = Property_;

export const {
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
} = Equivalent_;

export const {
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
} = ConstraintSystem_;

export type {
  Spec,
  ToSpec,
  FromSpec,
  SpecFromFunctions,
  ProvableSpec,
  First,
  Second,
} from '../../lib/testing/equivalent.js';

export type { ConstraintSystemTest } from '../../lib/testing/constraint-system.js';
