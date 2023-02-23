export {
  Integer,
  NonNegativeInteger,
  PositiveInteger,
  isInteger,
  isNonNegativeInteger,
  isPositiveInteger,
  assertInteger,
  assertNonNegativeInteger,
  assertPositiveInteger,
  asInteger,
  asNonNegativeInteger,
  asPositiveInteger,
};

function asInteger<N extends number>(n: Integer<N>) {
  return n;
}
function asNonNegativeInteger<N extends number>(n: NonNegativeInteger<N>) {
  return n;
}
function asPositiveInteger<N extends number>(n: PositiveInteger<N>) {
  return n;
}

function isInteger<N extends number>(n: N): n is Integer<N> {
  return Number.isInteger(n);
}
function isNonNegativeInteger<N extends number>(
  n: N
): n is NonNegativeInteger<N> {
  return Number.isInteger(n) && n >= 0;
}
function isPositiveInteger<N extends number>(n: N): n is PositiveInteger<N> {
  return Number.isInteger(n) && n > 0;
}

function assertInteger(n: number, message: string) {
  if (!Number.isInteger(n)) throw Error(message);
}
function assertNonNegativeInteger(n: number, message: string) {
  if (!Number.isInteger(n) || n < 0) throw Error(message);
}
function assertPositiveInteger(n: number, message: string) {
  if (!Number.isInteger(n) || n <= 0) throw Error(message);
}

type Integer<T extends number> = number extends T
  ? never
  : `${T}` extends `${string}.${string}` | `${string}e-${string}`
  ? never
  : T;
type NonNegativeInteger<T extends number> = number extends T
  ? never
  : `${T}` extends `-${string}` | `${string}.${string}` | `${string}e-${string}`
  ? never
  : T;
type PositiveInteger<T extends number> = number extends T
  ? never
  : `${T}` extends
      | `-${string}`
      | `${string}.${string}`
      | `${string}e-${string}`
      | `0`
  ? never
  : T;
