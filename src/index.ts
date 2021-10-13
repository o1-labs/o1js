export * from './snarky';
export * from './lib/signature';
export * from './lib/circuit_value';
export * from './lib/merkle_proof';

import { shutdown } from './snarky';
if (typeof window === 'undefined') {
  shutdown();
}
