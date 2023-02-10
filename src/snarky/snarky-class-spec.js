export default [
  {
    name: 'Field',
    props: [
      {
        name: 'one',
        type: 'object',
      },
      {
        name: 'zero',
        type: 'object',
      },
      {
        name: 'minusOne',
        type: 'object',
      },
      {
        name: 'ORDER',
        type: 'bigint',
      },
      {
        name: 'random',
        type: 'function',
      },
      {
        name: 'add',
        type: 'function',
      },
      {
        name: 'sub',
        type: 'function',
      },
      {
        name: 'mul',
        type: 'function',
      },
      {
        name: 'div',
        type: 'function',
      },
      {
        name: 'neg',
        type: 'function',
      },
      {
        name: 'inv',
        type: 'function',
      },
      {
        name: 'square',
        type: 'function',
      },
      {
        name: 'sqrt',
        type: 'function',
      },
      {
        name: 'toString',
        type: 'function',
      },
      {
        name: 'sizeInFields',
        type: 'function',
      },
      {
        name: 'toFields',
        type: 'function',
      },
      {
        name: 'fromFields',
        type: 'function',
      },
      {
        name: 'assertEqual',
        type: 'function',
      },
      {
        name: 'assertBool',
        type: 'function',
      },
      {
        name: 'assertBoolean',
        type: 'function',
      },
      {
        name: 'isZero',
        type: 'function',
      },
      {
        name: 'fromBits',
        type: 'function',
      },
      {
        name: 'toBits',
        type: 'function',
      },
      {
        name: 'equal',
        type: 'function',
      },
      {
        name: 'toJSON',
        type: 'function',
      },
      {
        name: 'fromJSON',
        type: 'function',
      },
      {
        name: 'fromNumber',
        type: 'function',
      },
      {
        name: 'fromString',
        type: 'function',
      },
      {
        name: 'fromBigInt',
        type: 'function',
      },
      {
        name: 'check',
        type: 'function',
      },
    ],
  },
  {
    name: 'Bool',
    props: [
      {
        name: 'true',
        type: 'object',
      },
      {
        name: 'false',
        type: 'object',
      },
      {
        name: 'toField',
        type: 'function',
      },
      {
        name: 'Unsafe',
        type: 'object',
      },
      {
        name: 'not',
        type: 'function',
      },
      {
        name: 'and',
        type: 'function',
      },
      {
        name: 'or',
        type: 'function',
      },
      {
        name: 'assertEqual',
        type: 'function',
      },
      {
        name: 'equal',
        type: 'function',
      },
      {
        name: 'count',
        type: 'function',
      },
      {
        name: 'sizeInFields',
        type: 'function',
      },
      {
        name: 'toFields',
        type: 'function',
      },
      {
        name: 'fromFields',
        type: 'function',
      },
      {
        name: 'check',
        type: 'function',
      },
      {
        name: 'toJSON',
        type: 'function',
      },
      {
        name: 'fromJSON',
        type: 'function',
      },
    ],
  },
  {
    name: 'Circuit',
    props: [
      {
        name: 'runAndCheck',
        type: 'function',
      },
      {
        name: '_constraintSystem',
        type: 'function',
      },
      {
        name: 'asProver',
        type: 'function',
      },
      {
        name: '_witness',
        type: 'function',
      },
      {
        name: 'array',
        type: 'function',
      },
      {
        name: 'generateKeypair',
        type: 'function',
      },
      {
        name: 'prove',
        type: 'function',
      },
      {
        name: 'verify',
        type: 'function',
      },
      {
        name: 'assertEqual',
        type: 'function',
      },
      {
        name: 'equal',
        type: 'function',
      },
      {
        name: 'toFields',
        type: 'function',
      },
      {
        name: 'inProver',
        type: 'function',
      },
      {
        name: 'inCheckedComputation',
        type: 'function',
      },
      {
        name: 'if',
        type: 'function',
      },
      {
        name: 'getVerificationKey',
        type: 'function',
      },
    ],
  },
  {
    name: 'Poseidon',
    props: [
      {
        name: 'hash',
        type: 'function',
      },
      {
        name: 'update',
        type: 'function',
      },
      {
        name: 'prefixes',
        type: 'object',
      },
      {
        name: 'spongeCreate',
        type: 'function',
      },
      {
        name: 'spongeAbsorb',
        type: 'function',
      },
      {
        name: 'spongeSqueeze',
        type: 'function',
      },
    ],
  },
  {
    name: 'Group',
    props: [
      {
        name: 'generator',
        type: 'object',
      },
      {
        name: 'add',
        type: 'function',
      },
      {
        name: 'sub',
        type: 'function',
      },
      {
        name: 'neg',
        type: 'function',
      },
      {
        name: 'scale',
        type: 'function',
      },
      {
        name: 'assertEqual',
        type: 'function',
      },
      {
        name: 'equal',
        type: 'function',
      },
      {
        name: 'toFields',
        type: 'function',
      },
      {
        name: 'fromFields',
        type: 'function',
      },
      {
        name: 'sizeInFields',
        type: 'function',
      },
      {
        name: 'check',
        type: 'function',
      },
      {
        name: 'toJSON',
        type: 'function',
      },
      {
        name: 'fromJSON',
        type: 'function',
      },
    ],
  },
  {
    name: 'Scalar',
    props: [
      {
        name: 'toFields',
        type: 'function',
      },
      {
        name: 'sizeInFields',
        type: 'function',
      },
      {
        name: 'fromFields',
        type: 'function',
      },
      {
        name: 'random',
        type: 'function',
      },
      {
        name: 'fromBits',
        type: 'function',
      },
      {
        name: 'toJSON',
        type: 'function',
      },
      {
        name: 'fromJSON',
        type: 'function',
      },
      {
        name: 'check',
        type: 'function',
      },
    ],
  },
  {
    name: 'Ledger',
    props: [
      {
        name: 'create',
        type: 'function',
      },
      {
        name: 'customTokenId',
        type: 'function',
      },
      {
        name: 'customTokenIdChecked',
        type: 'function',
      },
      {
        name: 'createTokenAccount',
        type: 'function',
      },
      {
        name: 'hashTransaction',
        type: 'function',
      },
      {
        name: 'hashTransactionChecked',
        type: 'function',
      },
      {
        name: 'transactionCommitments',
        type: 'function',
      },
      {
        name: 'zkappPublicInput',
        type: 'function',
      },
      {
        name: 'signFieldElement',
        type: 'function',
      },
      {
        name: 'dummySignature',
        type: 'function',
      },
      {
        name: 'signFeePayer',
        type: 'function',
      },
      {
        name: 'signOtherAccountUpdate',
        type: 'function',
      },
      {
        name: 'publicKeyToString',
        type: 'function',
      },
      {
        name: 'publicKeyOfString',
        type: 'function',
      },
      {
        name: 'privateKeyToString',
        type: 'function',
      },
      {
        name: 'privateKeyOfString',
        type: 'function',
      },
      {
        name: 'fieldToBase58',
        type: 'function',
      },
      {
        name: 'fieldOfBase58',
        type: 'function',
      },
      {
        name: 'memoToBase58',
        type: 'function',
      },
      { name: 'memoHashBase58', type: 'function' },
      {
        name: 'checkAccountUpdateSignature',
        type: 'function',
      },
      {
        name: 'fieldsOfJson',
        type: 'function',
      },
      {
        name: 'hashAccountUpdateFromFields',
        type: 'function',
      },
      {
        name: 'hashAccountUpdateFromJson',
        type: 'function',
      },
      {
        name: 'hashInputFromJson',
        type: 'object',
      },
      { name: 'encoding', type: 'object' },
    ],
  },
  {
    name: 'Pickles',
    props: [
      {
        name: 'compile',
        type: 'function',
      },
      {
        name: 'circuitDigest',
        type: 'function',
      },
      {
        name: 'verify',
        type: 'function',
      },
      {
        name: 'dummyBase64Proof',
        type: 'function',
      },
      {
        name: 'dummyVerificationKey',
        type: 'function',
      },
      {
        name: 'proofToBase64',
        type: 'function',
      },
      {
        name: 'proofOfBase64',
        type: 'function',
      },
      {
        name: 'proofToBase64Transaction',
        type: 'function',
      },
    ],
  },
  {
    name: 'Test',
    props: [
      {
        name: 'transactionHash',
        type: 'object',
      },
    ],
  },
];
