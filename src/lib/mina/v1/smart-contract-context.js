import { Context } from '../../util/global-context.js';
import { currentTransaction } from './transaction-context.js';
import { assert } from '../../util/assert.js';
export { smartContractContext, accountUpdateLayout, contract };
let smartContractContext = Context.create({
    default: null,
});
function accountUpdateLayout() {
    // in a smart contract, return the layout currently created in the contract call
    let layout = smartContractContext.get()?.selfLayout;
    // if not in a smart contract but in a transaction, return the layout of the transaction
    layout ?? (layout = currentTransaction()?.layout);
    return layout;
}
function contract(expectedConstructor) {
    let ctx = smartContractContext.get();
    assert(ctx !== null, 'This method must be called within a contract method');
    if (expectedConstructor !== undefined) {
        assert(ctx.this.constructor === expectedConstructor, `This method must be called on a ${expectedConstructor.name} contract`);
    }
    return ctx.this;
}
