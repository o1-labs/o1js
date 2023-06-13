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
        name: 'bool',
        type: 'object',
      },
      {
        name: 'group',
        type: 'object',
      },
      {
        name: 'circuit',
        type: 'object',
      },
      {
        name: 'poseidon',
        type: 'object',
      },
      {
        name: 'foreignField',
        type: 'object',
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
        name: 'tokenId',
        type: 'object',
      },
      {
        name: 'signature',
        type: 'object',
      },
      {
        name: 'fieldsFromJson',
        type: 'object',
      },
      {
        name: 'hashFromJson',
        type: 'object',
      },
      {
        name: 'hashInputFromJson',
        type: 'object',
      },
      {
        name: 'transactionHash',
        type: 'object',
      },
    ],
  },
];
