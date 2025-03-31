export { assert, assertPromise, assertDefined };

function assert(stmt: boolean, message?: string): asserts stmt {
  if (!stmt) {
    throw Error(message ?? 'Assertion failed');
  }
}

function assertPromise<T>(value: Promise<T>, message?: string): Promise<T> {
  assert(value instanceof Promise, message ?? 'Expected a promise');
  return value;
}

/**
 * Assert that the value is not undefined, return the value.
 */
function assertDefined<T>(value: T | undefined, message = 'Input value is undefined.'): T {
  if (value === undefined) throw Error(message);
  return value as T;
}
