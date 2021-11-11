import { Bool } from "../snarky";
import { CircuitValue } from "./circuit_value";

export class UInt64 extends CircuitValue {
  static fromNumber(x: number): UInt64 {
    throw 'todo'
  }
  
  div(y: UInt64 | number): UInt64 {
    throw 'todo';
  }

  mul(y : UInt64 | number): UInt64 {
    throw 'todo';
  }

  add(y : UInt64 | number): UInt64 {
    throw 'todo';
  }

  sub(y: UInt64 | number): UInt64 {
    throw 'todo'
  }

  lt(y: UInt64): Bool {
    throw 'todo';
  }

  assertLt(y: UInt64) {
  }

  gt(y: UInt64): Bool {
    throw 'todo';
  }

  assertGt(y: UInt64) {
  }
}

export class UInt32 extends CircuitValue {
  static fromNumber(x: number): UInt32 {
    throw 'todo'
  }
  
  div(y: UInt32 | number): UInt32 {
    throw 'todo';
  }

  mul(y : UInt32 | number): UInt32 {
    throw 'todo';
  }

  add(y : UInt32 | number): UInt32 {
    throw 'todo';
  }

  sub(y: UInt32 | number): UInt32 {
    throw 'todo'
  }

  lt(y: UInt32): Bool {
    throw 'todo';
  }

  assertLt(y: UInt32) {
  }

  gt(y: UInt32): Bool {
    throw 'todo';
  }

  assertGt(y: UInt32) {
  }
}

