import { OffchainState } from './offchain-state.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { UInt64 } from '../../provable/int.js';
import { SmartContract, method } from '../zkapp.js';
import { AccountUpdate, Mina } from '../../../index.js';

const state = OffchainState({
  accounts: OffchainState.Map(PublicKey, UInt64),
  totalSupply: OffchainState.Field(UInt64),
});

class StateProof extends state.Proof {}

// example contract that interacts with offchain state

class ExampleContract extends SmartContract {
  @method
  async createAccount(address: PublicKey, amountToMint: UInt64) {
    state.fields.accounts.set(address, amountToMint);

    // TODO `totalSupply` easily gets into a wrong state here on concurrent calls.
    // and using `.update()` doesn't help either
    let totalSupply = await state.fields.totalSupply.get();
    state.fields.totalSupply.set(totalSupply.add(amountToMint));
  }

  @method
  async transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    let fromOption = await state.fields.accounts.get(from);
    let fromBalance = fromOption.assertSome('sender account exists');

    let toOption = await state.fields.accounts.get(to);
    let toBalance = toOption.orElse(0n);

    // TODO we use `update` here so that previous balances can't be overridden
    // but this still includes a trivial double-spend opportunity, because the updates are not rejected atomically:
    // if the `to` update gets accepted but the `from` update fails, it's a double-spend
    state.fields.accounts.set(from, fromBalance.sub(amount));
    // state.fields.accounts.update(from, {
    //   from: fromBalance,
    //   to: fromBalance.sub(amount),
    // });
    state.fields.accounts.set(to, toBalance.add(amount));
    // state.fields.accounts.update(to, {
    //   from: toBalance,
    //   to: toBalance.add(amount),
    // });
  }

  @method.returns(UInt64)
  async getSupply() {
    return await state.fields.totalSupply.get();
  }

  @method.returns(UInt64)
  async getBalance(address: PublicKey) {
    return (await state.fields.accounts.get(address)).orElse(0n);
  }

  @method
  async settle(proof: StateProof) {
    await state.settle(proof);
  }
}
state.setContractClass(ExampleContract);

// test code below

// setup

const Local = await Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [sender, receiver, contractAccount] = Local.testAccounts;
let contract = new ExampleContract(contractAccount);
state.setContractInstance(contract);

await state.compile();
await ExampleContract.compile();

// deploy and create first account

await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender);
  await contract.deploy();
  await contract.createAccount(sender, UInt64.from(1000));
})
  .sign([sender.key, contractAccount.key])
  .prove()
  .send();

// settle

let proof = await state.createSettlementProof();

await Mina.transaction(sender, () => contract.settle(proof))
  .sign([sender.key])
  .prove()
  .send();

// check balance and supply
let balance = await contract.getBalance(receiver);
let supply = await contract.getSupply();

console.log('balance', balance.toString());
console.log('supply', supply.toString());

// transfer

await Mina.transaction(sender, () =>
  contract.transfer(sender, receiver, UInt64.from(100))
)
  .sign([sender.key])
  .prove()
  .send();

// settle

proof = await state.createSettlementProof();

await Mina.transaction(sender, () => contract.settle(proof))
  .sign([sender.key])
  .prove()
  .send();

// check balance and supply
let balance2 = await contract.getBalance(receiver);
let supply2 = await contract.getSupply();

console.log('balance', balance2.toString());
console.log('supply', supply2.toString());
