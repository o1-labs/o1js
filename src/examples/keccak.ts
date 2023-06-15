import { Field, Provable, SHA } from 'snarkyjs';

Provable.runAndCheck(() => {
  let hex = SHA.hexToFields('30');

  let res = SHA.keccak(hex);
  Provable.log(res);

  let expected = SHA.hexToFields(
    'f9e2eaaa42d9fe9e558a9b8ef1bf366f190aacaa83bad2641ee106e9041096e4'
  );
  Provable.log(expected);
});
