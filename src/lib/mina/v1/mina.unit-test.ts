import { filterGroups } from './mina.js';
import { expect } from 'expect';

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
