import { Snarky } from "../snarky.js";
import { FieldVar, withMessage } from "./field.js";

export { FieldBn254 }

class FieldBn254 {
    value: FieldVar;

    constructor(x: FieldVar) {
        this.value = x;
    }

    assertEquals(y: FieldBn254, message?: string) {
        try {
            Snarky.fieldBn254.assertEqual(this.value, y.value);
        } catch (err) {
            throw withMessage(err, message);
        }
    }
}
