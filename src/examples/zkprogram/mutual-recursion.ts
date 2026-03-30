import { DynamicProof, Field, Proof, Undefined, VerificationKey, ZkProgram, verify } from 'o1js';
import { Performance } from '../../lib/testing/perf-regression.js';

/**
 * This example showcases mutual recursion (A -> B -> A) through two circuits that respectively
 * add or multiply a given publicInput.
 * Every multiplication or addition step consumes a previous proof from the other circuit to verify prior state.
 */

class DynamicMultiplyProof extends DynamicProof<Undefined, Field> {
  static publicInputType = Undefined;
  static publicOutputType = Field;
  static maxProofsVerified = 1 as const;
}

const add = ZkProgram({
  name: 'add',
  publicInput: Undefined,
  publicOutput: Field,
  methods: {
    performAddition: {
      privateInputs: [Field, DynamicMultiplyProof, VerificationKey],
      async method(field: Field, proof: DynamicMultiplyProof, vk: VerificationKey) {
        // TODO The incoming verification key isn't constrained in any way, therefore a malicious prover
        // can inject any vk they like which could lead to security issues. In practice, there would always
        // be some sort of access control to limit the set of possible vks used.

        const multiplyResult = proof.publicOutput;
        // Skip verification in case the input is 0, as that is our base-case
        proof.verifyIf(vk, multiplyResult.equals(Field(0)).not());

        const additionResult = multiplyResult.add(field);
        return { publicOutput: additionResult };
      },
    },
  },
});

const multiply = ZkProgram({
  name: 'multiply',
  publicInput: Undefined,
  publicOutput: Field,
  methods: {
    performMultiplication: {
      privateInputs: [Field, add.Proof],
      async method(field: Field, addProof: Proof<Undefined, Field>) {
        addProof.verify();
        const multiplicationResult = addProof.publicOutput.mul(field);
        return { publicOutput: multiplicationResult };
      },
    },
  },
});

const csAdd = await add.analyzeMethods();
const csMultiply = await multiply.analyzeMethods();

const perfAdd = Performance.create(add.name, csAdd);
const perfMultiply = Performance.create(multiply.name, csMultiply);

perfAdd.start('compile');
const addVk = (await add.compile()).verificationKey;
perfAdd.end();

perfMultiply.start('compile');
const multiplyVk = (await multiply.compile()).verificationKey;
perfMultiply.end();

const dummyProof = await DynamicMultiplyProof.dummy(undefined, Field(0), 1);

perfAdd.start('prove', 'performAddition');
const { proof: baseCase } = await add.performAddition(Field(5), dummyProof, multiplyVk);
perfAdd.end();

perfAdd.start('verify', 'performAddition');
const validBaseCase = await verify(baseCase, addVk);
perfAdd.end();
console.log('ok?', validBaseCase);
if (!validBaseCase) throw new Error('proof verification failed!');

perfMultiply.start('prove', 'performMultiplication');
const { proof: multiply1 } = await multiply.performMultiplication(Field(3), baseCase);
perfMultiply.end();

perfMultiply.start('verify', 'performMultiplication');
const validMultiplication = await verify(multiply1, multiplyVk);
perfMultiply.end();
console.log('ok?', validMultiplication);
if (!validMultiplication) throw new Error('proof verification failed!');

console.log('Proving second (recursive) addition');
const { proof: add2 } = await add.performAddition(
  Field(4),
  DynamicMultiplyProof.fromProof(multiply1),
  multiplyVk
);

const validAddition = await verify(add2, addVk);
console.log('ok?', validAddition);
if (!validAddition) throw new Error('proof verification failed!');

console.log('Result (should be 19):', add2.publicOutput.toBigInt());
