import { Bool, Circuit, Field, isReady, Poseidon } from '../snarky';
import { arrayProp, CircuitValue, prop } from './circuit_value';

const DEFAULT_STRING_LENGTH = 64;

export class Character extends CircuitValue {
  @prop value: Field;

  constructor(value: Field) {
    super();

    this.value = value;
  }

  equals(char: Character): Bool {
    return this.value.equals(char.value);
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
  ASCII reference: https://en.wikipedia.org/wiki/ASCII#Printable_characters
  */
  static check(value: Field) {
    console.log('check')
    value.assertGte(Field(32))
    value.assertLte(Field(126))
  }
};

class NullCharacter extends Character {
  constructor() {
    super(Field(0));
  }

  static check(value: Field) {
    value.assertEquals(Field(0))
  }
}

export class CircuitString extends CircuitValue {
  @prop usedLength: Field;
  @prop maxLength: Field;


  // arrayProp called later because we can't await isReady here
  values;

  constructor(values: Character[]) {
    super();

    const usedLength = values.length;
    const maxLength = DEFAULT_STRING_LENGTH;
    values.length = maxLength;

    // set the value of this.values to the input values, filled with null char
    this.values = values.fill(new NullCharacter, usedLength);

    this.usedLength = Field(usedLength);
    this.maxLength = Field(maxLength);
  }

  append(str: CircuitString): CircuitString {
    this.usedLength.add(str.usedLength).assertLte(this.maxLength);

    let newStringValues: Character[] = []
    let i = 0;

    while (i < Number(this.usedLength.toString())) {
      newStringValues.push(this.values[i]);
      i++
    }

    i = 0;
    while (i < Number(str.usedLength.toString())) {
      newStringValues.push(str.values[i]);
      i++
    }

    return new CircuitString(newStringValues)
  }

  // returns TRUE if str is found in this CircuitString
  // @param size - the size of the str without null padding
  contains(str: CircuitString, size: number): Bool {
    let ret = new Bool(false);
    ret = this._contains(str, size)

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
    return this.values.map(x => x.toString()).join('');
  }

  equals(str: CircuitString): Bool {
    let ret = new Bool(true);
    ret = this._equals(str);

    return ret;
  }

  static fromString(str: string): CircuitString {
    const characters = str.split('').map(x => Character.fromString(x));
    return new CircuitString(characters);
  }

  private _contains(str: CircuitString, size: number): Bool {
    let ret = new Bool(false);
    const thisLength = Number(this.usedLength.toString());
    const strLength = size;
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

    const usedLength = values.length;
    const maxLength = 8;
    values.length = maxLength;

    // set the value of this.values to the input values, filled with null char
    this.values = values.fill(new NullCharacter, usedLength);

    this.usedLength = Field(usedLength);
    this.maxLength = Field(maxLength);
  }
}

export async function resolveCircuitStringArrayProps() {
  await isReady;

  arrayProp(Character, 8)(CircuitString8.prototype, 'values');
  arrayProp(Character, 16)(CircuitString8.prototype, 'values');
  arrayProp(Character, 32)(CircuitString8.prototype, 'values');
  arrayProp(Character, DEFAULT_STRING_LENGTH)(CircuitString.prototype, 'values');
}