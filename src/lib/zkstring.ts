import { Bool, Circuit, Field } from '../snarky';
import { CircuitValue, prop } from './circuit_value';

export class Character extends CircuitValue {
  @prop value: Field;

  constructor(value: Field) {
    super();

    if (Character.validateInput(value)) {
      this.value = value;
    } else {
      throw Error('Character initialization did not pass validation');
    }
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
  static validateInput(value: Field): Boolean {
    if (Circuit.inProver() || Circuit.inCheckedComputation()) {
      const ret = Bool.and(
        value.gte(Field(32)),
        value.lte(Field(126))
      );

      return ret.toBoolean();
    }

    return true;
  }
};

export class ZKString extends CircuitValue {
  @prop values: Character[];

  constructor(values: Character[]) {
    super();

    this.values = values;
  }

  append(str: ZKString): ZKString {
    return new ZKString([...this.values, ...str.values])
  }

  // returns TRUE if str is found in this zkstring
  contains(str: ZKString): Bool {
    if (Circuit.inProver() || Circuit.inCheckedComputation()) {
      let ret = new Bool(false);
      const strLength = str.length();

      Circuit.if(
        this.length().gt(strLength),
        ret = new Bool(false),
        ret = this._contains(str)
      )

      return ret;
    }

    return new Bool(true);
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
    if (Circuit.inProver() || Circuit.inCheckedComputation()) {
      let ret = new Bool(true);

      Circuit.if(
        Bool.not(this.length().equals(str.length())),
        ret = new Bool(false),
        ret = this._equals(str)
      )

      return ret;
    }

    return new Bool(true);
  }

  static fromString(str: string): ZKString {
    const characters = str.split('').map(x => Character.fromString(x));
    return new ZKString(characters);
  }

  private _contains(str: ZKString): Bool {
    let ret = new Bool(false);
    const thisLength = Number(this.length().toString());
    const strLength = Number(str.length().toString());
    let i = 0;

    while (i + strLength <= thisLength) {
      ret = ret.or(this.substring(i, i + strLength).equals(str))
      i++
    }

    return ret;
  }

  private _equals(str: ZKString): Bool {
    let ret = new Bool(true);

    this.values.forEach((value: Character, i: number) => {
      ret = ret.and(value.equals(str.values[i]));
    })

    return ret;
  }
};
