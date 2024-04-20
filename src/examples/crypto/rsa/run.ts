


import { ZkProgram } from 'o1js';
import  { 
    Bigint2048, 
    rsaVerify65537,
} from '../../../../dist/examples/crypto/rsa/rsa.js';
import { 
    generateDigestBigint,
    generateRsaParams,
    rsaSign,
} from '../../../../dist/examples/crypto/rsa/testUtils.js';

let rsaZkProgram = ZkProgram({
    name: 'rsa-verify',

    methods: {
        verifyRsa65537: {
            privateInputs: [Bigint2048, Bigint2048, Bigint2048],

            async method(
                message: Bigint2048,
                signature: Bigint2048,
                modulus: Bigint2048
            ) {
                rsaVerify65537(message, signature, modulus);
            },
        },
    },
});

let { verifyRsa65537 } = await rsaZkProgram.analyzeMethods();

console.log(verifyRsa65537.summary());
// console.log('rows', verifyRsa65537.rows);

console.time('compile');
const forceRecompileEnabled = false;
await rsaZkProgram.compile({ forceRecompile: forceRecompileEnabled });
console.timeEnd('compile');

const input = generateDigestBigint('How are you!');
const params = generateRsaParams(2048);

console.time('generate RSA parameters: 2048 bits');
const message = Bigint2048.from(input);
const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
const modulus = Bigint2048.from(params.n);
console.timeEnd('generate RSA parameters: 2048 bits');

console.time('prove');
let proof = await rsaZkProgram.verifyRsa65537(message, signature, modulus);
console.timeEnd('prove');

console.time('verify');
await rsaZkProgram.verify(proof);
console.timeEnd('verify');