import {
  shutdown,
  isReady,
  UInt64,
  UInt32,
  SmartContract,
  Mina,
  PrivateKey,
  Party,
  method,
  PublicKey,
} from '../../dist/server';

class MyContract extends SmartContract {
  @method shouldMakeCompileThrow() {
    this.network.blockchainLength.get();
  }
}

let zkappKey: PrivateKey;
let zkappAddress: PublicKey;
let zkapp: MyContract;
let feePayer: PrivateKey;

beforeAll(async () => {
  // set up local blockchain, create zkapp keys, deploy the contract
  await isReady;
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  feePayer = Local.testAccounts[0].privateKey;

  zkappKey = PrivateKey.random();
  zkappAddress = zkappKey.toPublicKey();
  zkapp = new MyContract(zkappAddress);

  let tx = await Mina.transaction(feePayer, () => {
    Party.fundNewAccount(feePayer);
    zkapp.deploy({ zkappKey });
  });
  tx.send();
});
afterAll(() => setTimeout(shutdown, 0));

describe('preconditions', () => {
  it('get without constraint should throw', async () => {
    for (let precondition of implemented) {
      await expect(
        Mina.transaction(feePayer, () => {
          precondition().get();
        })
      ).rejects.toThrow(/precondition/);
    }
  });

  it('get without constraint should throw during compile', async () => {
    let err = await MyContract.compile(zkappAddress).catch((err) => err);
    // TODO: err is an Array thrown from OCaml -.-
    // which is also why expect(..).rejects.toThrow doesn't work
    expect(err[2]).toBeInstanceOf(Error);
    expect(err[2].message).toContain('precondition');
  });

  it('get + assertEquals should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, () => {
      zkapp.sign(zkappKey);
      for (let precondition of implemented) {
        let p = precondition().get();
        precondition().assertEquals(p as any);
      }
    });
    await tx.send().wait();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + assertEquals should throw for unimplemented fields', async () => {
    for (let precondition of unimplemented) {
      await expect(
        Mina.transaction(feePayer, () => {
          let p = precondition();
          p.assertEquals(p.get() as any);
        })
      ).rejects.toThrow(/not implemented/);
    }
  });

  it('get + assertBetween should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, () => {
      for (let precondition of implementedWithRange) {
        let p: any = precondition().get();
        precondition().assertBetween(p.constructor.zero, p);
      }
      zkapp.sign(zkappKey);
    });
    await tx.send().wait();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + assertNothing should not throw', async () => {
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, () => {
      for (let precondition of implemented) {
        precondition().get();
        precondition().assertNothing();
      }
      zkapp.sign(zkappKey);
    });
    await tx.send().wait();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('get + manual precondition should not throw', async () => {
    // we only test this for a couple of preconditions
    let nonce = zkapp.account.nonce.get();
    let tx = await Mina.transaction(feePayer, () => {
      zkapp.account.balance.get();
      zkapp.self.body.preconditions.account.balance.upper = UInt64.from(10e9);

      zkapp.network.blockchainLength.get();
      zkapp.self.body.preconditions.network.blockchainLength.upper =
        UInt32.from(1000);

      zkapp.network.totalCurrency.get();
      zkapp.self.body.preconditions.network.totalCurrency.upper = UInt64.from(
        1e9 * 1e9
      );
      zkapp.sign(zkappKey);
    });
    await tx.send().wait();
    // check that tx was applied, by checking nonce was incremented
    expect(zkapp.account.nonce.get()).toEqual(nonce.add(1));
  });

  it('unsatisfied assertEquals should be rejected', async () => {
    for (let precondition of implemented) {
      let tx = await Mina.transaction(feePayer, () => {
        let p: any = precondition().get();
        precondition().assertEquals(p.add(1));
      });
      expect(() => tx.send()).toThrow(/unsatisfied/);
    }
  });

  it('unsatisfied assertBetween should be rejected', async () => {
    for (let precondition of implementedWithRange) {
      let tx = await Mina.transaction(feePayer, () => {
        let p: any = precondition().get();
        precondition().assertBetween(p.add(20), p.add(30));
      });
      expect(() => tx.send()).toThrow(/unsatisfied/);
    }
  });

  // TODO: is this a gotcha that should be addressed?
  // the test below fails, so it seems that nonce is applied successfully with a WRONG precondition..
  // however, this is just because `zkapp.sign()` overwrites the nonce precondition with one that is satisfied
  it.skip('unsatisfied nonce precondition should be rejected', async () => {
    let tx = await Mina.transaction(feePayer, () => {
      zkapp.account.nonce.assertEquals(UInt32.from(1e8));
      zkapp.sign(zkappKey);
    });
    expect(() => tx.send()).toThrow();
  });
});

let implemented = [
  () => zkapp.account.balance,
  () => zkapp.account.nonce,
  () => zkapp.network.blockchainLength,
  () => zkapp.network.globalSlotSinceGenesis,
  () => zkapp.network.globalSlotSinceHardFork,
  () => zkapp.network.minWindowDensity,
  () => zkapp.network.totalCurrency,
  () => zkapp.network.stakingEpochData.epochLength,
  () => zkapp.network.stakingEpochData.ledger.totalCurrency,
  () => zkapp.network.nextEpochData.epochLength,
  () => zkapp.network.nextEpochData.ledger.totalCurrency,
];
let implementedWithRange = [
  () => zkapp.account.balance,
  () => zkapp.account.nonce,
  () => zkapp.network.blockchainLength,
  () => zkapp.network.globalSlotSinceGenesis,
  () => zkapp.network.globalSlotSinceHardFork,
  () => zkapp.network.minWindowDensity,
  () => zkapp.network.totalCurrency,
  () => zkapp.network.stakingEpochData.epochLength,
  () => zkapp.network.stakingEpochData.ledger.totalCurrency,
  () => zkapp.network.nextEpochData.epochLength,
  () => zkapp.network.nextEpochData.ledger.totalCurrency,
];
let unimplemented = [
  () => zkapp.account.provedState,
  () => zkapp.account.isNew,
  () => zkapp.account.delegate,
  () => zkapp.account.receiptChainHash,
  () => zkapp.network.timestamp,
  () => zkapp.network.snarkedLedgerHash,
  () => zkapp.network.stakingEpochData.lockCheckpoint,
  () => zkapp.network.stakingEpochData.startCheckpoint,
  () => zkapp.network.stakingEpochData.seed,
  () => zkapp.network.stakingEpochData.ledger.hash,
  () => zkapp.network.nextEpochData.lockCheckpoint,
  () => zkapp.network.nextEpochData.startCheckpoint,
  () => zkapp.network.nextEpochData.seed,
  () => zkapp.network.nextEpochData.ledger.hash,
];
