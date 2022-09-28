import { Bool, Field, Scalar, Group } from '../snarky.js';

export { Field, Bool };

Field.toAuxiliary = () => [];
Bool.toAuxiliary = () => [];
Scalar.toAuxiliary = () => [];
Group.toAuxiliary = () => [];

Field.toInput = function (x) {
  return { fields: [x] };
};

Bool.toInput = function (x) {
  return { packed: [[x.toField(), 1] as [Field, number]] };
};
