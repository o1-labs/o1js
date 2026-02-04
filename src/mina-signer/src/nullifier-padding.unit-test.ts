import { expect } from 'expect';
import { createNullifier } from './nullifier.js';

async function testNullifierPaddingDifference() {
  const sk = 5n;

  const messageShort = [1n];
  const messagePadded = [1n, 0n];

  const nullifierShort = createNullifier(messageShort, sk);
  const nullifierPadded = createNullifier(messagePadded, sk);

  // The nullifier should change when padding changes the message
  expect(nullifierShort.public.nullifier).not.toEqual(nullifierPadded.public.nullifier);
  expect(nullifierShort.public.s).not.toEqual(nullifierPadded.public.s);
}

await testNullifierPaddingDifference();
