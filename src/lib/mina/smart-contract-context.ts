import type { SmartContract } from './zkapp.js';
import type { AccountUpdate, AccountUpdateLayout } from './account-update.js';
import { Context } from '../util/global-context.js';
import { currentTransaction } from './transaction-context.js';

export { smartContractContext, SmartContractContext, accountUpdateLayout };

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
