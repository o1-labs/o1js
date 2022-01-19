import { Bool, Field } from '../snarky';
import { CircuitValue, prop } from './circuit_value';

export class Optional<T> {
  isSome: Bool;
  value: T;

  constructor(isSome: Bool, value: T) {
    this.isSome = isSome;
    this.value = value;
  }
}

type CircuitValueConstructor<T> = {
  new (...args: any[]): T;
  sizeInFields: () => number;
  ofFields: (xs: Array<Field>) => T;
  toFields: (x: T) => Array<Field>;
};
/*
export function Optional<T>(TCtor: CircuitValueConstructor<T>) {
  return class OptionalT {
    isSome: Bool;
    value: T;

    constructor(isSome: Bool, value: T) {
      this.isSome = isSome;
      this.value = value;
    }

    static sizeInFields(): number {
      return 1 + TCtor.sizeInFields();
    }

    static ofFields(xs: Field[]): OptionalT {
      return new OptionalT(
        Bool.Unsafe.ofField(xs[0]),
        TCtor.ofFields(xs.slice(1))
      );
    }

    static toFields(x: OptionalT): Field[] {
      return [x.isSome.toField()].concat(TCtor.toFields(x.value));
    }

    static check(x: OptionalT) {
      x.isSome.toField().assertBoolean();
      if ((TCtor as any).check !== undefined) {
        (TCtor as any).check(x.value);
      }
    }
  };
}
*/
