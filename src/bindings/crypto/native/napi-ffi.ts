export type Ctor<Args extends unknown[], T> = new (...args: Args) => T;

export function castCtor<C>(value: unknown): C {
  return value as C;
}

export function arrayFrom<T>(value: unknown): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  return Array.from(value as ArrayLike<T>);
}

export function readNapiProp<T>(value: unknown, ...keys: string[]): T | undefined {
  if (value == null) return undefined;
  const record = value as Record<string, T>;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}
