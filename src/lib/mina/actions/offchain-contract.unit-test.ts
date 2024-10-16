import {
  SmartContract,
  method,
  state,
  PublicKey,
  UInt64,
  Experimental,
} from '../../../index.js';
import * as Mina from '../mina.js';
import { expectState, testLocal, transaction } from '../test/test-contract.js';
import assert from 'assert';

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
  @state(OffchainState.Commitments) offchainStateCommitments =
    offchainState.emptyCommitments();

  // o1js memoizes the offchain state by contract address so that this pattern works
  offchainState = offchainState.init(this);

  @method
  async createAccount(address: PublicKey, amountToMint: UInt64) {
    // setting `from` to `undefined` means that the account must not exist yet
    this.offchainState.fields.accounts.update(address, {
      from: undefined,
      to: amountToMint,
    });

    // TODO using `update()` on the total supply means that this method
    // can only be called once every settling cycle
    let totalSupplyOption = await this.offchainState.fields.totalSupply.get();
    let totalSupply = totalSupplyOption.orElse(0n);

    this.offchainState.fields.totalSupply.update({
      from: totalSupplyOption,
      to: totalSupply.add(amountToMint),
    });
  }

  @method
  async transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    let fromOption = await this.offchainState.fields.accounts.get(from);
    let fromBalance = fromOption.assertSome('sender account exists');

    let toOption = await this.offchainState.fields.accounts.get(to);
    let toBalance = toOption.orElse(0n);

    /**
     * Update both accounts atomically.
     *
     * This is safe, because both updates will only be accepted if both previous balances are still correct.
     */
    this.offchainState.fields.accounts.update(from, {
      from: fromOption,
      to: fromBalance.sub(amount),
    });

    this.offchainState.fields.accounts.update(to, {
      from: toOption,
      to: toBalance.add(amount),
    });
  }

  @method.returns(UInt64)
  async getSupply() {
    return (await this.offchainState.fields.totalSupply.get()).orElse(0n);
  }

  @method.returns(UInt64)
  async getBalance(address: PublicKey) {
    return (await this.offchainState.fields.accounts.get(address)).orElse(0n);
  }

  @method
  async settle(proof: StateProof) {
    await this.offchainState.settle(proof);
  }
}

// test code below

await testLocal(
  ExampleContract,
  { proofsEnabled: true, offchainState },
  ({ accounts: { sender, receiver, other }, contract, Local }) => [
    // create first account
    transaction('create account', async () => {
      // Make sure the contract instance is set on the offchain state
      contract.offchainState.setContractInstance(contract);

      // first call (should succeed)
      await contract.createAccount(sender, UInt64.from(1000));

      // second call (should fail)
      await contract.createAccount(sender, UInt64.from(2000));
    }),

    // settle
    async () => {
      let proof = await contract.offchainState.createSettlementProof();

      return transaction('settle 1', () => contract.settle(proof));
    },

    // check balance and supply
    expectState(contract.offchainState.fields.totalSupply, 1000n),
    expectState(contract.offchainState.fields.accounts, [sender, 1000n]),
    expectState(contract.offchainState.fields.accounts, [receiver, undefined]),

    // transfer (should succeed)
    transaction('transfer', () =>
      contract.transfer(sender, receiver, UInt64.from(100))
    ),

    // we run some calls without proofs to save time
    () => Local.setProofsEnabled(false),

    // more transfers that should fail
    transaction('more transfers', async () => {
      // (these are enough to need two proof steps during settlement)
      await contract.transfer(sender, receiver, UInt64.from(200));
      await contract.transfer(sender, receiver, UInt64.from(300));
      await contract.transfer(sender, receiver, UInt64.from(400));

      // create another account (should succeed)
      await contract.createAccount(other, UInt64.from(555));

      // create existing account again (should fail)
      await contract.createAccount(receiver, UInt64.from(333));
    }),

    // settle
    async () => {
      Local.resetProofsEnabled();
      let proof = await contract.offchainState.createSettlementProof();

      return transaction('settle 2', () => contract.settle(proof));
    },

    // check balance and supply
    expectState(contract.offchainState.fields.totalSupply, 1555n),
    expectState(contract.offchainState.fields.accounts, [sender, 900n]),
    expectState(contract.offchainState.fields.accounts, [receiver, 100n]),
  ]
);

// Test with multiple instances of the conract and offchain state deployed on the same network

const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

const [sender, receiver, contractAccountA, contractAccountB] =
  Local.testAccounts;

const contractA = new ExampleContract(contractAccountA);
const contractB = new ExampleContract(contractAccountB);
contractA.offchainState.setContractInstance(contractA);
contractB.offchainState.setContractInstance(contractB);

console.time('compile offchain state program');
await offchainState.compile();
console.timeEnd('compile offchain state program');

