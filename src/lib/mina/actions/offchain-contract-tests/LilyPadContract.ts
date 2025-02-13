// offchain state object, this is where the data is actually exposed
import {
  AccountUpdate,
  Experimental,
  fetchAccount,
  Lightnet,
  method,
  Mina,
  PrivateKey,
  PublicKey,
  SmartContract,
  state,
} from 'o1js';
import OffchainState = Experimental.OffchainState;

export const LilypadState = OffchainState(
  { currentOccupant: OffchainState.Field(PublicKey) },
  { logTotalCapacity: 4, maxActionsPerUpdate: 2, maxActionsPerProof: 2 }
);
export class LilyPadStateProof extends LilypadState.Proof {}

export class OffchainStorageLilyPad extends SmartContract {
  @state(Experimental.OffchainState.Commitments)
  offchainStateCommitments = LilypadState.emptyCommitments();
  offchainState = LilypadState.init(this);

  @method
  async visit() {
    const senderPublicKey = this.sender.getAndRequireSignature();
    const currentOccupantOption = await this.offchainState.fields.currentOccupant.get();
    this.offchainState.fields.currentOccupant.update({
      from: currentOccupantOption,
      to: senderPublicKey,
    });
  }

  @method
  async settle(proof: LilyPadStateProof) {
    await this.offchainState.settle(proof);
  }
}
