export default [
  {
    name: 'Snarky',
    props: [
      { name: 'exists', type: 'function' },
      { name: 'existsVar', type: 'function' },
      {
        name: 'asProver',
        type: 'function',
      },
      {
        name: 'runAndCheck',
        type: 'function',
      },
      {
        name: 'runUnchecked',
        type: 'function',
      },
      {
        name: 'constraintSystem',
        type: 'function',
      },
      {
        name: 'field',
        type: 'object',
      },
      {
        name: 'group',
        type: 'object',
      },
      {
        name: 'bool',
        type: 'object',
      },
      {
        name: 'circuit',
        type: 'object',
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
      {
        name: 'hashToGroup',
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
        name: 'transactionCommitments',
        type: 'function',
      },
      {
        name: 'zkappPublicInput',
        type: 'function',
      },
      {
        name: 'checkAccountUpdateSignature',
        type: 'function',
      },
      {
        name: 'fieldsOfJson',
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
        name: 'encoding',
        type: 'object',
      },
      {
        name: 'signature',
        type: 'object',
      },
      {
        name: 'transactionHash',
        type: 'object',
      },
    ],
  },
];
