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
    return new Bool(false)
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
};

class NullCharacter extends Character {
  constructor() {
    super(Field(0));
  }

  isNull(): Bool {
    return new Bool(true)
  }

  static check(value: Field) {
    value.assertEquals(Field(0))
  }
}

export class CircuitString extends CircuitValue {
  @prop maxLength: Field;

  // arrayProp called later because we can't await isReady here
  values;

  constructor(values: Character[]) {
    super();

    const maxLength = DEFAULT_STRING_LENGTH;

    this.values = values.fill(new NullCharacter);
    this.maxLength = Field(maxLength);
  }

  append(str: CircuitString): CircuitString {
    let newStringValues: Character[] = []
    let i = 0;

    this.values.forEach((char) => {
      if (char.isNull().toBoolean()) {
        newStringValues.push(char);
      }
    })

    str.values.forEach((char) => {
      if (char.isNull().toBoolean()) {
        newStringValues.push(char);
      }
    })

    return new CircuitString(newStringValues)
  }

  // returns TRUE if str is found in this CircuitString
  // @param size - the size of the str without null padding
  contains(str: CircuitString): Bool {
    let ret = new Bool(false);
    ret = this._contains(str)

    return ret;
  }

  hash(): Field {
    return Poseidon.hash(this.values.map(x => x.value));
  }

  substring(start: number, end: number): CircuitString {
    return new CircuitString(this.values.slice(start, end));
  }

  toFields(): Field[] {
    return this.values.map(x => x.toField());
  }

  toString(): string {
    return this.values.map(x => x.toString()).join('').replace(/[^ -~]+/g, "");
  }

  equals(str: CircuitString): Bool {
    let ret = new Bool(true);
    ret = this._equals(str);

    console.log(ret)
    return ret;
  }

  static fromString(str: string): CircuitString {
    const characters = str.split('').map(x => Character.fromString(x));
    return new CircuitString(characters);
  }

  private _contains(str: CircuitString): Bool {
    let ret = new Bool(false);
    const thisLength = Number(this.maxLength.toString());
    const strLength = Number(str.maxLength.toString());
    let i = 0;

    while (i + strLength <= thisLength) {
      ret = ret.or(this.substring(i, i + strLength).equals(str))
      i++
    }

    return ret;
  }

  private _equals(str: CircuitString): Bool {
    let ret = new Bool(true);

    this.values.forEach((value: Character, i: number) => {
      ret = ret.and(value.equals(str.values[i]));
    })

    return ret;
  }
};

export class CircuitString8 extends CircuitString {
  constructor(values: Character[]) {
    super(values);

    const maxLength = 8;
    this.maxLength = Field(maxLength);
  }
}

export async function resolveCircuitStringArrayProps() {
  await isReady;

  arrayProp(Character, 8)(CircuitString8.prototype, 'values');
  arrayProp(Character, DEFAULT_STRING_LENGTH)(CircuitString.prototype, 'values');
}