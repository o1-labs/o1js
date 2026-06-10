import { expect } from 'expect';
import { AccountUpdate, Bool, PrivateKey } from '../../../index.js';
import { TransactionLimits } from './constants.js';
import { filterGroups } from './mina.js';
import { getSegmentsAndEvents, verifyTransactionLimits } from './transaction-validation.js';

let S = { isProved: false, isSigned: true };
let N = { isProved: false, isSigned: false };
let P = { isProved: true, isSigned: false };

expect(filterGroups([S, S, S, S, S, S])).toEqual({
  proof: 0,
  signedPair: 3,
  signedSingle: 0,
});

expect(filterGroups([N, N, N, N, N, N])).toEqual({
  proof: 0,
  signedPair: 3,
  signedSingle: 0,
});

expect(filterGroups([N, S, S, N, N, S])).toEqual({
  proof: 0,
  signedPair: 3,
  signedSingle: 0,
});

expect(filterGroups([S, P, S, S, S, S])).toEqual({
  proof: 1,
  signedPair: 2,
  signedSingle: 1,
});

expect(filterGroups([N, P, N, P, N, P])).toEqual({
  proof: 3,
  signedPair: 0,
  signedSingle: 3,
});

expect(filterGroups([N, P])).toEqual({
  proof: 1,
  signedPair: 0,
  signedSingle: 1,
});

expect(filterGroups([N, S])).toEqual({
  proof: 0,
  signedPair: 1,
  signedSingle: 0,
});

expect(filterGroups([P, P])).toEqual({
  proof: 2,
  signedPair: 0,
  signedSingle: 0,
});

expect(filterGroups([P, P, S, N, N])).toEqual({
  proof: 2,
  signedPair: 1,
  signedSingle: 1,
});

expect(filterGroups([P])).toEqual({
  proof: 1,
  signedPair: 0,
  signedSingle: 0,
});

expect(filterGroups([S])).toEqual({
  proof: 0,
  signedPair: 0,
  signedSingle: 1,
});

expect(filterGroups([N])).toEqual({
  proof: 0,
  signedPair: 0,
  signedSingle: 1,
});

expect(filterGroups([N, N])).toEqual({
  proof: 0,
  signedPair: 1,
  signedSingle: 0,
});

expect(filterGroups([N, S])).toEqual({
  proof: 0,
  signedPair: 1,
  signedSingle: 0,
});

expect(filterGroups([S, N])).toEqual({
  proof: 0,
  signedPair: 1,
  signedSingle: 0,
});

expect(filterGroups([S, S])).toEqual({
  proof: 0,
  signedPair: 1,
  signedSingle: 0,
});

// edge case tests for account update segment limits
// formula: np + n2 + n1 <= 16
{
  const feePayer = S;
  const proofAUs = Array(15).fill(P);
  const authKinds = [feePayer, ...proofAUs];
  expect(filterGroups(authKinds)).toEqual({
    proof: 15,
    signedPair: 0,
    signedSingle: 1,
  });
}

{
  const feePayer = S;
  const proofAUs = Array(16).fill(P);
  const authKinds = [feePayer, ...proofAUs];
  expect(filterGroups(authKinds)).toEqual({
    proof: 16,
    signedPair: 0,
    signedSingle: 1,
  });
}

{
  const nonProofAUs = Array(32).fill(S); // includes fee payer
  expect(filterGroups(nonProofAUs)).toEqual({
    proof: 0,
    signedPair: 16,
    signedSingle: 0,
  });
}

{
  const nonProofAUs = Array(33).fill(S); // includes fee payer
  expect(filterGroups(nonProofAUs)).toEqual({
    proof: 0,
    signedPair: 16,
    signedSingle: 1,
  });
}

{
  expect(filterGroups([S, S, P, S, S, S])).toEqual({
    proof: 1,
    signedPair: 2,
    signedSingle: 1,
  });
}
{
  const pattern: (typeof S)[] = [];
  for (let i = 0; i < 7; i++) {
    pattern.push(S, S, P);
  }
  pattern.push(S, S, S, S); // 4 more S's = 2 pairs
  expect(filterGroups(pattern)).toEqual({
    proof: 7,
    signedPair: 9,
    signedSingle: 0,
  });
}

{
  const pattern: (typeof S)[] = [];
  for (let i = 0; i < 8; i++) {
    pattern.push(S, S, P);
  }
  pattern.push(P);
  expect(filterGroups(pattern)).toEqual({
    proof: 9,
    signedPair: 8,
    signedSingle: 0,
  });
}
{
  const pattern: (typeof S)[] = [];
  for (let i = 0; i < 8; i++) {
    pattern.push(S, P);
  }

  expect(filterGroups(pattern)).toEqual({
    proof: 8,
    signedPair: 0,
    signedSingle: 8,
  });
}

{
  expect(filterGroups([S, N, S, N, S, N])).toEqual({
    proof: 0,
    signedPair: 3,
    signedSingle: 0,
  });
}
const testAddress = PrivateKey.random().toPublicKey();

