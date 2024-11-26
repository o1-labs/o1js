import { Field, Encoding } from 'o1js';

let n = 1000;

let { toBytes, fromBytes } = Encoding.Bijective.Fp;

// random fields
let fields = Array.from({ length: n }, () => Field.random());
let newFields = fromBytes(toBytes(fields));
let fieldsEqual = arrayEqual(fields, newFields, (f, g) =>
  f.equals(g).toBoolean()
);
if (!fieldsEqual) throw Error('roundtrip fields -> bytes -> fields failed');
else console.log('fields -> bytes -> fields: ok');

// random bytes
let bytes = (await import('node:crypto')).randomBytes(n * 32);
let newBytes = toBytes(fromBytes(bytes));
let bytesEqual = arrayEqual([...bytes], [...newBytes]);
if (!bytesEqual) throw Error('roundtrip bytes -> fields -> bytes failed');
else console.log('bytes -> fields -> bytes: ok');

function arrayEqual<T>(a: T[], b: T[], isEqual?: (a: T, b: T) => boolean) {
  if (isEqual === undefined) isEqual = (a, b) => a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!isEqual(a[i], b[i])) return false;
  }
  return true;
}
