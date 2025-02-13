import { PublicKey, UInt64 } from '../../../../../index.js';
import * as Mina from '../../mina.js';

import { ExampleContract } from './ExampleContract.js';

export { transfer, settle };

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
