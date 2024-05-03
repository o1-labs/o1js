import { OffchainState } from './offchain-state.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { UInt64 } from '../../provable/int.js';

const state = OffchainState({
  accounts: OffchainState.Map(PublicKey, UInt64),
  totalSupply: OffchainState.Field(UInt64),
});

let pk = PublicKey.empty();

state.fields.totalSupply.set(UInt64.from(100));
state.fields.accounts.set(pk, UInt64.from(50));

let supply = await state.fields.totalSupply.get();
let balance = await state.fields.accounts.get(pk);
