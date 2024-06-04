import {
  SmartContract,
  method,
  Mina,
  state,
  PublicKey,
  UInt64,
  Experimental,
} from '../../../index.js';
import assert from 'assert';

const proofsEnabled = true;

const { OffchainState } = Experimental;

const offchainState = OffchainState(
  {
    accounts: OffchainState.Map(PublicKey, UInt64),
    totalSupply: OffchainState.Field(UInt64),
  },
  { logTotalCapacity: 10, maxActionsPerProof: 5 }
);

class StateProof extends offchainState.Proof {}

// example contract that interacts with offchain state

class ExampleContract extends SmartContract {
  @state(OffchainState.Commitments) offchainState = offchainState.commitments();

  @method
  async createAccount(address: PublicKey, amountToMint: UInt64) {
    // setting `from` to `undefined` means that the account must not exist yet
    offchainState.fields.accounts.update(address, {
      from: undefined,
      to: amountToMint,
    });

    // TODO using `update()` on the total supply means that this method
    // can only be called once every settling cycle
    let totalSupplyOption = await offchainState.fields.totalSupply.get();
    let totalSupply = totalSupplyOption.orElse(0n);

    offchainState.fields.totalSupply.update({
      from: totalSupplyOption,
      to: totalSupply.add(amountToMint),
    });
  }

  @method
  async transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    let fromOption = await offchainState.fields.accounts.get(from);
    let fromBalance = fromOption.assertSome('sender account exists');

    let toOption = await offchainState.fields.accounts.get(to);
    let toBalance = toOption.orElse(0n);

    /**
     * Update both accounts atomically.
     *
     * This is safe, because both updates will only be accepted if both previous balances are still correct.
     */
    offchainState.fields.accounts.update(from, {
      from: fromOption,
      to: fromBalance.sub(amount),
    });
    offchainState.fields.accounts.update(to, {
      from: toOption,
      to: toBalance.add(amount),
    });
  }

  @method.returns(UInt64)
  async getSupply() {
    return (await offchainState.fields.totalSupply.get()).orElse(0n);
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

const Local = await Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

let [sender, receiver, contractAccount, other] = Local.testAccounts;
let contract = new ExampleContract(contractAccount);
offchainState.setContractInstance(contract);

if (proofsEnabled) {
  console.time('compile program');
  await offchainState.compile();
  console.timeEnd('compile program');
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
  // first call (should succeed)
  await contract.createAccount(sender, UInt64.from(1000));

  // second call (should fail)
  await contract.createAccount(sender, UInt64.from(2000));
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
await check({ expectedSupply: 1000n, expectedSenderBalance: 1000n });

// transfer (should succeed)

console.time('transfer');
await Mina.transaction(sender, async () => {
  await contract.transfer(sender, receiver, UInt64.from(100));
})
  .sign([sender.key])
  .prove()
  .send();
console.timeEnd('transfer');

console.time('more transfers');
Local.setProofsEnabled(false); // we run these without proofs to save time

await Mina.transaction(sender, async () => {
  // more transfers that should fail
  // (these are enough to need two proof steps during settlement)
  await contract.transfer(sender, receiver, UInt64.from(200));
  await contract.transfer(sender, receiver, UInt64.from(300));
  await contract.transfer(sender, receiver, UInt64.from(400));

  // create another account (should succeed)
  await contract.createAccount(other, UInt64.from(555));

  // create existing account again (should fail)
  await contract.createAccount(receiver, UInt64.from(333));
})
  .sign([sender.key])
  .prove()
  .send();
console.timeEnd('more transfers');

// settle
Local.setProofsEnabled(proofsEnabled);

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
await check({ expectedSupply: 1555n, expectedSenderBalance: 900n });

// test helper

async function check({
  expectedSupply,
  expectedSenderBalance,
}: {
  expectedSupply: bigint;
  expectedSenderBalance: bigint;
}) {
  let supply = (await contract.getSupply()).toBigInt();
  assert.strictEqual(supply, expectedSupply);

  let balanceSender = (await contract.getBalance(sender)).toBigInt();
  let balanceReceiver = (await contract.getBalance(receiver)).toBigInt();
  let balanceOther = (await contract.getBalance(other)).toBigInt();

  console.log('balance (sender)', balanceSender);
  console.log('balance (recv)', balanceReceiver);
  assert.strictEqual(balanceSender + balanceReceiver + balanceOther, supply);
  assert.strictEqual(balanceSender, expectedSenderBalance);
}
