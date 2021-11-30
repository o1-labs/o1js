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
  sizeInFieldElements: () => number;
  ofFieldElements: (xs: Array<Field>) => T;
  toFieldElements: (x: T) => Array<Field>;
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

    static sizeInFieldElements(): number {
      return 1 + TCtor.sizeInFieldElements();
    }

    static ofFieldElements(xs: Field[]): OptionalT {
      return new OptionalT(
        Bool.Unsafe.ofField(xs[0]),
        TCtor.ofFieldElements(xs.slice(1))
      );
    }

    static toFieldElements(x: OptionalT): Field[] {
      return [x.isSome.toField()].concat(TCtor.toFieldElements(x.value));
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
