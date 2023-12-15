import {
  SmartContract,
  method,
  UInt64,
  AccountUpdate,
  PublicKey,
} from 'o1js';

export class Escrow extends SmartContract {
  @method deposit(user: PublicKey) {
    // add your deposit logic circuit here
    // that will adjust the amount

    const payerUpdate = AccountUpdate.create(user);
    payerUpdate.send({ to: this.address, amount: UInt64.from(1000000) });
  }

  @method withdraw(user: PublicKey) {
    // add your withdrawal logic circuit here
    // that will adjust the amount

    this.send({ to: user, amount: UInt64.from(1000000) });
  }
}
