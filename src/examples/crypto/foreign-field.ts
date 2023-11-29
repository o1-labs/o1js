import { createForeignField } from 'o1js';

// toy example - F_17

class SmallField extends createForeignField(17n) {}

let x = SmallField.from(16);
x.assertEquals(-1); // 16 = -1 (mod 17)
x.mul(x).assertEquals(1); // 16 * 16 = 15 * 17 + 1 = 1 (mod 17)
