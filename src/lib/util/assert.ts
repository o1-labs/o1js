export { assert };

function assert(stmt: boolean, message?: string): asserts stmt {
  if (!stmt) {
    throw Error(message ?? 'Assertion failed');
  }
}
