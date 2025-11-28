import { Poseidon } from '../crypto/poseidon.js';
import { verify, ZkProgram } from '../../proof-system/zkprogram.js';
import { expect } from 'expect';
import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { assert } from '../gadgets/common.js';

// OFF-CIRCUIT COLLISION CHECKS EVEN LENGTH INPUTS PADDED WITH ZEROES
// Outside the circuit, the Poseidon hash function lacks length constraints and 
// collisions are expected to appear when inputs are padded with zeroes to reach 
// even lengths. To avoid such collisions, include the length of your message as 
// part of the hash input using `Poseidon.hashAnyLength()`.
{
    const max = 10;
    const min = 1;
    const len = 2 * (Math.floor(Math.random() * (max - min + 1)) + min);
    const message = Array.from({ length: len - 1 }, () => Field.random());
    const message_pad = [...message, new Field(0)];
    const hash = Poseidon.hash(message);
    const hash_pad = Poseidon.hash(message_pad);
    expectCollision(hash, hash_pad, message, message_pad);
    const hash_any_len = Poseidon.hashAnyLength(message);
    const hash_pad_any_len = Poseidon.hashAnyLength(message_pad);
    expectNoCollision(hash_any_len, hash_pad_any_len, message, message_pad);
}

// IN-CIRCUIT COLLISION TESTS
// These tests show that in-circuit, the same strategy of padding inputs with
// zeroes does not lead to a security risk, because the proof verification does
// not hold against the key for the other circuit.
// 
// We use these circuits to more clearly show the behavior of our Poseidon
// function and better showcase the difference or equivalence between several
// ways of handling the padding of inputs to reach even lengths.

    {
        // A Poseidon circuit for even length inputs (4)
        const PoseidonEven = ZkProgram({
            name: `test-poseidon-even`,
            publicOutput: Field,
            methods: {
                hash: {
                    privateInputs: [Provable.Array(Field, 4)],
                    async method(input: Field[]) {
                        return { publicOutput: Poseidon.hash(input) };
                    },
                },
            },
        });
        
        // Poseidon circuit for odd length inputs (3), embedded padding with zero
        const PoseidonPad = ZkProgram({
            name: `test-poseidon-pad`,
            publicOutput: Field,
            methods: {
                hash: {
                    privateInputs: [Provable.Array(Field, 3)],
                    async method(input: Field[]) {
                        // Pushing a zero to make the input even size (4)
                        return { publicOutput: Poseidon.hash([...input, new Field(0)]) };
                    },
                },
            },
        });

        // Poseidon circuit for odd length inputs (3), meant for the pad to happen internally 
        const PoseidonOdd = ZkProgram({
            name: `test-poseidon-odd`,
            publicOutput: Field,
            methods: {
                hash: {
                    privateInputs: [Provable.Array(Field, 3)],
                    async method(input: Field[]) {
                        // Do nothing to the input, the padding happens in the witness
                        return { publicOutput: Poseidon.hash(input) };
                    },
                },
            },
        });
        
        let vkEven = await PoseidonEven.compile();
        let vkPad = await PoseidonPad.compile();
        let vkOdd = await PoseidonOdd.compile();

        expectEqualCircuit({ nameA: 'PoseidonPad', vkA: vkPad, circuitA: PoseidonPad }, { nameB: 'PoseidonOdd', vkB: vkOdd, circuitB: PoseidonOdd });
        expectUnequalCircuit({ nameA: 'PoseidonEven', vkA: vkEven }, { nameB: 'PoseidonOdd', vkB: vkOdd });
        expectUnequalCircuit({ nameA: 'PoseidonEven', vkA: vkEven }, { nameB: 'PoseidonPad', vkB: vkPad });
        
        let msgOdd = [Field.random(), Field.random(), Field.random()];
        let msgEven = [...msgOdd, new Field(0)];

        let pfEven = await PoseidonEven.hash(msgEven);
        let pfPad = await PoseidonPad.hash(msgOdd);
        let pfOdd = await PoseidonOdd.hash(msgOdd);

        let hashEven = pfEven.proof.publicOutput;
        let hashPad = pfPad.proof.publicOutput;
        let hashOdd = pfOdd.proof.publicOutput;

        // Even if the digests are equal (expected), the proofs do not verify cross-wise
        expectCollision(hashEven, hashPad, msgEven, msgOdd);
        expectCollision(hashEven, hashOdd, msgEven, msgOdd);
        expectCollision(hashPad, hashOdd, msgOdd, msgOdd);
    
        expectNoForgery(pfEven.proof, vkPad);
        expectNoForgery(pfEven.proof, vkOdd);
    
       await expectToThrow(async () => {
            await PoseidonOdd.hash([...msgOdd, new Field(0)]);
        }, 'Expected witnessed values of length 3, got 4');

        function expectToThrow<T>(fn: () => Promise<T>, msg: string) {
            return fn().then(
                () => {
                    throw new Error('Expected function to throw');
                },
                (e) => {
                    if (!e.message.includes(msg)) {
                        throw new Error(`Expected error message to include "${msg}", but got "${e.message}"`);
                    }
                    console.log('Caught expected error:', e.message);
                }
            );
        }
}

