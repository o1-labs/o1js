import {
  SmartContract,
  method,
  state,
  PublicKey,
  UInt64,
  Experimental,
  AccountUpdate,
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

function contractClosure() {
  const offchainStateInstance = offchainState.init();

  // example contract that interacts with offchain state
  class ExampleContract extends SmartContract {
    @state(OffchainState.Commitments) offchainStateCommitments =
      offchainState.emptyCommitments();

    offchainState = offchainStateInstance;

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

  offchainStateInstance.setContractClass(ExampleContract);

  return {
    offchainStateInstance,
    ExampleContract,
  };
}

// test code below

// await testLocal(
//   ExampleContract,
//   { proofsEnabled: true, offchainState },
//   ({ accounts: { sender, receiver, other }, contract, Local }) => [
//     // create first account
//     transaction('create account', async () => {
//       contract.offchainState.setContractInstance(contract);

//       // first call (should succeed)
//       await contract.createAccount(sender, UInt64.from(1000));

//       // second call (should fail)
//       await contract.createAccount(sender, UInt64.from(2000));
//     }),

//     // settle
//     async () => {
//       let proof = await contract.offchainState.createSettlementProof();

//       return transaction('settle 1', () => contract.settle(proof));
//     },

//     // check balance and supply
//     expectState(contract.offchainState.fields.totalSupply, 1000n),
//     expectState(contract.offchainState.fields.accounts, [sender, 1000n]),
//     expectState(contract.offchainState.fields.accounts, [receiver, undefined]),

//     // transfer (should succeed)
//     transaction('transfer', () =>
//       contract.transfer(sender, receiver, UInt64.from(100))
//     ),

//     // we run some calls without proofs to save time
//     () => Local.setProofsEnabled(false),

//     // more transfers that should fail
//     transaction('more transfers', async () => {
//       // (these are enough to need two proof steps during settlement)
//       await contract.transfer(sender, receiver, UInt64.from(200));
//       await contract.transfer(sender, receiver, UInt64.from(300));
//       await contract.transfer(sender, receiver, UInt64.from(400));

//       // create another account (should succeed)
//       await contract.createAccount(other, UInt64.from(555));

//       // create existing account again (should fail)
//       await contract.createAccount(receiver, UInt64.from(333));
//     }),

//     // settle
//     async () => {
//       Local.resetProofsEnabled();
//       let proof = await contract.offchainState.createSettlementProof();

//       return transaction('settle 2', () => contract.settle(proof));
//     },

//     // check balance and supply
//     expectState(contract.offchainState.fields.totalSupply, 1555n),
//     expectState(contract.offchainState.fields.accounts, [sender, 900n]),
//     expectState(contract.offchainState.fields.accounts, [receiver, 100n]),
//   ]
// );

// Test with multiple instances of the conract and offchain state deployed on the same network

const {
  offchainStateInstance: offchainStateInstanceA,
  ExampleContract: ExampleContractA,
} = contractClosure();

const {
  offchainStateInstance: offchainStateInstanceB,
  ExampleContract: ExampleContractB,
} = contractClosure();

const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

const [sender, receiver, other, contractAccountA, contractAccountB] =
  Local.testAccounts;

const contractA = new ExampleContractA(contractAccountA);
const contractB = new ExampleContractB(contractAccountB);

console.time('compile offchain state program');
await offchainState.compile();
console.timeEnd('compile offchain state program');

console.time('compile contract');
await ExampleContractA.compile();
await ExampleContractB.compile();
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

contractA.offchainState = offchainStateInstanceA;
contractB.offchainState = offchainStateInstanceB;
offchainStateInstanceA.setContractInstance(contractA);
offchainStateInstanceB.setContractInstance(contractB);

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
const proofA = await contractA.offchainState.createSettlementProof();
const proofB = await contractB.offchainState.createSettlementProof();
const settleTx = Mina.transaction(sender, async () => {
  await contractA.settle(proofA);
  await contractB.settle(proofB);
});
await settleTx.sign([sender.key]);
await settleTx.prove();
await settleTx.send().wait();
console.timeEnd('settle');

console.log('Initial supply:');
console.log((await contractA.getSupply()).toBigInt());
console.log((await contractB.getSupply()).toBigInt());
assert((await contractA.getSupply()).toBigInt() == 1000n);
assert((await contractB.getSupply()).toBigInt() == 1500n);

console.log('Initial balances:');
console.log(
  (await contractA.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  (await contractB.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
assert((await contractA.getBalance(sender)).toBigInt() == 1000n);
assert((await contractB.getBalance(sender)).toBigInt() == 1500n);

console.log('Offchain state roots:');
console.log(
  (await contractA.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  (await contractB.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  (await offchainStateInstanceA.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  (await offchainStateInstanceB.fields.accounts.get(sender)).value.toBigInt()
);

console.time('transfer');
const transferTx = Mina.transaction(sender, async () => {
  await contractA.transfer(sender, receiver, UInt64.from(100));
  await contractB.transfer(sender, receiver, UInt64.from(200));
});
await transferTx.sign([sender.key]);
await transferTx.prove();
await transferTx.send().wait();
console.timeEnd('transfer');

console.time('settle');
const proofA2 = await contractA.offchainState.createSettlementProof();
const proofB2 = await contractB.offchainState.createSettlementProof();
const settleTx2 = Mina.transaction(sender, async () => {
  await contractA.settle(proofA2);
  await contractB.settle(proofB2);
});
await settleTx2.sign([sender.key]);
await settleTx2.prove();
await settleTx2.send().wait();
console.timeEnd('settle');

console.log('Final supply:');
console.log((await contractA.getSupply()).toBigInt());
console.log((await contractB.getSupply()).toBigInt());
assert((await contractA.getSupply()).toBigInt() == 1000n);
assert((await contractB.getSupply()).toBigInt() == 1500n);

console.log('Final balances:');
console.log(await contractA.offchainState.fields.accounts.get(sender));
console.log(await contractB.offchainState.fields.accounts.get(sender));
console.log(await contractA.offchainState.fields.accounts.get(receiver));
console.log(await contractB.offchainState.fields.accounts.get(receiver));
assert((await contractA.getBalance(sender)).toBigInt() == 900n);
assert((await contractB.getBalance(sender)).toBigInt() == 1300n);
assert((await contractA.getBalance(receiver)).toBigInt() == 100n);
assert((await contractB.getBalance(receiver)).toBigInt() == 200n);
