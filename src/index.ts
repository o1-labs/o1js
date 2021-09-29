export * from './snarky';
export * from './signature';
export * from './circuit_value';
export * from './merkle_proof';

import { shutdown } from './snarky';
import { test } from './debug/exchange';

test();

if (typeof window === 'undefined') {
  shutdown();
}
