import { Bool } from "../snarky";
import { CircuitValue, prop } from "./circuit_value";

export class Optional<T> extends CircuitValue {
  @prop isSome: Bool;
  @prop value: T;
  constructor(isSome: Bool, value: T) {
    super();
    this.isSome = isSome;
    this.value = value;
  }
}