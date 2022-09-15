import { Bool, Field } from '../snarky.js';
import { Circuit, arrayProp, CircuitValue, prop } from './circuit_value.js';
import { Poseidon } from './hash.js';

export { Character, CircuitString };

const DEFAULT_STRING_LENGTH = 128;

class Character extends CircuitValue {
  @prop value: Field;

  isNull(): Bool {
    return this.equals(NullCharacter() as this);
  }

  toField(): Field {
    return this.value;
  }

  toString(): string {
    const charCode = Number(this.value.toString());
    return String.fromCharCode(charCode);
  }

  static fromString(str: string) {
    const char = Field(str.charCodeAt(0));
    return new Character(char);
  }

  // TODO: Add support for more character sets
  // right now it's 16 bits because 8 not supported :/
  static check(c: Character) {
    c.value.rangeCheckHelper(16).assertEquals(c.value);
  }
}

class CircuitString extends CircuitValue {
  static maxLength = DEFAULT_STRING_LENGTH;
  @arrayProp(Character, DEFAULT_STRING_LENGTH) values: Character[];

  // constructor is private because
  // * we do not want extra logic inside CircuitValue constructors, as a general pattern (to be able to create them generically)
  // * here, not running extra logic to fill up the characters would be wrong
  private constructor(values: Character[]) {
    super(values);
  }
  // this is the publicly accessible constructor
  static fromCharacters(chars: Character[]): CircuitString {
    return new CircuitString(fillWithNull(chars, this.maxLength));
  }

  private maxLength() {
    return (this.constructor as typeof CircuitString).maxLength;
  }

  // some O(n) computation that should be only done once in the circuit
  private computeLengthAndMask() {
    let n = this.values.length;
    // length is the actual, dynamic length
    let length = Field.zero;
    // mask is an array that is true where `this` has its first null character, false elsewhere
    let mask = [];
    let wasntNullAlready = Bool(true);
    for (let i = 0; i < n; i++) {
      let isNull = this.values[i].isNull();
      mask[i] = isNull.and(wasntNullAlready);
      wasntNullAlready = isNull.not().and(wasntNullAlready);
      length.add(wasntNullAlready.toField());
    }
    // mask has length n+1, the last element is true when `this` has no null char
    mask[n] = wasntNullAlready;
    (this as any)._length = length;
    (this as any)._mask = mask;
    return { mask, length };
  }
  private lengthMask(): Bool[] {
    return (this as any)._mask ?? this.computeLengthAndMask().mask;
  }
  private length(): Field {
    return (this as any)._length ?? this.computeLengthAndMask().length;
  }

  /**
   * appends another string to this one, returns the result and proves that it fits
   * within the `maxLength` of this string (the other string can have a different maxLength)
   */
  append(str: CircuitString): CircuitString {
    let n = this.maxLength();
    // only allow append if the dynamic length does not overflow
    this.length().add(str.length()).assertLt(n);

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
    // compute the actual result, by always picking the char which correponds to the actual length
    let result: Character[] = [];
    let mask = this.lengthMask();
    for (let i = 0; i < n; i++) {
      let possibleCharsAtI = possibleResults.map((r) => r[i]);
      result[i] = Circuit.switch(mask, Character, possibleCharsAtI);
    }
    return CircuitString.fromCharacters(result);
  }

  // TODO
  /**
   * returns true if `str` is found in this `CircuitString`
   */
  // contains(str: CircuitString): Bool {
  //   // only succeed if the dynamic length is smaller
  //   let otherLength = str.length();
  //   otherLength.assertLt(this.length());
  // }

  hash(): Field {
    return Poseidon.hash(this.values.map((x) => x.value));
  }

  substring(start: number, end: number): CircuitString {
    return CircuitString.fromCharacters(this.values.slice(start, end));
  }

  toString(): string {
    return this.values
      .map((x) => x.toString())
      .join('')
      .replace(/[^ -~]+/g, '');
  }

  static fromString(str: string): CircuitString {
    if (str.length > this.maxLength) {
      throw Error('CircuitString.fromString: input string exceeds max length!');
    }
    let characters = str.split('').map((x) => Character.fromString(x));
    return CircuitString.fromCharacters(characters);
  }
}

// TODO
// class CircuitString8 extends CircuitString {
//   static maxLength = 8;
//   @arrayProp(Character, 8) values: Character[] = [];
// }

// note: this used to be a custom class, which doesn't work
// NullCharacter must use the same circuits as normal Characters
let NullCharacter = () => new Character(Field.zero);

function fillWithNull([...values]: Character[], length: number) {
  let nullChar = NullCharacter();
  for (let i = values.length; i < length; i++) {
    values[i] = nullChar;
  }
  return values;
}
