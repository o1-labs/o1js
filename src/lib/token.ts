import { TokenId } from 'snarky/parties-leaves';
import { PublicKey } from './signature';
import { Field } from '../snarky';
import { Ledger } from '../snarky';

const getDefaultTokenId = () => Field.one.toString();

export class Token {
  readonly id: string;
  readonly parentTokenId: string;
  readonly tokenOwner: PublicKey;

  constructor(
    tokenOwner: PublicKey,
    parentTokenId: string = getDefaultTokenId()
  ) {
    this.parentTokenId = parentTokenId;
    this.tokenOwner = tokenOwner;
    this.id = Ledger.customTokenID(tokenOwner);
  }
}
