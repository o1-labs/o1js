import { expect } from 'expect';
import { filterGroups } from './mina.js';

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
