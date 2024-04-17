import { Group } from '../wrapped.js';
import { test, Random } from '../../testing/property.js';
import { Provable } from '../provable.js';
import { Poseidon } from '../../../mina-signer/src/poseidon-bigint.js';
import { synchronousRunners } from '../core/provable-context.js';
import { Scalar } from '../scalar.js';
import { Field } from '../field.js';

let { runAndCheckSync } = await synchronousRunners();

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
