/**
 * Tests that shows we can call a subcontract dynamically based on the address,
 * as long as its signature matches the signature our contract was compiled against.
 *
 * In other words, the exact implementation/constraints of zkApp methods we call are not hard-coded in the caller contract.
 */
import { Bool, UInt64, SmartContract, method, PublicKey, Mina } from '../../../../index.js';

type Subcontract = SmartContract & {
  submethod(a: UInt64, b: UInt64): Promise<Bool>;
};

// two implementations with same signature of the called method, but different provable logic

class SubcontractA extends SmartContract implements Subcontract {
  @method.returns(Bool)
  async submethod(a: UInt64, b: UInt64): Promise<Bool> {
    return a.greaterThan(b);
  }
}

class SubcontractB extends SmartContract implements Subcontract {
  @method.returns(Bool)
  async submethod(a: UInt64, b: UInt64): Promise<Bool> {
    return a.mul(b).equals(UInt64.from(42));
  }
}

// caller contract that calls the subcontract

class Caller extends SmartContract {
  @method
  async call(a: UInt64, b: UInt64, address: PublicKey) {
    const subcontract = new Caller.Subcontract(address);
    await subcontract.submethod(a, b);
  }

  // subcontract to call. this property is changed below
  // TODO: having to set this property is a hack, it would be nice to pass the contract as parameter
  static Subcontract: new (...args: any) => Subcontract = SubcontractA;
}

// TEST BELOW

// setup

let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

let [sender, callerAccount, aAccount, bAccount] = Local.testAccounts;

await SubcontractA.compile();
await SubcontractB.compile();
await Caller.compile();

let caller = new Caller(callerAccount);
let a = new SubcontractA(aAccount);
let b = new SubcontractB(bAccount);

await Mina.transaction(sender, async () => {
  await caller.deploy();
  await a.deploy();
  await b.deploy();
})
  .sign([callerAccount.key, aAccount.key, bAccount.key, sender.key])
  .send();

// subcontract A call

let x = UInt64.from(10);
let y = UInt64.from(5);

await Mina.transaction(sender, () => caller.call(x, y, aAccount))
  .prove()
  .sign([sender.key])
  .send();

// subcontract B call

Caller.Subcontract = SubcontractB;

await Mina.transaction(sender, () => caller.call(x, y, bAccount))
  .prove()
  .sign([sender.key])
  .send();
