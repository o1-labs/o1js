import { MinaProgram, MinaProgramEnv } from './dsl/mina-program.js';
import { GenericData } from './mina/account-update.js';
import { Account } from './mina/account.js';
import { AccountId, TokenId } from './mina/core.js';
import { State, StateDefinition } from './mina/state.js';
import { Field } from '../provable/field.js';
import { PrivateKey } from '../provable/crypto/signature.js';

type TestState = {
  x: typeof Field
};
const TestState: StateDefinition<TestState> = State({
  x: Field
});

const TestProgram = MinaProgram({
  name: 'TestProgram',
  State: TestState,
  Event: GenericData,
  Action: GenericData,

  methods: {
    test: {
      privateInputs: [Field],

      async method(_env: MinaProgramEnv<TestState>, value: Field) {
        return {
          setState: {
            x: value
          }
        }
      }
    }
  }
});

await TestProgram.compile();

const accountAddress = PrivateKey.random().toPublicKey();
const account = new Account(
  new AccountId(accountAddress, TokenId.MINA),
  new Field(0)
);
const proof = await TestProgram.test(account, new Field(42));
console.log(JSON.stringify(proof));
