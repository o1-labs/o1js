import { Group } from '../wrapped.js';
import { test, Random } from '../../testing/property.js';
import { Provable } from '../provable.js';
import { Poseidon } from '../../../mina-signer/src/poseidon-bigint.js';
import { synchronousRunners } from '../core/provable-context.js';
import { Scalar } from '../scalar.js';
import { Field } from '../field.js';
import { equivalentProvable, spec, unit } from '../../testing/equivalent.js';
import { Bool } from '../bool.js';
import assert from 'assert';

let { runAndCheckSync } = await synchronousRunners();

const q = Scalar.ORDER;

console.log('group consistency tests');

test(Random.field, Random.scalar, Random.field, (a, s0, x0, assert) => {
  const g = Group(Poseidon.hashToGroup([a])!);

  // scale by a scalar
  const s = Scalar.from(s0);
  runScale(g, s, (g, s) => g.scale(s), assert);

  // scale by a field
  const x = Field.from(x0);
  runScale(g, x, (g, x) => g.scale(x), assert);
});

// tests consistency between in- and out-circuit implementations
test(Random.field, Random.field, (a, b, assert) => {
  const zero = Group.zero;
  const g1 = Group(Poseidon.hashToGroup([a])!);
  const g2 = Group(Poseidon.hashToGroup([b])!);

  run(g1, g2, (x, y) => x.add(y), assert);
  run(g1.neg(), g2.neg(), (x, y) => x.add(y), assert);
  run(g1, g1.neg(), (x, y) => x.add(y), assert);
  run(g1, zero, (x, y) => x.add(y), assert);
  run(g1, zero.neg(), (x, y) => x.add(y), assert);
  run(g1.neg(), zero, (x, y) => x.add(y), assert);

  run(zero, zero, (x, y) => x.add(y), assert);
  run(zero, zero.neg(), (x, y) => x.add(y), assert);
  run(zero.neg(), zero, (x, y) => x.add(y), assert);
  run(zero.neg(), zero.neg(), (x, y) => x.add(y), assert);

  run(g1, g2, (x, y) => x.sub(y), assert);
  run(g1.neg(), g2.neg(), (x, y) => x.sub(y), assert);
  run(g1, g1.neg(), (x, y) => x.sub(y), assert);
  run(g1, zero, (x, y) => x.sub(y), assert);
  run(g1, zero.neg(), (x, y) => x.sub(y), assert);
  run(g1.neg(), zero, (x, y) => x.sub(y), assert);

  run(zero, zero, (x, y) => x.sub(y), assert);
  run(zero, zero.neg(), (x, y) => x.sub(y), assert);
  run(zero.neg(), zero, (x, y) => x.sub(y), assert);
  run(zero.neg(), zero.neg(), (x, y) => x.sub(y), assert);
});

// tests for toCanonical

const scalar = spec({
  rng: Random.scalar,
  there: Scalar.from,
  back: (s) => s.toBigInt(),
  provable: Scalar,
});

const nonCanonicalScalar = spec({
  // number between 0 and 2^256 - 3q < q, so that q < x + 3q - 2^255 < 2^255 is a valid but non-canonical shifted scalar
  rng: Random.bignat((1n << 256n) - 3n * q),
  there(s: bigint) {
    let t = s + 3n * q - (1n << 255n);
    return Scalar.fromShiftedScalar({
      lowBit: new Bool((t & 1n) === 1n),
      high254: Field.from(t >> 1n),
    });
  },
  back: (s: Scalar) => s.toBigInt(),
  provable: Scalar,
});

equivalentProvable({ from: [scalar], to: unit, verbose: true })(
  () => true,
  (s) => {
    let sCanonical = Scalar.toCanonical(s);

    // equivalent to the input according to Provable.equal()
    Provable.equal(Scalar, s, sCanonical).assertTrue();

    // and also has exactly the same field elements as input
    return sCanonical.high254
      .equals(s.high254)
      .and(sCanonical.lowBit.equals(s.lowBit));
  },
  'toCanonical(canonical)'
);

equivalentProvable({ from: [nonCanonicalScalar], to: unit, verbose: true })(
  () => false,
  (s) => {
    let sCanonical = Scalar.toCanonical(s);

    // equivalent to the input according to Provable.equal()
    Provable.equal(Scalar, s, sCanonical).assertTrue();

    // but has different field elements as input
    return sCanonical.high254
      .equals(s.high254)
      .and(sCanonical.lowBit.equals(s.lowBit));
  },
  'toCanonical(nonCanonical)'
);

const g = Group.generator;

runAndCheckSync(() => {
  let badZero = Provable.witness(Scalar, () => nonCanonicalScalar.there(0n));
  let badMinusOne = Provable.witness(Scalar, () =>
    nonCanonicalScalar.there(-1n)
  );

  // incomplete scalar multiplication
  assert.throws(() => g.scale(badZero), /Field.inv: zero/);
  assert.throws(() => g.scale(badMinusOne), /Field.inv: zero/);

  // becomes complete with toCanonical()
  let goodZero = Scalar.toCanonical(badZero);
  let goodMinusOne = Scalar.toCanonical(badMinusOne);
  g.scale(goodZero).assertEquals(Group.zero);
  g.scale(goodMinusOne).assertEquals(g.neg());
});

// helpers

function run(
  g1: Group,
  g2: Group,
  f: (g1: Group, g2: Group) => Group,
  assert: (b: boolean, message?: string | undefined) => void
) {
  let result_out_circuit = f(g1, g2);

  runAndCheckSync(() => {
    let result_in_circuit = f(
      Provable.witness(Group, () => g1),
      Provable.witness(Group, () => g2)
    );

    Provable.asProver(() => {
      assert(
        result_out_circuit.equals(result_in_circuit).toBoolean(),
        `Result for x does not match. g1: ${JSON.stringify(
          g1
        )}, g2: ${JSON.stringify(g2)}`
      );
    });
  });
}

function runScale<T extends Scalar | Field>(
  g: Group,
  s: T,
  f: (g1: Group, s: T) => Group,
  assert: (b: boolean, message?: string | undefined) => void
) {
  let result_out_circuit = f(g, s);

  runAndCheckSync(() => {
    let result_in_circuit = f(
      Provable.witness(Group, () => g),
      Provable.witness(s.constructor as any, (): T => s)
    );

    Provable.asProver(() => {
      assert(
        result_out_circuit.equals(result_in_circuit).toBoolean(),
        `Result for x does not match. g: ${JSON.stringify(
          g
        )}, s: ${JSON.stringify(s)}
        
        out_circuit: ${JSON.stringify(result_out_circuit)}
        in_circuit: ${JSON.stringify(result_in_circuit)}`
      );
    });
  });
}