function createAccountUpdateWithAuth(authKind: 'signed' | 'none' | 'proof'): AccountUpdate {
  const accountUpdate = AccountUpdate.default(testAddress);

  switch (authKind) {
    case 'signed':
      accountUpdate.body.authorizationKind.isSigned = Bool(true);
      accountUpdate.body.authorizationKind.isProved = Bool(false);
      break;
    case 'none':
      accountUpdate.body.authorizationKind.isSigned = Bool(false);
      accountUpdate.body.authorizationKind.isProved = Bool(false);
      break;
    case 'proof':
      accountUpdate.body.authorizationKind.isSigned = Bool(false);
      accountUpdate.body.authorizationKind.isProved = Bool(true);
      break;
  }

  return accountUpdate;
}

{
  // 15 proof AUs -> should result in 16 segments (with fee payer)
  const proofAUs = Array.from({ length: 15 }, () => createAccountUpdateWithAuth('proof'));

  const { segments } = getSegmentsAndEvents(proofAUs);

  expect(segments).toEqual({
    proof: 15,
    signedPair: 0,
    signedSingle: 1, // fee payer
  });
}

type TestZkappCommand = Parameters<typeof verifyTransactionLimits>[0];

{
  const accountUpdates = Array.from({ length: 15 }, () => createAccountUpdateWithAuth('proof'));
  expect(() => verifyTransactionLimits({ accountUpdates } as TestZkappCommand)).not.toThrow();
}

{
  const accountUpdates = Array.from({ length: 16 }, () => createAccountUpdateWithAuth('proof'));
  expect(() => verifyTransactionLimits({ accountUpdates } as TestZkappCommand)).toThrow(
    /too many segments/
  );
}

{
  const accountUpdates = Array.from({ length: 31 }, () => createAccountUpdateWithAuth('signed'));
  expect(() => verifyTransactionLimits({ accountUpdates } as TestZkappCommand)).not.toThrow();
}

{
  const accountUpdates = Array.from({ length: 32 }, () => createAccountUpdateWithAuth('signed'));
  expect(() => verifyTransactionLimits({ accountUpdates } as TestZkappCommand)).toThrow(
    /too many segments/
  );
}

{
  const accountUpdates = Array.from({ length: 31 }, () => createAccountUpdateWithAuth('none'));
  expect(() => verifyTransactionLimits({ accountUpdates } as TestZkappCommand)).not.toThrow();
}

{
  const accountUpdates = [
    ...Array.from({ length: 15 }, () => createAccountUpdateWithAuth('signed')),
    ...Array.from({ length: 16 }, () => createAccountUpdateWithAuth('none')),
  ];

  expect(() => verifyTransactionLimits({ accountUpdates } as TestZkappCommand)).not.toThrow();
}

{
  const accountUpdates: AccountUpdate[] = [];
  for (let i = 0; i < 7; i++) {
    accountUpdates.push(createAccountUpdateWithAuth('signed'));
    accountUpdates.push(createAccountUpdateWithAuth('signed'));
    accountUpdates.push(createAccountUpdateWithAuth('proof'));
  }

  accountUpdates.push(createAccountUpdateWithAuth('signed'));
  accountUpdates.push(createAccountUpdateWithAuth('signed'));

  const { segments } = getSegmentsAndEvents(accountUpdates);
  const totalSegments = segments.proof + segments.signedPair + segments.signedSingle;
  expect(totalSegments).toBe(TransactionLimits.MAX_ZKAPP_SEGMENT_PER_TRANSACTION);

  expect(() => verifyTransactionLimits({ accountUpdates } as TestZkappCommand)).not.toThrow();
}

{
  const accountUpdates: AccountUpdate[] = [];
  for (let i = 0; i < 7; i++) {
    accountUpdates.push(createAccountUpdateWithAuth('signed'));
    accountUpdates.push(createAccountUpdateWithAuth('signed'));
    accountUpdates.push(createAccountUpdateWithAuth('proof'));
  }
  accountUpdates.push(createAccountUpdateWithAuth('signed'));
  accountUpdates.push(createAccountUpdateWithAuth('signed'));
  accountUpdates.push(createAccountUpdateWithAuth('proof')); // One more proof

  const { segments } = getSegmentsAndEvents(accountUpdates);
  const totalSegments = segments.proof + segments.signedPair + segments.signedSingle;
  expect(totalSegments).toBe(TransactionLimits.MAX_ZKAPP_SEGMENT_PER_TRANSACTION + 1);

  expect(() => verifyTransactionLimits({ accountUpdates } as TestZkappCommand)).toThrow(
    /too many segments/
  );
}

{
  const accountUpdates: AccountUpdate[] = [createAccountUpdateWithAuth('signed')];
  for (let i = 0; i < 7; i++) {
    accountUpdates.push(createAccountUpdateWithAuth('proof'));
    accountUpdates.push(createAccountUpdateWithAuth('signed'));
  }

  const { segments } = getSegmentsAndEvents(accountUpdates);
  expect(segments).toEqual({
    proof: 7,
    signedPair: 1,
    signedSingle: 7,
  });
  expect(segments.proof + segments.signedPair + segments.signedSingle).toBe(15);

  expect(() => verifyTransactionLimits({ accountUpdates } as TestZkappCommand)).not.toThrow();
}

console.log('All Mesa hardfork transaction limit tests passed!');
