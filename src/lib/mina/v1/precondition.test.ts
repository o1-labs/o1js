import {
  UInt64,
  UInt32,
  SmartContract,
  Mina,
  AccountUpdate,
  method,
  PublicKey,
  Bool,
  Field,
} from 'o1js';

class MyContract extends SmartContract {
  @method async shouldMakeCompileThrow() {
    this.network.blockchainLength.get();
  }
}

let contractAccount: Mina.TestPublicKey;
let contract: MyContract;
let feePayer: Mina.TestPublicKey;

beforeAll(async () => {
  // set up local blockchain, create contract account keys, deploy the contract
  let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  [feePayer] = Local.testAccounts;

  contractAccount = Mina.TestPublicKey.random();
  contract = new MyContract(contractAccount);

  let tx = await Mina.transaction(feePayer, async () => {
    AccountUpdate.fundNewAccount(feePayer);
    await contract.deploy();
  });
  tx.sign([feePayer.key, contractAccount.key]).send();
});

describe('preconditions', () => {
  it('get without constraint should throw', async () => {
    for (let precondition of implemented) {
      await expect(
        Mina.transaction(feePayer, async () => {
          precondition().get();
          AccountUpdate.attachToTransaction(contract.self);
        })
      ).rejects.toThrow(/precondition/);
    }
  });

  it('get without constraint should throw during compile', async () => {
    await expect(() => MyContract.compile()).rejects.toThrow('precondition');
  });

  it('get + requireEquals should not throw', async () => {
    let nonce = contract.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      contract.requireSignature();
      for (let precondition of implemented) {
        let p = precondition().get();
        precondition().requireEquals(p as any);
      }
      AccountUpdate.attachToTransaction(contract.self);
    });
    await tx.sign([feePayer.key, contractAccount.key]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(contract.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + requireEquals should throw for unimplemented fields', async () => {
    for (let precondition of unimplemented) {
      await expect(
        Mina.transaction(feePayer, async () => {
          let p = precondition();
          p.requireEquals(p.get() as any);
          AccountUpdate.attachToTransaction(contract.self);
        })
      ).rejects.toThrow(/not implemented/);
    }
  });

  it('get + requireBetween should not throw', async () => {
    let nonce = contract.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      for (let precondition of implementedWithRange) {
        let p: any = precondition().get();
        precondition().requireBetween(p.constructor.zero, p);
      }
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    });
    await tx.sign([feePayer.key, contractAccount.key]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(contract.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('satisfied currentSlot.requireBetween should not throw', async () => {
    let nonce = contract.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      contract.currentSlot.requireBetween(UInt32.from(0), UInt32.from(UInt32.MAXINT()));
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    });
    await tx.sign([feePayer.key, contractAccount.key]).send();
    expect(contract.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + requireNothing should not throw', async () => {
    let nonce = contract.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      for (let precondition of implemented) {
        precondition().get();
        precondition().requireNothing();
      }
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    });
    await tx.sign([feePayer.key, contractAccount.key]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(contract.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + manual precondition should not throw', async () => {
    // we only test this for a couple of preconditions
    let nonce = contract.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      contract.account.balance.get();
      contract.self.body.preconditions.account.balance.isSome = Bool(true);
      contract.self.body.preconditions.account.balance.value.upper = UInt64.from(10e9);

      contract.network.blockchainLength.get();
      contract.self.body.preconditions.network.blockchainLength.isSome = Bool(true);
      contract.self.body.preconditions.network.blockchainLength.value.upper = UInt32.from(1000);

      contract.network.totalCurrency.get();
      contract.self.body.preconditions.network.totalCurrency.isSome = Bool(true);
      contract.self.body.preconditions.network.totalCurrency.value.upper = UInt64.from(1e9 * 1e9);
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    });
    await tx.sign([feePayer.key, contractAccount.key]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(contract.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('unsatisfied requireEquals should be rejected (numbers)', async () => {
    for (let precondition of implementedNumber) {
      await expect(async () => {
        let tx = await Mina.transaction(feePayer, async () => {
          let p = precondition().get();
          precondition().requireEquals(p.add(1) as any);
          AccountUpdate.attachToTransaction(contract.self);
        });
        await tx.sign([feePayer.key]).send();
      }).rejects.toThrow(/unsatisfied/);
    }
  });

  it('unsatisfied requireEquals should be rejected (booleans)', async () => {
    for (let precondition of implementedBool) {
      let tx = await Mina.transaction(feePayer, async () => {
        let p = precondition().get();
        precondition().requireEquals(p.not());
        AccountUpdate.attachToTransaction(contract.self);
      });
      await expect(tx.sign([feePayer.key]).send()).rejects.toThrow(/unsatisfied/);
    }
  });

  it('unsatisfied requireEquals should be rejected (public key)', async () => {
    let publicKey = PublicKey.from({ x: Field(-1), isOdd: Bool(false) });
    let tx = await Mina.transaction(feePayer, async () => {
      contract.account.delegate.requireEquals(publicKey);
      AccountUpdate.attachToTransaction(contract.self);
    });
    await expect(tx.sign([feePayer.key]).send()).rejects.toThrow(/unsatisfied/);
  });

  it('unsatisfied requireBetween should be rejected', async () => {
    for (let precondition of implementedWithRange) {
      let tx = await Mina.transaction(feePayer, async () => {
        let p: any = precondition().get();
        precondition().requireBetween(p.add(20), p.add(30));
        AccountUpdate.attachToTransaction(contract.self);
      });
      await expect(tx.sign([feePayer.key]).send()).rejects.toThrow(/unsatisfied/);
    }
  });

  it('unsatisfied currentSlot.requireBetween should be rejected', async () => {
    let tx = await Mina.transaction(feePayer, async () => {
      contract.currentSlot.requireBetween(UInt32.from(20), UInt32.from(30));
      AccountUpdate.attachToTransaction(contract.self);
    });
    await expect(tx.sign([feePayer.key]).send()).rejects.toThrow(/unsatisfied/);
  });

  it('unsatisfied requireEquals should be overridden by requireNothing', async () => {
    let nonce = contract.account.nonce.get();
    let publicKey = PublicKey.from({ x: Field(-1), isOdd: Bool(false) });

    await Mina.transaction(feePayer, async () => {
      for (let precondition of implementedNumber) {
        let p = precondition().get();
        precondition().requireEquals(p.add(1) as any);
        precondition().requireNothing();
      }
      for (let precondition of implementedBool) {
        let p = precondition().get();
        precondition().requireEquals(p.not());
        precondition().requireNothing();
      }
      contract.account.delegate.requireEquals(publicKey);
      contract.account.delegate.requireNothing();
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    })
      .sign([feePayer.key, contractAccount.key])
      .send();
    // check that tx was applied, by checking nonce was incremented
    expect(contract.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('unsatisfied requireBetween should be overridden by requireNothing', async () => {
    let nonce = contract.account.nonce.get();

    await Mina.transaction(feePayer, async () => {
      for (let precondition of implementedWithRange) {
        let p: any = precondition().get();
        precondition().requireBetween(p.add(20), p.add(30));
        precondition().requireNothing();
      }
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    })
      .sign([feePayer.key, contractAccount.key])
      .send();
    // check that tx was applied, by checking nonce was incremented
    expect(contract.account.nonce.get()).toEqual(nonce.add(1));
  });

  // TODO: is this a gotcha that should be addressed?
  // the test below fails, so it seems that nonce is applied successfully with a WRONG precondition..
  // however, this is just because `zkapp.requireSignature()` overwrites the nonce precondition with one that is satisfied
  it.skip('unsatisfied nonce precondition should be rejected', async () => {
    let tx = await Mina.transaction(feePayer, async () => {
      contract.account.nonce.requireEquals(UInt32.from(1e8));
      contract.requireSignature();
      AccountUpdate.attachToTransaction(contract.self);
    });
    expect(() => tx.sign([contractAccount.key, feePayer.key]).send()).toThrow();
  });
});

let implementedNumber = [
  () => contract.account.balance,
  () => contract.account.nonce,
  () => contract.account.receiptChainHash,
  () => contract.network.blockchainLength,
  () => contract.network.globalSlotSinceGenesis,
  () => contract.network.minWindowDensity,
  () => contract.network.totalCurrency,
  () => contract.network.stakingEpochData.epochLength,
  () => contract.network.stakingEpochData.ledger.totalCurrency,
  () => contract.network.nextEpochData.epochLength,
  () => contract.network.nextEpochData.ledger.totalCurrency,
  () => contract.network.snarkedLedgerHash,
  () => contract.network.stakingEpochData.lockCheckpoint,
  () => contract.network.stakingEpochData.startCheckpoint,
  // () => zkapp.network.stakingEpochData.seed,
  () => contract.network.stakingEpochData.ledger.hash,
  () => contract.network.nextEpochData.lockCheckpoint,
  () => contract.network.nextEpochData.startCheckpoint,
  // () => zkapp.network.nextEpochData.seed,
  () => contract.network.nextEpochData.ledger.hash,
];
let implementedBool = [() => contract.account.isNew, () => contract.account.provedState];
let implemented = [
  ...implementedNumber,
  ...implementedBool,
  () => contract.network.timestamp,
  () => contract.account.delegate,
];
let implementedWithRange = [
  () => contract.account.balance,
  () => contract.account.nonce,
  () => contract.network.blockchainLength,
  () => contract.network.globalSlotSinceGenesis,
  () => contract.network.timestamp,
  () => contract.network.minWindowDensity,
  () => contract.network.totalCurrency,
  () => contract.network.stakingEpochData.epochLength,
  () => contract.network.stakingEpochData.ledger.totalCurrency,
  () => contract.network.nextEpochData.epochLength,
  () => contract.network.nextEpochData.ledger.totalCurrency,
];
let unimplemented = [
  () => contract.network.stakingEpochData.seed,
  () => contract.network.nextEpochData.seed,
];
