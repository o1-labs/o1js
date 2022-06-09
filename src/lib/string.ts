import { Bool, Field, Poseidon } from '../snarky';
import { arrayProp, CircuitValue, prop } from './circuit_value';

export { Character, CircuitString, CircuitString8 };

const DEFAULT_STRING_LENGTH = 128;

class Character extends CircuitValue {
  @prop value: Field;

  constructor(value: Field) {
    super();

    this.value = value;
  }

  equals(char: Character): Bool {
    return this.value.equals(char.value);
  }

  isNull(): Bool {
    return this.equals(new NullCharacter());
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

  /* 
  TODO: Add support for more character sets
  default chacter value should be 0-255
  */
  static check(c: Character) {
    c.value.rangeCheckHelper(8).assertEquals(c.value);
  }
}

class NullCharacter extends Character {
  constructor() {
    super(Field.zero);
  }

  static check(c: Character) {
    c.value.assertEquals(Field.zero);
  }
}

class CircuitString extends CircuitValue {
  maxLength: number;
  @arrayProp(Character, DEFAULT_STRING_LENGTH) values: Character[];

  constructor(values: Character[]) {
    super();

    const inputLength = values.length;
    values.length = DEFAULT_STRING_LENGTH;
    values = values.fill(
      new NullCharacter(),
      inputLength,
      DEFAULT_STRING_LENGTH
    );
    this.values = values;
    this.maxLength = DEFAULT_STRING_LENGTH;
  }

  private firstNullMask(): Bool[] {
    let t = this as any;
    if (t._firstNullMask !== undefined) return t._firstNullMask;
    // create an array that is true where `this` has its first null character, false elsewhere
    let mask = [];
    let wasntNullAlready = Bool(true);
    for (let i = 0; i < this.maxLength; i++) {
      let isNull = this.values[i].isNull();
      mask[i] = isNull.and(wasntNullAlready);
      wasntNullAlready = isNull.not().and(wasntNullAlready);
    }
    // mask has length n+1, the last element is true when `this` has no null char
    mask[this.maxLength] = wasntNullAlready;
    t._firstNullMask = mask;
    return mask;
  }

  append(str: CircuitString): CircuitString {
    let n = this.maxLength;
    let chars = this.values;
    let otherChars = str.values;

    let mask = this.firstNullMask();

    function chooseWithMask(chars: Character[], mask: Bool[]) {
      // picks the character at the index where mask is true
      let m = mask.length;
      if (chars.length !== m) throw Error('bug');
      let char = Field.zero;
      for (let i = 0; i < m; i++) {
        let maybeChar = chars[i].value.mul(mask[i].toField());
        char = char.add(maybeChar);
      }
      return new Character(char);
    }

    let newChars: Character[] = [];
    let reverseOtherChars = otherChars.reverse();
    let nullChar = new NullCharacter();

    for (let i = 0; i < 2 * n; i++) {
      let possibleCharsAtI;
      if (i < n) {
        possibleCharsAtI = reverseOtherChars
          .slice(n - i - 1, n)
          .concat(Array(n - i).fill(chars[i]));
      } else {
        possibleCharsAtI = Array(i - n + 1)
          .fill(nullChar)
          .concat(reverseOtherChars.slice(0, 2 * n - i));
      }
      newChars[i] = chooseWithMask(possibleCharsAtI, mask);
    }
    let result = new CircuitString([]);
    result.maxLength = 2 * n;
    result.values = newChars;
    return result;
  }

  // returns TRUE if str is found in this CircuitString
  // @param size - the size of the str without null padding
  contains(str: CircuitString): Bool {
    let ret = new Bool(false);
    ret = this._contains(str);

    return ret;
  }

  hash(): Field {
    return Poseidon.hash(this.values.map((x) => x.value));
  }

  substring(start: number, end: number): CircuitString {
    return new CircuitString(this.values.slice(start, end));
  }

  toFields(): Field[] {
    return this.values.map((x) => x.toField());
  }

  toString(): string {
    return this.values
      .map((x) => x.toString())
      .join('')
      .replace(/[^ -~]+/g, '');
  }

  equals(str: CircuitString): Bool {
    return this._equals(str);
  }

  static fromString(str: string): CircuitString {
    const characters = str.split('').map((x) => Character.fromString(x));
    return new CircuitString(characters);
  }

  private _contains(str: CircuitString): Bool {
    let ret = new Bool(false);
    let length = 0;
    str.values.forEach((char) => {
      if (Number(char.value.toString()) > 0) {
        length++;
      }
    });
    const maxLength = this.maxLength;
    let i = 0;

    while (i + length <= maxLength) {
      ret = ret.or(this.substring(i, i + length).equals(str));
      i++;
    }

    return ret;
  }

  private _equals(str: CircuitString): Bool {
    let ret = new Bool(true);

    this.values.forEach((value: Character, i: number) => {
      ret = ret.and(value.equals(str.values[i]));
    });

    return ret;
  }
}

class CircuitString8 extends CircuitString {
  @arrayProp(Character, 8) values: Character[];

  constructor(values: Character[]) {
    super(values);

    const inputLength = values.length;
    values.length = 8;
    values = values.fill(new NullCharacter(), inputLength, 8);
    this.values = values;
    this.maxLength = 8;
  }
}
