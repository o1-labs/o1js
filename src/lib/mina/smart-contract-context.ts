import type { SmartContract } from '../zkapp.js';
import type {
  AccountUpdate,
  UnfinishedForest,
  UnfinishedTree,
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

const SmartContractContext = {
  enter(self: SmartContract, selfUpdate: AccountUpdate) {
    let context: SmartContractContext = {
      this: self,
      selfUpdate,
      selfLayout: new AccountUpdateLayout(),
      selfCalls: { useHash: false, value: [] },
    };
    let id = smartContractContext.enter(context);
    return { id, context };
  },
  leave(id: number) {
    smartContractContext.leave(id);
  },
  stepOutside() {
    return smartContractContext.enter(null);
  },
  get() {
    return smartContractContext.get();
  },
};

class AccountUpdateLayout {
  map: Map<bigint, UnfinishedTree>;

  constructor() {
    this.map = new Map();
  }
}
