export { assertDeepEqual, deepEqual };

type Nested =
  | number
  | bigint
  | string
  | boolean
  | null
  | undefined
  | Nested[]
  | { [key: string]: Nested };

function assertDeepEqual(actual: Nested, expected: Nested, message?: string) {
  if (!deepEqual(actual, expected)) {
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };
    let fullMessage = `${message ? `${message}\n\n` : ''}Deep equality failed:

actual:   ${JSON.stringify(actual)}
expected: ${JSON.stringify(expected)}
`;
    throw Error(fullMessage);
  }
}

function deepEqual(a: Nested, b: Nested): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  for (const key in a) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}