function expectCollision(hashA: Field, hashB: Field, msgA: Field[], msgB: Field[]) {
    function formatPoseidonInput(values: Field[]) {
        if (values.length === 0) return '[]';
        return `[${values.map((x) => x.toString()).join(', ')}]`;
    }
    try {
        expect(hashA).toEqual(hashB);
    } catch (error) {
        console.error(
        [
            'Collision should have been found for padded inputs, but was not:',
            `msgA: ${formatPoseidonInput(msgA)}`,
            `msgB: ${formatPoseidonInput(msgB)}`,
            `hashA: ${hashA.toString()}`,
            `hashB: ${hashB.toString()}`,
        ].join('\n ')
    );
    }
}

function expectNoCollision(hashA: Field, hashB: Field, msgA: Field[], msgB: Field[]) {
    function formatPoseidonInput(values: Field[]) {
        if (values.length === 0) return '[]';
        return `[${values.map((x) => x.toString()).join(', ')}]`;
    }
    try {
        expect(hashA).not.toEqual(hashB);
    } catch (error) {
        console.error(
        [
            'Unexpected Poseidon collision found for padded inputs:',
            `msgA: ${formatPoseidonInput(msgA)}`,
            `msgB: ${formatPoseidonInput(msgB)}`,
            `hashA: ${hashA.toString()}`,
            `hashB: ${hashB.toString()}`,
        ].join('\n ')
    );
    }
}

function expectEqualCircuit({ nameA, vkA, circuitA }: any, { nameB, vkB, circuitB }: any) {
    try {
        assert(circuitA.hash.rows === circuitB.hash.rows);
    } catch (e) {
        console.error('Circuits do not have the same number of rows', e);
        console.log('{} rows:', nameA, circuitA.hash.rows);
        console.log('{} rows:', nameB, circuitB.hash.rows);
        console.log('');
    };
    try {
        assert(vkA.verificationKey.data === vkB.verificationKey.data);
    } catch (e) {
        console.error('Verification keys are different but should be equal:', e);
        console.log('{} vk:', nameA, vkA.verificationKey.data);
        console.log('{} vk:', nameB, vkB.verificationKey.data);
        console.log('');
    }
}

function expectUnequalCircuit({ nameA, vkA }: any, { nameB, vkB }: any) {
    try {
        assert(vkA.verificationKey.data !== vkB.verificationKey.data);
    } catch (e) {
        console.error('Verification keys are equal but should differ:', e);
        console.log('{} vk:', nameA, vkA.verificationKey.data);
        console.log('{} vk:', nameB, vkB.verificationKey.data);
        console.log('');
    }
}

async function expectNoForgery(proofA: any, vkB: any) {
    try {
        const cross = await verify(proofA, vkB.verificationKey);
        assert(!cross);
    } catch (e) {
        console.error('Proof verification forgery happened:', e);
        console.log('proofA:', proofA);
        console.log('vkB:', vkB.verificationKey);
        console.log('');
    }
}
