import { log } from 'console';
import assert from 'node:assert';
import { CANARY_VALUE } from 'plonk-napi';

log('asserting canary');
assert(CANARY_VALUE == 1337n, 'canary should be set properly');
log('canary has been asserted');
