import type { SmartContract } from '../zkapp.js';
import type {
  AccountUpdate,
  UnfinishedForest,
  AccountUpdateLayout,
} from '../account_update.js';
import { Context } from '../global-context.js';

export { smartContractContext, SmartContractContext };

type SmartContractContext = {
  this: SmartContract;
  selfUpdate: AccountUpdate;
  selfLayout: AccountUpdateLayout;
  selfCalls: UnfinishedForest;
};
let smartContractContext = Context.create<null | SmartContractContext>({
  default: null,
});
