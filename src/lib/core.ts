import { Bool, Field } from '../snarky';

export { Field, Bool };

Field.toInput = function (x) {
  return { fields: [x] };
};

Bool.toInput = function (x) {
  return { packed: [[x.toField(), 1] as [Field, number]] };
};
