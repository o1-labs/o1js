/// This file contains utility functions for N-API bindings, to improve
/// type safety and ergonomics.

export type Ctor<Args extends unknown[], T> = new (...args: Args) => T;

export function castCtor<C>(value: unknown): C {
  return value as C;
}

export function asArrayLike<T>(value: unknown, context = 'asArrayLike'): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<T>);
  if (typeof value === 'object' && value !== null && 'length' in (value as { length: unknown })) {
    const { length } = value as { length: unknown };
    if (typeof length === 'number') return Array.from(value as ArrayLike<T>);
  }
  throw Error(`${context}: expected array-like native values`);
}
