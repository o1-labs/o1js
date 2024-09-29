// TODO: finish this
import { AccountId } from '../mina/core.js';
import { StateLayout } from '../mina/state.js';
import { Field } from '../../provable/field.js';

export class Account<State extends StateLayout> {
  constructor(
    public accountId: AccountId,
    public verificationKeyHash: Field
  ) {}
}
