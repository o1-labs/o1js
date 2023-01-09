import {
  SelfProof,
  Field,
  Experimental,
  verify,
  isReady,
  Circuit,
} from 'snarkyjs';

await isReady;
Circuit.runAndCheck(() => {
  Field(3).greaterThanOrEqual(3);
});
