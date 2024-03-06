import {
  shutdown,
  isReady,
  UInt64,
  UInt32,
  SmartContract,
  Mina,
  PrivateKey,
  AccountUpdate,
  method,
  PublicKey,
  Bool,
  Field,
} from 'o1js';

class MyContract extends SmartContract {
  @method shouldMakeCompileThrow() {
    this.network.blockchainLength.get();
  }
}

let zkappKey: PrivateKey;
let zkappAddress: PublicKey;
let zkapp: MyContract;
let feePayer: PublicKey;
let feePayerKey: PrivateKey;

beforeAll(async () => {
  // set up local blockchain, create zkapp keys, deploy the contract
  await isReady;
  let Local = Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  feePayerKey = Local.testAccounts[0].privateKey;
  feePayer = Local.testAccounts[0].publicKey;

  zkappKey = PrivateKey.random();
  zkappAddress = zkappKey.toPublicKey();
  zkapp = new MyContract(zkappAddress);

  let tx = await Mina.transaction(feePayer, async () => {
    AccountUpdate.fundNewAccount(feePayer);
    zkapp.deploy();
  });
  tx.sign([feePayerKey, zkappKey]).send();
});
afterAll(() => setTimeout(shutdown, 0));

describe('preconditions', () => {
  it('get without constraint should throw', async () => {
    for (let precondition of implemented) {
      await expect(
        Mina.transaction(feePayer, async () => {
          precondition().get();
          AccountUpdate.attachToTransaction(zkapp.self);
        })
      ).rejects.toThrow(/precondition/);
    }
  });

  it('get without constraint should throw during compile', async () => {
    await expect(() => MyContract.compile()).rejects.toThrow('precondition');
  });

  it('get + assertEquals should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.requireSignature();
      for (let precondition of implemented) {
        let p = precondition().get();
        precondition().assertEquals(p as any);
      }
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await tx.sign([feePayerKey, zkappKey]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + requireEquals should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.requireSignature();
      for (let precondition of implemented) {
        let p = precondition().get();
        precondition().requireEquals(p as any);
      }
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await tx.sign([feePayerKey, zkappKey]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + assertEquals should throw for unimplemented fields', async () => {
    for (let precondition of unimplemented) {
      await expect(
        Mina.transaction(feePayer, async () => {
          let p = precondition();
          p.assertEquals(p.get() as any);
          AccountUpdate.attachToTransaction(zkapp.self);
        })
      ).rejects.toThrow(/not implemented/);
    }
  });

  it('get + requireEquals should throw for unimplemented fields', async () => {
    for (let precondition of unimplemented) {
      await expect(
        Mina.transaction(feePayer, async () => {
          let p = precondition();
          p.requireEquals(p.get() as any);
          AccountUpdate.attachToTransaction(zkapp.self);
        })
      ).rejects.toThrow(/not implemented/);
    }
  });

  it('get + assertBetween should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      for (let precondition of implementedWithRange) {
        let p: any = precondition().get();
        precondition().assertBetween(p.constructor.zero, p);
      }
      zkapp.requireSignature();
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await tx.sign([feePayerKey, zkappKey]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + requireBetween should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      for (let precondition of implementedWithRange) {
        let p: any = precondition().get();
        precondition().requireBetween(p.constructor.zero, p);
      }
      zkapp.requireSignature();
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await tx.sign([feePayerKey, zkappKey]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('satisfied currentSlot.assertBetween should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.currentSlot.assertBetween(
        UInt32.from(0),
        UInt32.from(UInt32.MAXINT())
      );
      zkapp.requireSignature();
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await tx.sign([feePayerKey, zkappKey]).send();
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('satisfied currentSlot.requireBetween should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.currentSlot.requireBetween(
        UInt32.from(0),
        UInt32.from(UInt32.MAXINT())
      );
      zkapp.requireSignature();
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await tx.sign([feePayerKey, zkappKey]).send();
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + assertNothing should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      for (let precondition of implemented) {
        precondition().get();
        precondition().assertNothing();
      }
      zkapp.requireSignature();
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await tx.sign([feePayerKey, zkappKey]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + requireNothing should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      for (let precondition of implemented) {
        precondition().get();
        precondition().requireNothing();
      }
      zkapp.requireSignature();
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await tx.sign([feePayerKey, zkappKey]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + manual precondition should not throw', async () => {
    // we only test this for a couple of preconditions
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.account.balance.get();
      zkapp.self.body.preconditions.account.balance.isSome = Bool(true);
      zkapp.self.body.preconditions.account.balance.value.upper =
        UInt64.from(10e9);

      zkapp.network.blockchainLength.get();
      zkapp.self.body.preconditions.network.blockchainLength.isSome =
        Bool(true);
      zkapp.self.body.preconditions.network.blockchainLength.value.upper =
        UInt32.from(1000);

      zkapp.network.totalCurrency.get();
      zkapp.self.body.preconditions.network.totalCurrency.isSome = Bool(true);
      zkapp.self.body.preconditions.network.totalCurrency.value.upper =
        UInt64.from(1e9 * 1e9);
      zkapp.requireSignature();
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await tx.sign([feePayerKey, zkappKey]).send();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('unsatisfied assertEquals should be rejected (numbers)', async () => {
    for (let precondition of implementedNumber) {
      await expect(async () => {
        let tx = await Mina.transaction(feePayer, async () => {
          let p = precondition().get();
          precondition().assertEquals(p.add(1) as any);
          AccountUpdate.attachToTransaction(zkapp.self);
        });
        await tx.sign([feePayerKey]).send();
      }).rejects.toThrow(/unsatisfied/);
    }
  });

  it('unsatisfied requireEquals should be rejected (numbers)', async () => {
    for (let precondition of implementedNumber) {
      await expect(async () => {
        let tx = await Mina.transaction(feePayer, async () => {
          let p = precondition().get();
          precondition().requireEquals(p.add(1) as any);
          AccountUpdate.attachToTransaction(zkapp.self);
        });
        await tx.sign([feePayerKey]).send();
      }).rejects.toThrow(/unsatisfied/);
    }
  });

  it('unsatisfied assertEquals should be rejected (booleans)', async () => {
    for (let precondition of implementedBool) {
      let tx = await Mina.transaction(feePayer, async () => {
        let p = precondition().get();
        precondition().assertEquals(p.not());
        AccountUpdate.attachToTransaction(zkapp.self);
      });
      await expect(tx.sign([feePayerKey]).send()).rejects.toThrow(
        /unsatisfied/
      );
    }
  });

  it('unsatisfied requireEquals should be rejected (booleans)', async () => {
    for (let precondition of implementedBool) {
      let tx = await Mina.transaction(feePayer, async () => {
        let p = precondition().get();
        precondition().requireEquals(p.not());
        AccountUpdate.attachToTransaction(zkapp.self);
      });
      await expect(tx.sign([feePayerKey]).send()).rejects.toThrow(
        /unsatisfied/
      );
    }
  });

  it('unsatisfied assertEquals should be rejected (public key)', async () => {
    let publicKey = PublicKey.from({ x: Field(-1), isOdd: Bool(false) });
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.account.delegate.assertEquals(publicKey);
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await expect(tx.sign([feePayerKey]).send()).rejects.toThrow(/unsatisfied/);
  });

  it('unsatisfied requireEquals should be rejected (public key)', async () => {
    let publicKey = PublicKey.from({ x: Field(-1), isOdd: Bool(false) });
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.account.delegate.requireEquals(publicKey);
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await expect(tx.sign([feePayerKey]).send()).rejects.toThrow(/unsatisfied/);
  });

  it('unsatisfied assertBetween should be rejected', async () => {
    for (let precondition of implementedWithRange) {
      let tx = await Mina.transaction(feePayer, async () => {
        let p: any = precondition().get();
        precondition().assertBetween(p.add(20), p.add(30));
        AccountUpdate.attachToTransaction(zkapp.self);
      });
      await expect(tx.sign([feePayerKey]).send()).rejects.toThrow(
        /unsatisfied/
      );
    }
  });

  it('unsatisfied requireBetween should be rejected', async () => {
    for (let precondition of implementedWithRange) {
      let tx = await Mina.transaction(feePayer, async () => {
        let p: any = precondition().get();
        precondition().requireBetween(p.add(20), p.add(30));
        AccountUpdate.attachToTransaction(zkapp.self);
      });
      await expect(tx.sign([feePayerKey]).send()).rejects.toThrow(
        /unsatisfied/
      );
    }
  });

  it('unsatisfied currentSlot.assertBetween should be rejected', async () => {
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.currentSlot.assertBetween(UInt32.from(20), UInt32.from(30));
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await expect(tx.sign([feePayerKey]).send()).rejects.toThrow(/unsatisfied/);
  });

  it('unsatisfied currentSlot.requireBetween should be rejected', async () => {
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.currentSlot.requireBetween(UInt32.from(20), UInt32.from(30));
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    await expect(tx.sign([feePayerKey]).send()).rejects.toThrow(/unsatisfied/);
  });

  // TODO: is this a gotcha that should be addressed?
  // the test below fails, so it seems that nonce is applied successfully with a WRONG precondition..
  // however, this is just because `zkapp.sign()` overwrites the nonce precondition with one that is satisfied
  it.skip('unsatisfied nonce precondition should be rejected', async () => {
    let tx = await Mina.transaction(feePayer, async () => {
      zkapp.account.nonce.assertEquals(UInt32.from(1e8));
      zkapp.requireSignature();
      AccountUpdate.attachToTransaction(zkapp.self);
    });
    expect(() => tx.sign([zkappKey, feePayerKey]).send()).toThrow();
  });
});

let implementedNumber = [
  () => zkapp.account.balance,
  () => zkapp.account.nonce,
  () => zkapp.account.receiptChainHash,
  () => zkapp.network.blockchainLength,
  () => zkapp.network.globalSlotSinceGenesis,
  () => zkapp.network.timestamp,
  () => zkapp.network.minWindowDensity,
  () => zkapp.network.totalCurrency,
  () => zkapp.network.stakingEpochData.epochLength,
  () => zkapp.network.stakingEpochData.ledger.totalCurrency,
  () => zkapp.network.nextEpochData.epochLength,
  () => zkapp.network.nextEpochData.ledger.totalCurrency,
  () => zkapp.network.snarkedLedgerHash,
  () => zkapp.network.stakingEpochData.lockCheckpoint,
  () => zkapp.network.stakingEpochData.startCheckpoint,
  // () => zkapp.network.stakingEpochData.seed,
  () => zkapp.network.stakingEpochData.ledger.hash,
  () => zkapp.network.nextEpochData.lockCheckpoint,
  () => zkapp.network.nextEpochData.startCheckpoint,
  // () => zkapp.network.nextEpochData.seed,
  () => zkapp.network.nextEpochData.ledger.hash,
];
let implementedBool = [
  () => zkapp.account.isNew,
  () => zkapp.account.provedState,
];
let implemented = [
  ...implementedNumber,
  ...implementedBool,
  () => zkapp.account.delegate,
];
let implementedWithRange = [
  () => zkapp.account.balance,
  () => zkapp.account.nonce,
  () => zkapp.network.blockchainLength,
  () => zkapp.network.globalSlotSinceGenesis,
  () => zkapp.network.timestamp,
  () => zkapp.network.minWindowDensity,
  () => zkapp.network.totalCurrency,
  () => zkapp.network.stakingEpochData.epochLength,
  () => zkapp.network.stakingEpochData.ledger.totalCurrency,
  () => zkapp.network.nextEpochData.epochLength,
  () => zkapp.network.nextEpochData.ledger.totalCurrency,
];
let implementedWithRangeOnly = [() => zkapp.currentSlot];
let unimplemented = [
  () => zkapp.network.stakingEpochData.seed,
  () => zkapp.network.nextEpochData.seed,
];
