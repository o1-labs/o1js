import { OffchainState, OffchainStateCommitments } from './offchain-state.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { UInt64 } from '../../provable/int.js';
import { SmartContract, method } from '../zkapp.js';
import { Mina, State, state } from '../../../index.js';

const offchainState = OffchainState({
  accounts: OffchainState.Map(PublicKey, UInt64),
  totalSupply: OffchainState.Field(UInt64),
});

class StateProof extends offchainState.Proof {}

// example contract that interacts with offchain state

class ExampleContract extends SmartContract {
  // TODO could have sugar for this like
  // @OffchainState.commitment offchainState = OffchainState.Commitment();
  @state(OffchainStateCommitments) offchainState = State(
    OffchainStateCommitments.empty()
  );

  @method
  async createAccount(address: PublicKey, amountToMint: UInt64) {
    offchainState.fields.accounts.set(address, amountToMint);

    // TODO `totalSupply` easily gets into a wrong state here on concurrent calls.
    // and using `.update()` doesn't help either
    let totalSupply = await offchainState.fields.totalSupply.get();
    offchainState.fields.totalSupply.set(totalSupply.add(amountToMint));
  }

  @method
  async transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    let fromOption = await offchainState.fields.accounts.get(from);
    let fromBalance = fromOption.assertSome('sender account exists');

    let toOption = await offchainState.fields.accounts.get(to);
    let toBalance = toOption.orElse(0n);

    // TODO we use `update` here so that previous balances can't be overridden
    // but this still includes a trivial double-spend opportunity, because the updates are not rejected atomically:
    // if the `to` update gets accepted but the `from` update fails, it's a double-spend
    offchainState.fields.accounts.set(from, fromBalance.sub(amount));
    // state.fields.accounts.update(from, {
    //   from: fromBalance,
    //   to: fromBalance.sub(amount),
    // });
    offchainState.fields.accounts.set(to, toBalance.add(amount));
    // state.fields.accounts.update(to, {
    //   from: toBalance,
    //   to: toBalance.add(amount),
    // });
  }

  @method.returns(UInt64)
  async getSupply() {
    return await offchainState.fields.totalSupply.get();
  }

  @method.returns(UInt64)
  async getBalance(address: PublicKey) {
    return (await offchainState.fields.accounts.get(address)).orElse(0n);
  }

  @method
  async settle(proof: StateProof) {
    await offchainState.settle(proof);
  }
}

// test code below

// setup
const proofsEnabled = false;

const Local = await Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

let [sender, receiver, contractAccount] = Local.testAccounts;
let contract = new ExampleContract(contractAccount);
offchainState.setContractInstance(contract);

if (proofsEnabled) {
  console.time('compile');
  await offchainState.compile();
  console.timeEnd('compile');
  console.time('compile contract');
  await ExampleContract.compile();
  console.timeEnd('compile contract');
}

// deploy and create first account

console.time('deploy');
await Mina.transaction(sender, async () => {
  await contract.deploy();
})
  .sign([sender.key, contractAccount.key])
  .prove()
  .send();
console.timeEnd('deploy');

// create first account

console.time('create account');
await Mina.transaction(sender, async () => {
  await contract.createAccount(sender, UInt64.from(1000));
})
  .sign([sender.key])
  .prove()
  .send();
console.timeEnd('create account');

// settle

console.time('settlement proof 1');
let proof = await offchainState.createSettlementProof();
console.timeEnd('settlement proof 1');

console.time('settle 1');
await Mina.transaction(sender, () => contract.settle(proof))
  .sign([sender.key])
  .prove()
  .send();
console.timeEnd('settle 1');

// check balance and supply
let supply = await contract.getSupply();

console.log('balance (sender)', (await contract.getBalance(sender)).toString());
console.log('balance (recv)', (await contract.getBalance(receiver)).toString());
console.log('supply', supply.toString());

// transfer

console.time('transfer');
await Mina.transaction(sender, () =>
  contract.transfer(sender, receiver, UInt64.from(100))
)
  .sign([sender.key])
  .prove()
  .send();
console.timeEnd('transfer');

// settle

console.time('settlement proof 2');
proof = await offchainState.createSettlementProof();
console.timeEnd('settlement proof 2');

console.time('settle 2');
await Mina.transaction(sender, () => contract.settle(proof))
  .sign([sender.key])
  .prove()
  .send();
console.timeEnd('settle 2');

// check balance and supply
let balance2 = await contract.getBalance(receiver);
let supply2 = await contract.getSupply();

console.log('balance', balance2.toString());
console.log('supply', supply2.toString());