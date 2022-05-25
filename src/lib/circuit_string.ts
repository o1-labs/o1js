import { Bool, Circuit, Field, isReady, Poseidon } from '../snarky';
import { arrayProp, CircuitValue, prop } from './circuit_value';

const DEFAULT_STRING_LENGTH = 1024;

export class Character extends CircuitValue {
  @prop value: Field;

  constructor(value: Field) {
    super();

    this.value = value;
  }

  equals(char: Character): Bool {
    return this.value.equals(char.value);
  }

  isNull(): Bool {
    return new Bool(false);
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
  static check(value: Field) {
    value.rangeCheckHelper(8).assertEquals(value);
  }
}

class NullCharacter extends Character {
  constructor() {
    super(Field(0));
    this.value = Field(0);
  }

  isNull(): Bool {
    return new Bool(true);
  }

  static check(value: Field) {
    value.assertEquals(Field(0));
  }
}

export class CircuitString extends CircuitValue {
  maxLength: Field;
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
    this.maxLength = Field(DEFAULT_STRING_LENGTH);
  }

  append(str: CircuitString): CircuitString {
    let newStringValues: Character[] = [];

    this.values.forEach((char) => {
      if (Number(char.value.toString()) > 0) {
        newStringValues.push(char);
      }
    });

    str.values.forEach((char) => {
      if (Number(char.value.toString()) > 0) {
        newStringValues.push(char);
      }
    });

    return new CircuitString(newStringValues);
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
    const maxLength = Number(this.maxLength.toString());
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

export class CircuitString8 extends CircuitString {
  @arrayProp(Character, 8) values: Character[];

  constructor(values: Character[]) {
    super(values);

    const inputLength = values.length;
    values.length = 8;
    values = values.fill(new NullCharacter(), inputLength, 8);
    this.values = values;
    this.maxLength = Field(8);
  }
}
