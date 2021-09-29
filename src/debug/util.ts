import { Bool, Field, Circuit } from '../snarky';

export function time<A>(s: string, f: () => A): A {
  const start = new Date();
  const res = f();
  const stop = new Date();
  console.log(`${s}: ${stop.getTime() - start.getTime()}ms`);
  return res;
}

export function packBytes(s: string): Field {
  console.assert(s.length < 32);
  let bits: Array<boolean> = [];
  for (let i = 0; i < s.length; ++i) {
    const c = s.charCodeAt(i);
    for (let j = 0; j < 8; ++j) {
      bits.push(((c >> j) & 1) === 1);
    }
  }
  return Field.ofBits(bits);
}

function getElt<A>(xs: Array<A>, i: Field): A {
  let [x, found] = xs.reduce(
    ([acc, found], x, j) => {
      let eltHere = i.equals(j);
      return [Circuit.if(eltHere, x, acc), found.or(eltHere)];
    },
    [xs[0], new Bool(false)]
  );
  found.assertEquals(true);
  return x;
}
