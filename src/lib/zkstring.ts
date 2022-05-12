import { Bool, Circuit, Field } from '../snarky';
import { CircuitValue, prop } from './circuit_value';

export class Character extends CircuitValue {
  @prop value: Field;

  constructor(value: Field) {
    super();

    Character.validateInput(value);
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

  static validateInput(value: Field): Boolean {
    if (true) {
      return true;
    } else {
      throw new Error('Character does not pass validation')
    }
  }
};

export class ZKString extends CircuitValue {
  @prop values: Character[];

  constructor(values: Character[]) {
    super();

    this.values = values;
  }

  length(): Field {
    return Field(this.values.length);
  }

  substring(start: number, end: number): ZKString {
    return new ZKString(this.values.slice(start, end));
  }

  toFields(): Field[] {
    return this.values.map(x => x.toField());
  }

  toString(): string {
    return this.values.map(x => x.toString()).join('');
  }

  equals(str: ZKString): Bool {
    try {
      this.length().assertEquals(str.length())
    } catch {
      console.log("String lengths not equal")
      return new Bool(false);
    }

    let ret = new Bool(true);
    this.values.forEach((value: Character, i: number) => {
      ret = ret.and(value.equals(str.values[i]));
    })
    return ret;
  }

  static fromString(str: string): ZKString {
    const characters = str.split('').map(x => Character.fromString(x));
    return new ZKString(characters);
  }
};
