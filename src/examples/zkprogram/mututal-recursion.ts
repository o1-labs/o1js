import { ZkProgram, Field, DynamicProof, Proof, VerificationKey, Void, Undefined, verify } from "o1js";

class DynamicMultiplyProof extends DynamicProof<Undefined, Field> {
    static publicInputType = Undefined;
    static publicOutputType = Field;
    static maxProofsVerified = 1 as const;
}

const add = ZkProgram({
    name: "program1",
    publicInput: Undefined,
    publicOutput: Field,
    methods: {
        performAddition: {
            privateInputs: [Field, DynamicMultiplyProof, VerificationKey],
            async method(field: Field, proof: DynamicMultiplyProof, vk: VerificationKey) {
                const multiplyResult = proof.publicOutput;
                // Skip verification in case the input is 0, as that is our base-case
                proof.verifyIf(vk, multiplyResult.equals(Field(0)).not());

                const additionResult = multiplyResult.add(field);
                return additionResult
            },
        }
    },
})

const AddProof = ZkProgram.Proof(add);

const multiply = ZkProgram({
    name: "program2",
    publicInput: Undefined,
    publicOutput: Field,
    methods: {
        performMultiplication: {
            privateInputs: [Field, AddProof],
            async method(field: Field, addProof: Proof<Undefined, Field>) {
                addProof.verify();
                const multiplicationResult = addProof.publicOutput.mul(field);
                return multiplicationResult;
            },
        }
    },
})

console.log("Compiling circuits...")
const addVk = (await add.compile()).verificationKey;
console.log("2")
const multiplyVk = (await multiply.compile()).verificationKey;

console.log("Proving basecase");
const dummyProof = await DynamicMultiplyProof.dummy(undefined, Field(0), 1);
const baseCase = await add.performAddition(Field(5), dummyProof, multiplyVk);

console.log("Verifing basecase")
const validBaseCase = await verify(baseCase, addVk);
console.log('ok?', validBaseCase);

console.log("Proving first multiplication")
const multiply1 = await multiply.performMultiplication(Field(3), baseCase);

console.log("Verifing multiplication")
const validMultiplication = await verify(multiply1, multiplyVk);
console.log('ok?', validMultiplication);

console.log("Proving second (recursive) addition")
const add2 = await add.performAddition(Field(4), DynamicMultiplyProof.fromProof(multiply1), multiplyVk);

console.log("Verifing addition")
const validAddition = await verify(add2, addVk);
console.log('ok?', validAddition);

console.log("Result (should be 19):", add2.publicOutput.toBigInt())