console.time('compile contract');
await ExampleContract.compile();
console.timeEnd('compile contract');

console.time('deploy contract');
const deployTx = Mina.transaction(sender, async () => {
  await contractA.deploy();
  await contractB.deploy();
});
await deployTx.sign([sender.key, contractAccountA.key, contractAccountB.key]);
await deployTx.prove();
await deployTx.send().wait();
console.timeEnd('deploy contract');

console.time('create accounts');
const accountCreationTx = Mina.transaction(sender, async () => {
  await contractA.createAccount(sender, UInt64.from(1000));
  await contractB.createAccount(sender, UInt64.from(1500));
});
await accountCreationTx.sign([sender.key]);
await accountCreationTx.prove();
await accountCreationTx.send().wait();
console.timeEnd('create accounts');

console.time('settle');
await settle(contractA, sender);
await settle(contractB, sender);
console.timeEnd('settle');

console.log('Initial supply:');
console.log(
  'Contract A total Supply: ',
  (await contractA.getSupply()).toBigInt()
);
console.log(
  'Contract B total Supply: ',
  (await contractB.getSupply()).toBigInt()
);
assert((await contractA.getSupply()).toBigInt() == 1000n);
assert((await contractB.getSupply()).toBigInt() == 1500n);

console.log('Initial balances:');
console.log(
  'Contract A, Sender: ',
  (await contractA.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract B, Sender: ',
  (await contractB.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
assert((await contractA.getBalance(sender)).toBigInt() == 1000n);
assert((await contractB.getBalance(sender)).toBigInt() == 1500n);

console.time('transfer');
await transfer(contractA, sender, receiver, UInt64.from(100));
await transfer(contractB, sender, receiver, UInt64.from(200));
console.timeEnd('transfer');

console.time('settle');
await settle(contractA, sender);
await settle(contractB, sender);
console.timeEnd('settle');

console.log('After Settlement balances:');
console.log(
  'Contract A, Sender: ',
  (await contractA.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract A, Receiver: ',
  (await contractA.offchainState.fields.accounts.get(receiver)).value.toBigInt()
);

console.log(
  'Contract B, Sender: ',
  (await contractB.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract B, Receiver: ',
  (await contractB.offchainState.fields.accounts.get(receiver)).value.toBigInt()
);
assert((await contractA.getBalance(sender)).toBigInt() == 900n);
assert((await contractA.getBalance(receiver)).toBigInt() == 100n);

assert((await contractB.getBalance(sender)).toBigInt() == 1300n);
assert((await contractB.getBalance(receiver)).toBigInt() == 200n);

console.time('advance contract A state but leave B unsettled');
await transfer(contractA, sender, receiver, UInt64.from(150));
await settle(contractA, sender);

await transfer(contractA, receiver, sender, UInt64.from(50));
await settle(contractA, sender);

await transfer(contractB, sender, receiver, UInt64.from(5));
console.timeEnd('advance contract A state but leave B unsettled');

console.log('Final supply:');
console.log(
  'Contract A total Supply: ',
  (await contractA.getSupply()).toBigInt()
);
console.log(
  'Contract B total Supply: ',
  (await contractB.getSupply()).toBigInt()
);
assert((await contractA.getSupply()).toBigInt() == 1000n);
assert((await contractB.getSupply()).toBigInt() == 1500n);

console.log('Final balances:');
console.log(
  'Contract A, Sender: ',
  (await contractA.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract A, Receiver: ',
  (await contractA.offchainState.fields.accounts.get(receiver)).value.toBigInt()
);

console.log(
  'Contract B, Sender: ',
  (await contractB.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract B, Receiver: ',
  (await contractB.offchainState.fields.accounts.get(receiver)).value.toBigInt()
);

assert((await contractA.getBalance(sender)).toBigInt() == 800n);
assert((await contractA.getBalance(receiver)).toBigInt() == 200n);

// The 5 token transfer has not been settled
assert((await contractB.getBalance(sender)).toBigInt() == 1300n);
assert((await contractB.getBalance(receiver)).toBigInt() == 200n);

async function transfer(
  contract: ExampleContract,
  sender: Mina.TestPublicKey,
  receiver: PublicKey,
  amount: UInt64
) {
  const tx = Mina.transaction(sender, async () => {
    await contract.transfer(sender, receiver, amount);
  });
  tx.sign([sender.key]);
  await tx.prove().send().wait();
}

async function settle(contract: ExampleContract, sender: Mina.TestPublicKey) {
  const proof = await contract.offchainState.createSettlementProof();
  const tx = Mina.transaction(sender, async () => {
    await contract.settle(proof);
  });
  tx.sign([sender.key]);
  await tx.prove().send().wait();
}
