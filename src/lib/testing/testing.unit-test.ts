import { expect } from 'expect';
import {
  AccountUpdate,
  UInt32,
  UInt64,
} from '../../provable/gen/transaction-bigint.js';
import { test, Random } from './property.js';

// some trivial roundtrip tests
test(Random.accountUpdate, (accountUpdate, assert) => {
  let json = AccountUpdate.toJSON(accountUpdate);
  let jsonString = JSON.stringify(json);
  assert(
    jsonString ===
      JSON.stringify(AccountUpdate.toJSON(AccountUpdate.fromJSON(json)))
  );
  let fields = AccountUpdate.toFields(accountUpdate);
  let auxiliary = AccountUpdate.toAuxiliary(accountUpdate);
  let recovered = AccountUpdate.fromFields(fields, auxiliary);
  assert(jsonString === JSON.stringify(AccountUpdate.toJSON(recovered)));
});

// check that test fails for a property that does not hold in general
expect(() => {
  test(Random.nat(100), Random.nat(100), (x, y, assert) => {
    assert(x !== y, 'two different numbers can never be the same');
  });
}).toThrow('two different numbers');

// check that invalid JSON cannot be parsed
// note: test.negative asserts that _every_ sample fails
test.negative(Random.json.uint64.invalid, UInt64.fromJSON);
test.negative(Random.json.uint32.invalid, UInt32.fromJSON);
