import { TypeMap } from '../snarky/transaction-leaves.js';
import { AsFieldElements, AsFieldsAndAux, Bool, Field } from '../snarky.js';
import { PublicKey } from './signature.js';

let takesAsFields = <T>(type: AsFieldElements<T>, value: T) =>
  type.toFields(value);
let takesAsBoth = <T>(type: AsFieldsAndAux<T>, value: T) =>
  type.toFields(value);

function takesAsFields_<T>(type: AsFieldElements<T>, value: T) {
  return type.toFields(value);
}
function takesAsBoth_<T>(type: AsFieldsAndAux<T>, value: T) {
  return type.toFields(value);
}

let pk = PublicKey.empty();
takesAsFields(PublicKey, pk);
takesAsBoth(PublicKey, pk);

takesAsFields_(PublicKey, pk);
takesAsBoth_(PublicKey, pk);

takesAsFields = <T>(type: AsFieldsAndAux<T>, value: T) => type.toFields(value);

type MyNumber = TypeMap['number'];
const MyNumber = TypeMap['number'];

takesAsFields(MyNumber, 1);
takesAsBoth(MyNumber, 3);

takesAsFields_(MyNumber, 1);
takesAsBoth_(MyNumber, 3);

type MyTypeA = {
  canBeAsFields: AsFieldElements<Bool>;
  canBeAsBoth: AsFieldsAndAux<Bool>;
};
type MyTypeB = {
  canBeAsFields: AsFieldElements<number>;
  canBeAsBoth: AsFieldsAndAux<number>;
};

let m1: MyTypeA = { canBeAsFields: Bool, canBeAsBoth: Bool };
let m2: MyTypeB = { canBeAsFields: MyNumber, canBeAsBoth: MyNumber };

let callbackWithMoreParams: (fields: Field[], aux: any[]) => PublicKey =
  PublicKey.fromFields;
let callbackWithLessParams: (fields: Field[]) => PublicKey =
  MyNumber.fromFields;

function emptyValue<T>(type: AsFieldsAndAux<T>) {
  let size = type.sizeInFields();
  let fields = Array(size).fill(Field.zero);
  let aux = type.toAuxiliary();
  return type.fromFields(fields, aux);
}

emptyValue(PublicKey); // works. the `aux` passed to fromFields just isn't used
