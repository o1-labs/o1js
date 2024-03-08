export { assert, assertPromise };

function assert(stmt: boolean, message?: string): asserts stmt {
  if (!stmt) {
    throw Error(message ?? 'Assertion failed');
  }
}

function assertPromise<T>(value: Promise<T>, message?: string): Promise<T> {
  assert(value instanceof Promise, message ?? 'Expected a promise');
  return value;
}
