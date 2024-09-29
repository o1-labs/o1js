import type { SmartContract } from './zkapp.js';
import type { AccountUpdate, AccountUpdateLayout } from './account-update.js';
import { Context } from '../util/global-context.js';
import { currentTransaction } from './transaction-context.js';
import { assert } from '../util/assert.js';

export {
  smartContractContext,
  SmartContractContext,
  accountUpdateLayout,
  contract,
};

type SmartContractContext = {
  this: SmartContract;
  selfUpdate: AccountUpdate;
  selfLayout: AccountUpdateLayout;
};
let smartContractContext = Context.create<null | SmartContractContext>({
  default: null,
});

function accountUpdateLayout() {
  // in a smart contract, return the layout currently created in the contract call
  let layout = smartContractContext.get()?.selfLayout;

  // if not in a smart contract but in a transaction, return the layout of the transaction
  layout ??= currentTransaction()?.layout;

  return layout;
}

function contract<S extends SmartContract>(
  expectedConstructor?: new (...args: any) => S
): S {
  let ctx = smartContractContext.get();
  assert(ctx !== null, 'This method must be called within a contract method');
  if (expectedConstructor !== undefined) {
    assert(
      ctx.this.constructor === expectedConstructor,
      `This method must be called on a ${expectedConstructor.name} contract`
    );
  }
  return ctx.this as S;
}
