import { Bool, Field } from './wrapped.js';
import { Provable } from './provable.js';
import { Poseidon, HashInput } from './crypto/poseidon.js';
import { Gadgets } from './gadgets/gadgets.js';
import { Struct } from './types/struct.js';
import { provable } from './types/provable-derivers.js';

export { Character, CircuitString };

const DEFAULT_STRING_LENGTH = 128;

class Character extends Struct({ value: Field }) {
  constructor(value: Field | number) {
    super({ value: Field(value) });
  }

  isNull(): Bool {
    return this.value.equals(NullCharacter().value);
  }

  toField(): Field {
    return this.value;
  }

  toString(): string {
    const charCode = Number(this.value.toString());
    return String.fromCharCode(charCode);
  }

  static fromString(str: string) {
    return new Character(str.charCodeAt(0));
  }

  // TODO: Add support for more character sets
  // right now it's 16 bits because 8 not supported :/
  static check(c: { value: Field }) {
    Gadgets.rangeCheckN(16, c.value);
  }

  static toInput(c: { value: Field }): HashInput {
    return { packed: [[c.value, 16]] };
  }
}

// construct a provable with a `string` js type
const RawCircuitString = {
  ...provable({ values: Provable.Array(Character, DEFAULT_STRING_LENGTH) }),

  toValue({ values }) {
    return values
      .map((x) => x.toString())
      .join('')
      .replace(/[^ -~]+/g, '');
  },

  fromValue(value) {
    if (typeof value === 'object') return value;
    return {
      values: fillWithNull(
        value.split('').map((x) => Character.fromString(x)),
        DEFAULT_STRING_LENGTH
      ),
    };
  },
} satisfies Provable<{ values: Character[] }, string>;

// by using a custom provable as struct input, we override its inference of the js type
// otherwise the js type would be `{ values: { value: bigint }[] }` instead of `string`
// TODO: create an API for this that is better integrated with `Struct`
// TODO support other maxLengths
class CircuitString extends Struct(RawCircuitString) {
  static maxLength = DEFAULT_STRING_LENGTH;

  // this is the publicly accessible constructor
  static fromCharacters(chars: Character[]): CircuitString {
    return new CircuitString({ values: fillWithNull(chars, this.maxLength) });
  }

  maxLength() {
    return (this.constructor as typeof CircuitString).maxLength;
  }

  // some O(n) computation that should be only done once in the circuit
  computeLengthAndMask() {
    let n = this.values.length;
    // length is the actual, dynamic length
    let length = Field(0);
    // mask is an array that is true where `this` has its first null character, false elsewhere
    let mask = [];
    let wasntNullAlready = Bool(true);
    for (let i = 0; i < n; i++) {
      let isNull = this.values[i].isNull();
      mask[i] = isNull.and(wasntNullAlready);
      wasntNullAlready = isNull.not().and(wasntNullAlready);
      length = length.add(wasntNullAlready.toField());
    }
    // mask has length n+1, the last element is true when `this` has no null char
    mask[n] = wasntNullAlready;
    (this as any)._length = length;
    (this as any)._mask = mask;
    return { mask, length };
  }
  lengthMask(): Bool[] {
    return (this as any)._mask ?? this.computeLengthAndMask().mask;
  }
  length(): Field {
    return (this as any)._length ?? this.computeLengthAndMask().length;
  }

  /**
   * returns true if `this` has the same value as `other`
   */
  equals(other: CircuitString) {
    return Provable.equal(CircuitString, this, other);
  }

  /**
   * appends another string to this one, returns the result and proves that it fits
   * within the `maxLength` of this string (the other string can have a different maxLength)
   */
  append(str: CircuitString): CircuitString {
    let n = this.maxLength();
    // only allow append if the dynamic length does not overflow
    this.length().add(str.length()).assertLessThan(n);

    let chars = this.values;
    let otherChars = fillWithNull(str.values, n);

    // compute the concatenated string -- for *each* of the possible lengths of the first string
    let possibleResults = [];
    for (let length = 0; length < n + 1; length++) {
      // if the first string has this `length`, then this is the result:
      possibleResults[length] = chars
        .slice(0, length)
        .concat(otherChars.slice(0, n - length));
    }
    // compute the actual result, by always picking the char which corresponds to the actual length
    let result: Character[] = [];
    let mask = this.lengthMask();
    for (let i = 0; i < n; i++) {
      let possibleCharsAtI = possibleResults.map((r) => r[i]);
      result[i] = Provable.switch(mask, Character, possibleCharsAtI);
    }
    return CircuitString.fromCharacters(result);
  }

  hash(): Field {
    return Poseidon.hash(this.values.map((x) => x.value));
  }

  substring(start: number, end: number): CircuitString {
    return CircuitString.fromCharacters(this.values.slice(start, end));
  }

  toString(): string {
    return CircuitString.toValue(this);
  }

  static fromString(str: string): CircuitString {
    if (str.length > this.maxLength) {
      throw Error('CircuitString.fromString: input string exceeds max length!');
    }
    return new CircuitString(CircuitString.fromValue(str));
  }
}

// note: this used to be a custom class, which doesn't work
// NullCharacter must use the same circuits as normal Characters
let NullCharacter = () => new Character(Field(0));

function fillWithNull([...values]: Character[], length: number) {
  let nullChar = NullCharacter();
  for (let i = values.length; i < length; i++) {
    values[i] = nullChar;
  }
  return values;
}
